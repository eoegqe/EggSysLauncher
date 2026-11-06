import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useEsdcCommands } from '@/hooks/useEsdcCommands';
import { triggerKernelPanic } from '@/lib/kernelPanic';
import { isSDriveUnlocked, setSDriveUnlocked } from '@/lib/sDriveState';
import { requestEsvIsMenu } from '@/components/os/EsvIsMenuLayer';
import { requestRegistryEditor } from '@/components/os/RegistryEditorLayer';
import { seedSystem, normPath, childrenOf } from '@/lib/systemFiles';

const SYSTEM_DIR = 'E:\\EGGSYS\\SYSTEM';

// Compute the parent path of a full path (E:\User\me -> E:\User; E:\User -> E:\).
const parentPathOf = (p) => {
  const parts = (p || '').replace(/\\+$/g, '').split('\\');
  parts.pop();
  if (parts.length <= 1) return (parts[0] || 'E:') + '\\';
  return parts.join('\\');
};

// Directory-tree pane lines (matches the approved visual design).
const treeLines = (username, sUnlocked) => {
  const lines = [
    { branch: '', path: 'E:\\' },
    { branch: '├── ', path: 'E:\\User' },
    { branch: '│   └── ', path: `E:\\User\\${username || '<username>'}` },
    { branch: '└── ', path: 'E:\\EggSys' },
    { branch: '    ├── ', path: 'E:\\EggSys\\System' },
    { branch: '    ├── ', path: 'E:\\EggSys\\Users' },
    { branch: '    ├── ', path: 'E:\\EggSys\\Apps' },
    { branch: '    └── ', path: 'E:\\EggSys\\Logs' },
  ];
  if (sUnlocked) {
    lines.push({ blank: true });
    lines.push({ branch: '', path: 'S:\\' });
    lines.push({ branch: '├── ', path: 'S:\\BIOS' });
    lines.push({ branch: '├── ', path: 'S:\\Boot' });
    lines.push({ branch: '├── ', path: 'S:\\Firmware' });
    lines.push({ branch: '└── ', path: 'S:\\Recovery' });
  }
  return lines;
};

export default function Terminal({ onRestart } = {}) {
  const [devOptionsOn, setDevOptionsOn] = useState(
    () => localStorage.getItem('eos_dev_options_enabled') === 'true'
  );
  const { esdcCommand, helpLines: esdcHelpLines } = useEsdcCommands({ onRestart });

  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [username, setUsername] = useState('');
  const [cwd, setCwd] = useState('E:\\User');
  const [cwdKey, setCwdKey] = useState('E:\\USER');
  const [sUnlocked, setSUnlocked] = useState(isSDriveUnlocked());
  const [realFiles, setRealFiles] = useState([]);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Real folder lookup by normalized full path (the system reads paths, not IDs).
  const folderByPath = {};
  for (const f of realFiles) if (f.type === 'folder') folderByPath[normPath(f.path)] = f;

  // Reactively track Developer Options + S drive flags.
  useEffect(() => {
    const syncDev = () => setDevOptionsOn(localStorage.getItem('eos_dev_options_enabled') === 'true');
    const syncS = () => setSUnlocked(isSDriveUnlocked());
    window.addEventListener('storage', syncDev);
    window.addEventListener('focus', syncDev);
    window.addEventListener('eos-dev-options-changed', syncDev);
    window.addEventListener('storage', syncS);
    window.addEventListener('eos-s-drive-changed', syncS);
    return () => {
      window.removeEventListener('storage', syncDev);
      window.removeEventListener('focus', syncDev);
      window.removeEventListener('eos-dev-options-changed', syncDev);
      window.removeEventListener('storage', syncS);
      window.removeEventListener('eos-s-drive-changed', syncS);
    };
  }, []);

  // Load real files from the File entity (the same store the Files app uses).
  const loadRealFiles = async () => {
    try {
      const files = await base44.entities.File.list('-created_date');
      const live = files.filter(f => !f.is_deleted);
      setRealFiles(live);
      return live;
    } catch { /* ignore — offline/empty */
      return realFiles;
    }
  };

  // CMD starts at E:\User\<username> — load the signed-in user + real files.
  useEffect(() => {
    let mounted = true;
    base44.auth.me().then(u => {
      if (!mounted) return;
      const name = u?.data?.username || 'User';
      setUsername(name);
      const home = `E:\\User\\${name}`;
      setCwd(home);
      setCwdKey(normPath(home));
    }).catch(() => {});
    (async () => {
      await seedSystem();
      if (!mounted) return;
      await loadRealFiles();
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [history]);

  // Children of the current directory — read from each record's full path.
  const listCurrentDir = (files = realFiles) => {
    return childrenOf(files, cwd).map(f => ({
      name: f.name,
      type: f.type === 'folder' ? 'folder' : 'file',
    }));
  };

  // Resolve a cd target to { key, display, path } or null. The hierarchy is
  // read from paths only — no folder IDs are involved.
  const resolvePath = (target) => {
    if (/^[A-Za-z]:[\\/]?/.test(target) || /^[A-Za-z]:$/.test(target)) {
      const key = normPath(target);
      if (key === 'E:') return { key, display: 'E:\\', path: 'E:\\' };
      if (key === 'S:' && sUnlocked) return { key, display: 'S:\\', path: 'S:\\' };
      const folder = folderByPath[key];
      if (folder) return { key, display: folder.path, path: folder.path };
      return null;
    }
    if (target === '..') {
      if (cwdKey === 'E:' || cwdKey === 'S:') return null;
      const cur = folderByPath[cwdKey];
      if (!cur) return null;
      const parentKey = normPath(parentPathOf(cur.path));
      if (parentKey === 'E:') return { key: 'E:', display: 'E:\\', path: 'E:\\' };
      if (parentKey === 'S:') return { key: 'S:', display: 'S:\\', path: 'S:\\' };
      const parent = folderByPath[parentKey];
      if (parent) return { key: parentKey, display: parent.path, path: parent.path };
      return null;
    }
    if (target === '\\' || target === '/') {
      return { key: 'E:', display: 'E:\\', path: 'E:\\' };
    }
    const upper = target.toUpperCase();
    const child = childrenOf(realFiles, cwd).find(f => f.name.toUpperCase() === upper && f.type === 'folder');
    if (child) return { key: normPath(child.path), display: child.path, path: child.path };
    return null;
  };

  const commandList = (devOn) => [
    '  help     - Show this help message',
    '  clear    - Clear the terminal',
    '  echo     - Echo text',
    '  files    - List all files',
    '  dir      - List files in the current directory',
    '  whoami   - Display current user',
    '  date     - Display current date and time',
    '  about    - About EggetSystem',
    '  sysconfig - System configuration (run from E:\\EggSys\\System)',
    '  esvismenu - Open the visual system menu',
    '  esregit  - Open the registry editor (run from E:\\EggSys\\System)',
    ...(devOn ? esdcHelpLines() : []),
  ];

  const commands = {
    help: () => ['Available commands:', '', ...commandList(devOptionsOn)],
    clear: () => { setHistory([]); return null; },
    echo: (args) => [args.join(' ')],
    files: async () => {
      const files = await base44.entities.File.list();
      if (files.length === 0) return [{ text: 'No files found', kind: 'empty' }];
      return files.map(f => `  ${f.name} (${f.type})`);
    },
    // dir/ls list the contents of the current directory — the user's real
    // files/folders from the File entity, read by path.
    dir: async () => {
      const files = await loadRealFiles();
      const entries = listCurrentDir(files);
      if (entries.length === 0) return [{ text: 'Directory is empty', kind: 'empty' }];
      const folders = entries.filter(e => e.type === 'folder');
      const fileEntries = entries.filter(e => e.type !== 'folder');
      return [
        ` Directory of ${cwd}`,
        '',
        ...folders.map(f => `  <DIR>  ${f.name}`),
        ...fileEntries.map(f => `        ${f.name}`),
        '',
        `  ${folders.length} dir(s), ${fileEntries.length} file(s)`,
      ];
    },
    ls: function () { return commands.dir(); },
    whoami: async () => {
      const user = await base44.auth.me();
      return [`${user.full_name} (${user.email})`];
    },
    date: () => [new Date().toString()],
    about: () => [
      'EggetSystem - Elegant Operating System',
      'Version 1.0.0',
      'Built with React and Base44',
    ],
    cd: (args) => {
      if (!args[0]) return ['usage: cd <path>'];
      const resolved = resolvePath(args[0]);
      if (!resolved) return [`The system cannot find the path specified: ${args[0]}`];
      setCwd(resolved.display);
      setCwdKey(resolved.key);
      return null;
    },
    '$cd': function (args) { return commands.cd(args); },
    // Dangerous: killing the kernel powers down the system into a kernel
    // panic. Only available from E:\EggSys\System.
    kill: (args) => {
      if (normPath(cwd) !== SYSTEM_DIR) return [`Command not found: kill`];
      if (args[0] !== 'kernel') return ['usage: kill kernel'];
      triggerKernelPanic('attempted to kill unit');
      return null;
    },
    '$kill': function (args) { return commands.kill(args); },
    // Reveal the hidden S:\ drive. Only works from E:\EggSys\System.
    sysconfig: (args) => {
      if (normPath(cwd) !== SYSTEM_DIR) return [`Command not found: sysconfig`];
      if (args[0] !== 'show') return ['usage: sysconfig show <drive>'];
      const drive = (args[1] || '').toUpperCase();
      if (drive !== 'S:\\' && drive !== 'S:') return [`Unknown drive: ${args[1] || ''}`];
      setSDriveUnlocked(true);
      return ['S:\\ is now visible.', 'Contents:', '  BIOS', '  Boot', '  Firmware', '  Recovery'];
    },
    '$sysconfig': function (args) { return commands.sysconfig(args); },
    esvismenu: () => { requestEsvIsMenu(); return ['Opening EggetSystem Visual Menu…']; },
    '$esvismenu': function () { return commands.esvismenu(); },
    // Registry editor — opens a visual GUI. Only available from
    // E:\EggSys\System, like the other system commands.
    esregit: () => {
      if (normPath(cwd) !== SYSTEM_DIR) return [`Command not found: esregit`];
      requestRegistryEditor();
      return ['Opening EggetSystem Registry Editor…'];
    },
    '$esregit': function () { return commands.esregit(); },
    ...(devOptionsOn ? { esdc: esdcCommand } : {}),
  };

  const executeCommand = async (cmd) => {
    const parts = cmd.trim().split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    setHistory(prev => [...prev, { type: 'input', text: cmd, cwd }]);

    if (!command) {
      setHistory(prev => [...prev, { type: 'output', text: '' }]);
      return;
    }

    if (commands[command]) {
      try {
        const result = await commands[command](args);
        if (result) {
          result.forEach(line => {
            const obj = typeof line === 'string'
              ? { type: 'output', text: line }
              : { type: line.kind || 'output', text: line.text };
            setHistory(prev => [...prev, obj]);
          });
        }
      } catch (error) {
        setHistory(prev => [...prev, { type: 'error', text: `Error: ${error.message}` }]);
      }
    } else {
      setHistory(prev => [...prev, { type: 'error', text: `Command not found: ${command}` }]);
    }

    setHistory(prev => [...prev, { type: 'output', text: '' }]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      executeCommand(input);
      setInput('');
    }
  };

  const promptClass = "mt-[18px] flex items-center gap-2 px-[14px] py-[12px] bg-[#111714] border border-[#35443a] rounded-[6px]";

  return (
    <div
      ref={containerRef}
      className="terminal-arrive h-full overflow-auto bg-[#151b19] text-[#d6e2d8] font-mono text-sm p-[22px] border border-[#394a3e] shadow-[0_12px_30px_rgba(26,43,32,0.18),inset_0_1px_rgba(255,255,255,0.04)] hover:shadow-[0_14px_34px_rgba(26,43,32,0.23),inset_0_1px_rgba(255,255,255,0.04)]"
      onClick={() => inputRef.current?.focus()}
    >
      <style>{`@keyframes terminalArrive{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}.terminal-arrive{animation:terminalArrive .45s cubic-bezier(.2,.8,.2,1) both}`}</style>

      {/* MOTD: directory tree + available commands */}
      <div className="grid grid-cols-[1fr_1.18fr] gap-[18px] mb-[18px]">
        <section className="p-[18px] bg-[#1c2520] border border-[#35443a] rounded-lg shadow-[inset_0_1px_rgba(255,255,255,0.025)]">
          <p className="m-0 mb-[14px] pb-[10px] border-b border-[#39483d] text-[#a9c79e] text-xs font-bold uppercase tracking-[0.12em]">Directory tree</p>
          <div className="text-[#d4ddd4] leading-[1.6]">
            {treeLines(username, sUnlocked).map((l, i) => l.blank ? (
              <div key={i}>&nbsp;</div>
            ) : (
              <div key={i} className="whitespace-pre-wrap">
                <span className="text-[#769b79]">{l.branch}</span>
                <span className="text-[#e5c887]">{l.path}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="p-[18px] bg-[#1c2520] border border-[#35443a] rounded-lg shadow-[inset_0_1px_rgba(255,255,255,0.025)]">
          <p className="m-0 mb-[14px] pb-[10px] border-b border-[#39483d] text-[#a9c79e] text-xs font-bold uppercase tracking-[0.12em]">Available commands:</p>
          <pre className="m-0 whitespace-pre-wrap text-[#ced9cf] leading-[1.6]">{commandList(devOptionsOn).join('\n')}</pre>
        </section>
      </div>

      {/* History */}
      <div>
        {history.map((line, idx) => {
          if (line.type === 'input') {
            return (
              <div key={idx} className={promptClass}>
                <span className="text-[#e4c77d] whitespace-nowrap shrink-0">{line.cwd || 'E:\\User'}&gt;</span>
                <span className="text-[#9ab49b]">{line.text}</span>
              </div>
            );
          }
          if (line.type === 'error') {
            return <div key={idx} className="text-red-400 whitespace-pre-wrap">{line.text}</div>;
          }
          if (line.type === 'empty') {
            return <div key={idx} className="mt-[12px] text-[#aab6aa]">{line.text}</div>;
          }
          return <div key={idx} className="text-[#ced9cf] whitespace-pre-wrap">{line.text}</div>;
        })}

        {/* Live input */}
        <form onSubmit={handleSubmit} className={promptClass}>
          <span className="text-[#e4c77d] whitespace-nowrap shrink-0">{cwd}&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent outline-none text-[#9ab49b]"
            autoFocus
          />
        </form>
      </div>
    </div>
  );
}