import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Activity, Cpu, HardDrive, Wifi, X, ListChecks, Trash2, Package, Shield,
  Calculator, FileText, Folder, Settings, ShoppingCart, Mail, MessageCircle,
  Phone, Contact, Camera, Map, Music, Terminal, Code
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/devToast';
import { confirmAction } from '@/components/os/ConfirmDialog';
import { visibleMobileBuiltinApps } from '@/lib/mobileBuiltinApps';

const BUILTIN_ICONS = {
  Calculator, FileText, Folder, Settings, ShoppingCart, Mail, ListChecks,
  MessageCircle, Phone, Contact, Camera, Map, Music, Terminal, Code, Shield
};

export default function MobileTaskManager() {
  const [activeTab, setActiveTab] = useState('performance');
  const [cpuUsage, setCpuUsage] = useState(0);
  const [ramUsage, setRamUsage] = useState(0);
  const [diskUsage, setDiskUsage] = useState(0);
  const queryClient = useQueryClient();

  // Mirror the OS home screen's guest-aware installed-apps source (shared cache key)
  const { data: user } = useQuery({
    queryKey: ['tm-current-user'],
    queryFn: async () => { try { return await base44.auth.me(); } catch { return { _guest: true }; } },
    staleTime: 60000
  });

  const { data: installedApps = [] } = useQuery({
    queryKey: ['installed-apps-mobile'],
    queryFn: async () => {
      const { getGuestInstalledApps } = await import('@/lib/guestBackup');
      if (user?._guest) return getGuestInstalledApps().map((a) => ({ ...a, id: a.app_id }));
      try { return await base44.entities.InstalledApp.list('-created_date'); }
      catch { return getGuestInstalledApps().map((a) => ({ ...a, id: a.app_id })); }
    },
    enabled: !!user,
    staleTime: 60000
  });

  const { data: files = [] } = useQuery({
    queryKey: ['files'],
    queryFn: () => base44.entities.File.list()
  });

  const uninstallMutation = useMutation({
    mutationFn: (appId) => base44.entities.InstalledApp.delete(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installed-apps'] });
      toast.success('App uninstalled');
    }
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage(Math.random() * 60 + 20);
      setRamUsage(Math.random() * 50 + 30);
      setDiskUsage(45 + (files.length * 0.5));
    }, 1000);
    return () => clearInterval(interval);
  }, [files.length]);

  const getColor = (value) => {
    if (value > 80) return 'text-red-500';
    if (value > 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex border-b bg-white">
        <button
          onClick={() => setActiveTab('performance')}
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === 'performance' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
          }`}
        >
          Performance
        </button>
        <button
          onClick={() => setActiveTab('apps')}
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === 'apps' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
          }`}
        >
          Apps
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'performance' ? (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">CPU Usage</p>
                  <p className={`text-2xl font-bold ${getColor(cpuUsage)}`}>
                    {cpuUsage.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${cpuUsage}%` }} />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">RAM Usage</p>
                  <p className={`text-2xl font-bold ${getColor(ramUsage)}`}>
                    {ramUsage.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 transition-all" style={{ width: `${ramUsage}%` }} />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Disk Usage</p>
                  <p className={`text-2xl font-bold ${getColor(diskUsage)}`}>
                    {diskUsage.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 transition-all" style={{ width: `${diskUsage}%` }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* System (built-in) apps — always present, not uninstallable */}
            <div>
              <div className="flex items-center gap-2 mb-2 px-1">
                <Shield className="w-4 h-4 text-gray-500" />
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">System apps</h2>
            </div>
              <div className="space-y-2">
                {visibleMobileBuiltinApps(user).map((app) => {
                  const Icon = BUILTIN_ICONS[app.icon] || Package;
                  return (
                    <div key={app.id} className="bg-white rounded-xl p-3 border flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center shrink-0`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 text-sm">{app.title}</h3>
                        <p className="text-xs text-gray-400">System</p>
                      </div>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Built-in</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Installed apps — user-installed, uninstallable */}
            <div>
              <div className="flex items-center gap-2 mb-2 px-1">
                <Package className="w-4 h-4 text-gray-500" />
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Installed apps</h2>
              </div>
              {installedApps.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-xl border">
                  <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No installed apps</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {installedApps.map(app => (
                    <div key={app.id} className="bg-white rounded-xl p-3 border">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center shrink-0`}>
                          <Package className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-800 text-sm">{app.name}</h3>
                          <p className="text-xs text-gray-500">v{app.version}</p>
                        </div>
                      </div>
                      <Button
                        onClick={async () => {
                          if (await confirmAction(`Uninstall ${app.name}?`)) {
                            uninstallMutation.mutate(app.id);
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Uninstall
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}