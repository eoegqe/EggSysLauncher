import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Cloud, HardDrive, Upload, Download, Folder, FileText, Plus,
  ArrowLeft, RefreshCw, Check, X, ExternalLink,
  Loader2, Package, ChevronRight, Shield, Eye, Database, Lock, Trash2,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/devToast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import ECloudFilePreview from '../ECloudFilePreview';
import FileActionSheet from './FileActionSheet';
import EggSysPackageInstaller from '../EggSysPackageInstaller';
import { useEggSysOSDisabled } from '@/hooks/useEggSysOSDisabled';
import EggSysOSFailure from '@/components/os/EggSysOSFailure';
import { isSDriveUnlocked, isSDriveTempUnlocked, isSDrivePermanent, setSDriveUnlocked as setSDriveUnlockedState, setSDrivePermanent } from '@/lib/sDriveState';
import StorageSettingsDialog from '../fileexplorer/StorageSettingsDialog';
import ClaimOwnershipDialog from '@/components/os/ClaimOwnershipDialog';
import { seedSystem, childrenOf, isRequiredSystemFile, isHiddenName } from '@/lib/systemFiles';
import { isFilesRoot, FILES_ROOT, getMobileRootLabel } from '@/lib/filesRoot';
import { detectEggOS } from '@/lib/detectOS';
import { useIsTablet } from '@/hooks/useIsTablet';
import FilesTabletSidebar from './FilesTabletSidebar';

// Host-OS Easter egg — an unopenable folder labelled with the real OS.
const EGG_OS = detectEggOS();
// The EggetSystem variant installed on this device via the charger installer.
const INSTALLED_OS_LABEL = getInstalledVariantLabel();
import { confirmSystemFileDelete } from '@/lib/systemFileDelete';
import { isFactoryResetFile } from '@/lib/factoryReset';
import { requestFactoryReset } from '@/components/os/FactoryResetLayer';
import { isOsOwned } from '@/lib/osOwnership';
import { wipeLocalDisk as wipeLocalDiskAction } from '@/lib/wipeLocalDisk';
import { isSigninFile, requestLockScreen } from '@/lib/signinFile';
import { getInstalledVariantLabel } from '@/lib/installedVariant';

// Virtual system file at the root of E:\ (Local). Opening it triggers the
// full-ownership claim flow instead of the EAF installer.
const ACCESS_EAF_ID = '__eggsys_access_eaf__';
const ACCESS_EAF_FILE = { id: ACCESS_EAF_ID, name: 'access.eaf', type: 'file', __system: true };

const isEaf = (name) => !!name && (name.endsWith('.eaf') || name.endsWith('.eafl'));

// Resolve a tapped file into a source parseEaf can consume. ECloudFile may
// store binary uploads on file_url (fetch to Blob) or text on content; local
// File entities store text on content.
async function resolveInstallSource(file) {
  if (file.file_url) {
    const res = await fetch(file.file_url);
    const blob = await res.blob();
    return new File([blob], file.name, { type: file.mime_type || 'application/octet-stream' });
  }
  // text-backed record — parseEaf reads .content when given an entity shape
  return file;
}

export default function MobileFilesApp() {
  const eggSysOSDisabled = useEggSysOSDisabled();
  const isTablet = useIsTablet();
  const osOwned = isOsOwned();
  const [crashing, setCrashing] = useState(false);
  const queryClient = useQueryClient();

  const [source, setSource] = useState('local'); // 'ecloud' | 'local'
  const [ecloudFolderId, setEcloudFolderId] = useState(null);
  const [ecloudPath, setEcloudPath] = useState([{ id: null, name: 'ECloud' }]);
  const [localCwd, setLocalCwd] = useState(FILES_ROOT);
  const [localPath, setLocalPath] = useState([{ path: FILES_ROOT, name: getMobileRootLabel() }]);
  const [sDriveCwd, setSDriveCwd] = useState('S:\\');
  const [sDrivePath, setSDrivePath] = useState([{ path: 'S:\\', name: 'S:\\' }]);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [installerFile, setInstallerFile] = useState(null);
  const [sDriveUnlocked, setSDriveUnlocked] = useState(isSDriveUnlocked());
  const [sDriveTemp, setSDriveTemp] = useState(isSDriveTempUnlocked());
  const [sDrivePerm, setSDrivePermState] = useState(isSDrivePermanent());
  const [ecloudEnabled, setEcloudEnabled] = useState(() => localStorage.getItem('eos_files_ecloud_tab') !== 'false');
  const [showStorageSettings, setShowStorageSettings] = useState(false);
  const [showOwnership, setShowOwnership] = useState(false);
  const [actionFile, setActionFile] = useState(null);
  const [showHidden, setShowHidden] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // name | date | size | type
  const [sortDir, setSortDir] = useState('asc'); // asc | desc
  const [showViewMenu, setShowViewMenu] = useState(false);
  const longPressTimer = useRef(null);
  const longPressFired = useRef(false);
  const deviceInputRef = useRef(null);

  // S: is a read-only system drive — suppress the press-and-hold action sheet
  // (rename/delete/upload) and new-folder creation while browsing it.
  const localReadOnly = source === 'local' && (localCwd || '').toUpperCase().startsWith('S:\\');

  // Press-and-hold on a file row opens the action sheet (Upload to ECloud /
  // Rename / Delete). A guard flag suppresses the tap that follows a long
  // press so the file isn't opened at the same time.
  const startLongPress = (file) => {
    if (localReadOnly) return;
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setActionFile(file);
    }, 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };
  const guarded = (fn) => (e) => {
    if (longPressFired.current) { longPressFired.current = false; e.preventDefault(); e.stopPropagation(); return; }
    fn(e);
  };

  useEffect(() => {
    const sync = () => {
      setSDriveUnlocked(isSDriveUnlocked());
      setSDriveTemp(isSDriveTempUnlocked());
      setSDrivePermState(isSDrivePermanent());
    };
    window.addEventListener('storage', sync);
    window.addEventListener('eos-s-drive-changed', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('eos-s-drive-changed', sync);
    };
  }, []);

  const toggleEcloud = (v) => {
    setEcloudEnabled(v);
    try { localStorage.setItem('eos_files_ecloud_tab', v ? 'true' : 'false'); } catch {}
    if (!v && source === 'ecloud') setSource('local');
  };

  // Tablet sidebar location switch — resets the path for the chosen source.
  const handleSelectLocation = (id) => {
    if (id === 'ecloud') { setSource('ecloud'); setEcloudFolderId(null); setEcloudPath([{ id: null, name: 'ECloud' }]); }
    else if (id === 'local') { setSource('local'); setLocalCwd('E:\\'); setLocalPath([{ path: 'E:\\', name: 'E:\\' }]); }
    else if (id === 'sdrive') { setSource('sdrive'); setSDriveCwd('S:\\'); setSDrivePath([{ path: 'S:\\', name: 'S:\\' }]); }
  };

  // Device-owner-only: wipe the entire local disk (E:\). The screen goes black
  // and the device restarts into the "Boot device not found" reinstall screen.
  const wipeLocalDisk = async () => {
    const wiped = await wipeLocalDiskAction();
    if (!wiped) return;
    setCrashing(true);
    setTimeout(() => window.location.reload(), 700);
  };

  // Ensure system dirs + the user's home folder exist when browsing files.
  useEffect(() => {
    seedSystem().then(() => queryClient.invalidateQueries({ queryKey: ['mfiles-device'] }));
  }, []);

  const currentFolderId = source === 'ecloud' ? ecloudFolderId : null;
  const folderPath = source === 'ecloud' ? ecloudPath : source === 'sdrive' ? sDrivePath : localPath;

  const { data: user } = useQuery({
    queryKey: ['mfiles-user'],
    queryFn: () => base44.auth.me(),
  });

  // ECloud files
  const { data: cloudFiles = [], isLoading: cloudLoading } = useQuery({
    queryKey: ['ecloud-files', ecloudFolderId],
    queryFn: async () => {
      const files = await base44.entities.ECloudFile.filter(
        ecloudFolderId ? { parent_id: ecloudFolderId } : { parent_id: null },
        '-created_date'
      );
      if (!ecloudFolderId) return files.filter(f => !f.parent_id || f.parent_id === 'null');
      return files;
    },
    enabled: !!user,
  });

  // All on-device File records (local E:\ + S:\ share a single File.list call).
  // The current folder is NOT in the query key — childrenOf filters on the
  // client — so navigating folders no longer refetches the whole list (which
  // was rate-limiting the File entity).
  const { data: deviceFiles = [], isLoading: deviceLoading } = useQuery({
    queryKey: ['mfiles-device'],
    queryFn: async () => {
      const files = await base44.entities.File.list('-created_date');
      return files.filter(f => !f.is_deleted);
    },
    enabled: source !== 'ecloud' && !!user,
  });
  const localFiles = useMemo(() => childrenOf(deviceFiles, localCwd), [deviceFiles, localCwd]);
  const sDriveFiles = useMemo(() => childrenOf(deviceFiles, sDriveCwd), [deviceFiles, sDriveCwd]);
  const localLoading = deviceLoading;
  const sDriveLoading = deviceLoading;

  const files = source === 'ecloud' ? cloudFiles : source === 'sdrive' ? sDriveFiles : localFiles;
  // access.eaf is a virtual system file shown only at the root of E:\ (Local).
  // S:\ root: inject the unopenable host-OS Easter-egg folder alongside
  // S:\EggetSystem.
  const isSDriveRoot = source === 'sdrive' && (sDriveCwd || '').toUpperCase() === 'S:\\';
  const displayFiles = (source === 'local' && localCwd === 'E:\\')
    ? [ACCESS_EAF_FILE, ...localFiles]
    : (isSDriveRoot && EGG_OS ? [...files, { id: '__egg_os_folder__', name: EGG_OS, type: 'folder', __egg: true, path: 'S:\\' + EGG_OS }] : files);
  const isLoading = source === 'ecloud' ? cloudLoading : source === 'sdrive' ? sDriveLoading : localLoading;

  // Apply hidden-file filtering (unless toggled on) and sorting. Hidden items
  // are any name starting with "." (e.g. ".appdata"). Folders sort first.
  const visibleFiles = useMemo(() => {
    let list = displayFiles;
    if (!showHidden) list = list.filter(f => !isHiddenName(f.name));
    return [...list].sort((a, b) => {
      const aFolder = a.type === 'folder';
      const bFolder = b.type === 'folder';
      if (aFolder !== bFolder) return aFolder ? -1 : 1;
      let cmp = 0;
      if (sortBy === 'name') cmp = (a.name || '').localeCompare(b.name || '');
      else if (sortBy === 'date') cmp = new Date(a.created_date || 0) - new Date(b.created_date || 0);
      else if (sortBy === 'size') cmp = (a.size || (a.content?.length || 0)) - (b.size || (b.content?.length || 0));
      else if (sortBy === 'type') cmp = (a.name || '').split('.').pop().localeCompare((b.name || '').split('.').pop());
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [displayFiles, showHidden, sortBy, sortDir]);

  // ECloud mutations
  const createCloud = useMutation({
    mutationFn: (data) => base44.entities.ECloudFile.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ecloud-files'] }); toast.success('Created'); },
  });
  const deleteCloud = useMutation({
    mutationFn: (id) => base44.entities.ECloudFile.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ecloud-files'] }); toast.success('Deleted'); },
  });
  const renameCloud = useMutation({
    mutationFn: ({ id, name }) => base44.entities.ECloudFile.update(id, { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ecloud-files'] }); setRenamingId(null); toast.success('Renamed'); },
  });
  const uploadDeviceFile = useMutation({
    mutationFn: async (file) => {
      const blockedExtensions = ['.apk', '.exe', '.msi', '.bat', '.cmd', '.sh', '.com', '.scr'];
      const lowerName = file.name.toLowerCase();
      const isBlocked = blockedExtensions.some(ext => lowerName.endsWith(ext));
      const uploadFile = isBlocked
        ? new File([file], file.name + '.bin', { type: file.type || 'application/octet-stream' })
        : file;
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file: uploadFile });
      await base44.entities.ECloudFile.create({
        name: file.name, type: 'file', file_url, size: file.size,
        mime_type: file.type || 'application/octet-stream', parent_id: ecloudFolderId,
        path: ecloudPath.map(f => f.name).join('/') + '/' + file.name,
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ecloud-files'] }); toast.success('Uploaded to ECloud'); },
    onError: (e) => toast.error('Upload failed: ' + (e.message || '')),
  });

  // Local Files mutations
  const createLocal = useMutation({
    mutationFn: (data) => base44.entities.File.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mfiles-device'] }); toast.success('Created'); },
  });
  const deleteLocal = useMutation({
    mutationFn: (id) => base44.entities.File.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mfiles-device'] }); toast.success('Deleted'); },
  });
  const renameLocal = useMutation({
    mutationFn: ({ id, name }) => base44.entities.File.update(id, { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mfiles-device'] }); setRenamingId(null); toast.success('Renamed'); },
  });
  const uploadToCloud = useMutation({
    mutationFn: async (file) => {
      await base44.entities.ECloudFile.create({
        name: file.name, type: 'file', content: file.content || '',
        size: file.size, mime_type: 'text/plain', parent_id: null, path: file.name,
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ecloud-files'] }); toast.success('Uploaded to ECloud'); },
    onError: (e) => toast.error('Upload failed: ' + (e.message || '')),
  });

  const handleDeleteFile = async (file) => {
    setActionFile(null);
    if (source === 'ecloud') { deleteCloud.mutate(file.id); return; }
    if (isRequiredSystemFile(file)) {
      if (await confirmSystemFileDelete(file)) deleteLocal.mutate(file.id);
    } else {
      deleteLocal.mutate(file.id);
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    if (source === 'ecloud') {
      const pathStr = folderPath.map(f => f.name).join('/') + '/' + newFolderName;
      createCloud.mutate({ name: newFolderName, type: 'folder', parent_id: currentFolderId, path: pathStr });
    } else {
      const pathStr = localCwd + (localCwd.endsWith('\\') ? '' : '\\') + newFolderName;
      createLocal.mutate({ name: newFolderName, type: 'folder', path: pathStr });
    }
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const handleOpenFolder = (folder) => {
    if (source === 'ecloud') {
      setEcloudFolderId(folder.id);
      setEcloudPath([...ecloudPath, { id: folder.id, name: folder.name }]);
    } else if (source === 'sdrive') {
      setSDriveCwd(folder.path);
      setSDrivePath([...sDrivePath, { path: folder.path, name: folder.name }]);
    } else {
      setLocalCwd(folder.path);
      setLocalPath([...localPath, { path: folder.path, name: folder.name }]);
    }
  };

  const handleNavigateBack = (index) => {
    if (source === 'ecloud') {
      const newPath = ecloudPath.slice(0, index + 1);
      setEcloudPath(newPath);
      setEcloudFolderId(newPath[newPath.length - 1].id);
    } else if (source === 'sdrive') {
      const newPath = sDrivePath.slice(0, index + 1);
      setSDrivePath(newPath);
      setSDriveCwd(newPath[newPath.length - 1].path);
    } else {
      const newPath = localPath.slice(0, index + 1);
      setLocalPath(newPath);
      setLocalCwd(newPath[newPath.length - 1].path);
    }
  };

  const handleFileTap = async (file) => {
    if (file.id === ACCESS_EAF_ID) { setShowOwnership(true); return; }
    if (isFactoryResetFile(file)) { requestFactoryReset(); return; }
    if (isSigninFile(file)) { requestLockScreen(); return; }
    if (isEaf(file.name)) {
      try {
        const installSource = await resolveInstallSource(file);
        setInstallerFile(installSource);
      } catch (e) {
        toast.error('Could not open .eaf file');
      }
      return;
    }
    if (file.type === 'folder') {
      handleOpenFolder(file);
      return;
    }
    setPreviewFile(file);
  };

  const submitRename = () => {
    if (!renameValue.trim()) return;
    if (source === 'ecloud') renameCloud.mutate({ id: renamingId, name: renameValue });
    else renameLocal.mutate({ id: renamingId, name: renameValue });
  };

  const downloadDeviceFile = async (file) => {
    try {
      const res = await fetch(file.file_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = file.name;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error('Download failed: ' + (e.message || '')); }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  if (eggSysOSDisabled) return <EggSysOSFailure title="Files" />;

  return (
    <div className={`h-full flex ${isTablet ? 'flex-row' : 'flex-col'} bg-gradient-to-br from-sky-50 to-blue-100`}>
      {isTablet && (
        <FilesTabletSidebar
          source={source}
          ecloudEnabled={ecloudEnabled}
          sDriveUnlocked={sDriveUnlocked}
          onSelect={handleSelectLocation}
        />
      )}
      <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-4 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <Folder className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Files</h1>
            <p className="text-xs opacity-90">
              Local &amp; ECloud storage
              {INSTALLED_OS_LABEL && <span className="opacity-70"> · {INSTALLED_OS_LABEL} installed</span>}
            </p>
          </div>
          <button
            onClick={() => setShowStorageSettings(true)}
            className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors"
            title="Storage settings"
          >
            <Database className="w-5 h-5" />
          </button>
        </div>
        {/* Source toggle — hidden when ECloud is off, and on tablets (sidebar handles it) */}
        {ecloudEnabled && !isTablet && (
        <div className="flex gap-1 bg-white/20 rounded-lg p-1">
          <button
            onClick={() => setSource('ecloud')}
            className={cn('flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-md font-medium transition-all', source === 'ecloud' ? 'bg-white shadow text-gray-800' : 'text-white/80')}
          >
            <Cloud className="w-3.5 h-3.5" /> ECloud
          </button>
          <button
            onClick={() => setSource('local')}
            className={cn('flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-md font-medium transition-all', source === 'local' ? 'bg-white shadow text-gray-800' : 'text-white/80')}
          >
            <HardDrive className="w-3.5 h-3.5" /> Local
          </button>
        </div>
        )}
      </div>

      {/* Breadcrumb */}
      <div className="px-4 py-2.5 bg-white border-b flex items-center gap-1 overflow-x-auto">
        {folderPath.map((folder, index) => (
          <React.Fragment key={folder.id || folder.path || 'root'}>
            {index > 0 && <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />}
            <button
              onClick={() => handleNavigateBack(index)}
              className={cn('text-sm px-1.5 py-1 rounded hover:bg-gray-100 whitespace-nowrap', index === folderPath.length - 1 ? 'font-semibold text-blue-600' : 'text-gray-600')}
            >
              {folder.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Toolbar */}
      <div className="relative px-4 py-2.5 bg-white border-b flex items-center gap-2">
        {source !== 'sdrive' && !(source === 'local' && isFilesRoot(localCwd)) && !localReadOnly && (
          <>
            <Button size="sm" onClick={() => setShowNewFolder(true)} className="bg-blue-500 hover:bg-blue-600" title="New Folder">
              <Plus className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: source === 'ecloud' ? ['ecloud-files'] : ['mfiles-device'] })} title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button size="sm" variant={showViewMenu ? 'default' : 'outline'} onClick={() => setShowViewMenu(v => !v)} title="View options">
              <Eye className="w-4 h-4" />
            </Button>
          </>
        )}
        {showViewMenu && source !== 'sdrive' && (
          <div className="absolute left-0 right-0 top-full z-20 bg-white border-b shadow-lg px-4 py-3 space-y-3">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Sort by</p>
              <div className="flex flex-wrap gap-1.5">
                {['name', 'date', 'size', 'type'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSortBy(opt)}
                    className={cn('px-2.5 py-1 rounded-md text-xs font-medium border capitalize', sortBy === opt ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-200')}
                  >
                    {opt}
                  </button>
                ))}
                <button
                  onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                  className="px-2.5 py-1 rounded-md text-xs font-medium border bg-white text-gray-700 border-gray-200"
                >
                  {sortDir === 'asc' ? 'Ascending' : 'Descending'}
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <Checkbox checked={showHidden} onCheckedChange={(v) => setShowHidden(!!v)} />
              Show hidden files
            </label>
          </div>
        )}
        {source === 'ecloud' && (
          <>
            <input
              ref={deviceInputRef}
              type="file"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDeviceFile.mutate(f); e.target.value = ''; }}
            />
            <Button size="sm" variant="outline" onClick={() => deviceInputRef.current?.click()} disabled={uploadDeviceFile.isPending} title="Upload from Device">
              {uploadDeviceFile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            </Button>
          </>
        )}
      </div>

      {/* New folder input */}
      {showNewFolder && (
        <div className="px-4 py-2.5 bg-blue-50 border-b flex items-center gap-2">
          <Folder className="w-4 h-4 text-blue-500" />
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            className="flex-1 h-8"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
          <Button size="sm" onClick={handleCreateFolder}>Create</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowNewFolder(false)}>Cancel</Button>
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-auto p-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : (source === 'local' && isFilesRoot(localCwd)) ? (
          <div className="grid gap-2">
            {[
              { path: 'E:\\', name: 'Local Disk (E:)', onOpen: () => handleOpenFolder({ path: 'E:\\', name: 'E:\\', type: 'folder' }), onDelete: wipeLocalDisk },
              ...(sDriveUnlocked ? [{ path: 'S:\\', name: 'S: Drive', onOpen: () => handleOpenFolder({ path: 'S:\\', name: 'S:\\', type: 'folder' }) }] : []),
            ].map((d) => (
              <div key={d.path} className="flex items-center gap-1 p-2.5 bg-white rounded-xl border hover:shadow-md transition-all">
                <button onClick={d.onOpen} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                    <HardDrive className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{d.name}</p>
                    <p className="text-xs text-gray-500">Drive{d.onDelete && osOwned ? ' • Owner can delete' : ''}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
                {d.onDelete && osOwned && (
                  <button onClick={(e) => { e.stopPropagation(); d.onDelete(); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0" title="Delete drive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : visibleFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            {source === 'ecloud' ? <Cloud className="w-14 h-14 mb-3 opacity-30" /> : <HardDrive className="w-14 h-14 mb-3 opacity-30" />}
            <p className="font-medium text-sm">{showHidden ? 'No files here' : 'No visible files'}</p>
            <p className="text-xs">{showHidden ? 'Create a folder or upload a file' : 'Hidden items are off — tap the eye to show them'}</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {visibleFiles.map((file) => (
              <div
                key={file.id}
                onTouchStart={() => !file.__egg && startLongPress(file)}
                onTouchEnd={cancelLongPress}
                onTouchMove={cancelLongPress}
                onMouseDown={() => !file.__egg && startLongPress(file)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onContextMenu={(e) => e.preventDefault()}
                className="flex items-center gap-3 p-2.5 bg-white rounded-xl border hover:shadow-md transition-all select-none"
              >
                <button onClick={file.__egg ? () => toast("This folder can't be opened") : guarded(() => handleFileTap(file))} className="shrink-0">
                  {file.__egg ? (
                    <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center relative">
                      <Folder className="w-5 h-5 text-purple-600" />
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center">
                        <Lock className="w-2.5 h-2.5 text-white" />
                      </span>
                    </div>
                  ) : file.__system ? (
                    <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                      <Shield className="w-4 h-4 text-white" />
                    </div>
                  ) : file.type === 'folder' ? (
                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Folder className="w-5 h-5 text-blue-600" />
                    </div>
                  ) : isEaf(file.name) ? (
                    <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-gray-600" />
                    </div>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  {renamingId === file.id ? (
                    <div className="flex items-center gap-2">
                      <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="h-7 text-sm" autoFocus onKeyDown={(e) => e.key === 'Enter' && submitRename()} />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={submitRename}><Check className="w-4 h-4 text-green-600" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setRenamingId(null)}><X className="w-4 h-4 text-red-600" /></Button>
                    </div>
                  ) : (
                    <>
                      <p onClick={file.__egg ? () => toast("This folder can't be opened") : guarded(() => file.type !== 'folder' && handleFileTap(file))} className={cn('font-medium text-gray-800 text-sm truncate', file.__egg ? 'cursor-not-allowed' : file.type === 'folder' ? 'cursor-pointer hover:text-blue-600' : isEaf(file.name) ? 'cursor-pointer hover:text-orange-600' : 'cursor-pointer hover:text-blue-600')}>
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {file.__egg
                          ? 'Folder • Locked'
                          : file.__system
                          ? <span className="text-amber-600 font-medium">System file • Tap to claim ownership</span>
                          : <>{format(new Date(file.created_date), 'MMM d, yyyy')} • {formatSize(file.size)}{isEaf(file.name) && <span className="text-orange-500 font-medium"> • Tap to install</span>}</>}
                      </p>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {file.type === 'file' && file.file_url && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onClick={() => downloadDeviceFile(file)} title="Download">
                      <Download className="w-4 h-4 text-gray-600" />
                    </Button>
                  )}
                  {file.type === 'file' && !isEaf(file.name) && !file.__system && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onClick={() => setPreviewFile(file)} title="Open">
                      <ExternalLink className="w-4 h-4 text-gray-600" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      {/* File preview */}
      <ECloudFilePreview file={previewFile} onClose={() => setPreviewFile(null)} onDownloadDevice={downloadDeviceFile} />

      {/* Press-and-hold action sheet */}
      <FileActionSheet
        file={actionFile}
        source={source}
        onClose={() => setActionFile(null)}
        onRename={() => { const f = actionFile; setActionFile(null); setRenamingId(f.id); setRenameValue(f.name); }}
        onDelete={() => handleDeleteFile(actionFile)}
        onUploadToCloud={() => { const f = actionFile; setActionFile(null); uploadToCloud.mutate(f); }}
      />

      {/* access.eaf → full-ownership claim flow */}
      {showOwnership && <ClaimOwnershipDialog onClose={() => setShowOwnership(false)} />}

      {/* .eaf → EggSys Package Installer overlay */}
      {installerFile && (
        <div className="absolute inset-0 z-50 bg-gray-50 flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <button onClick={() => setInstallerFile(null)} className="flex items-center gap-1 text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <span className="font-semibold text-sm">Package Installer</span>
          </div>
          <div className="flex-1 min-h-0">
            <EggSysPackageInstaller
              variant="mobile"
              initialFile={installerFile}
              onClose={() => setInstallerFile(null)}
              hideUploadZone
              hideDevLab
              hideEafFilesList
            />
          </div>
        </div>
      )}

      {/* Storage settings */}
      <StorageSettingsDialog
        open={showStorageSettings}
        onClose={() => setShowStorageSettings(false)}
        ecloudEnabled={ecloudEnabled}
        onToggleEcloud={toggleEcloud}
        sDriveTemp={sDriveTemp}
        onToggleSDriveTemp={(v) => setSDriveUnlockedState(v)}
        sDrivePerm={sDrivePerm}
        onToggleSDrivePerm={(v) => setSDrivePermanent(v)}
      />
      {crashing && <div className="fixed inset-0 bg-black z-[9999]" />}
    </div>
  );
}