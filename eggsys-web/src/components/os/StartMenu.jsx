import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calculator, FileText, Folder, Terminal, Settings, Globe, Package, Power, LogOut, Sparkles, ListChecks, Code, Upload, Cloud, Shield, Paintbrush, MessageCircle, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

const builtInApps = [
  { id: 'calculator', name: 'Calculator', icon: Calculator, color: 'from-blue-500 to-cyan-500' },
  { id: 'editor', name: 'Text Editor', icon: FileText, color: 'from-purple-500 to-pink-500' },
  { id: 'files', name: 'File Explorer', icon: Folder, color: 'from-yellow-500 to-orange-500' },
  { id: 'ecloud', name: 'ECloud', icon: Cloud, color: 'from-sky-500 to-blue-500' },
  { id: 'messages', name: 'Messages', icon: MessageCircle, color: 'from-cyan-500 to-blue-600' },
  { id: 'terminal', name: 'Terminal', icon: Terminal, color: 'from-green-500 to-emerald-500' },
  { id: 'browser', name: 'Browser', icon: Globe, color: 'from-indigo-500 to-blue-500' },
  { id: 'taskmanager', name: 'Task Manager', icon: ListChecks, color: 'from-teal-500 to-cyan-500' },
  { id: 'eafinstaller', name: 'EAF Installer', icon: Upload, color: 'from-orange-500 to-red-500' },
  { id: 'devconsole', name: 'Dev Console', icon: Code, color: 'from-green-600 to-emerald-700' },
  { id: 'appcreator', name: 'App Creator', icon: Sparkles, color: 'from-violet-500 to-purple-500' },
  { id: 'appstore', name: 'App Store', icon: Package, color: 'from-pink-500 to-rose-500' },
  { id: 'settings', name: 'Settings', icon: Settings, color: 'from-gray-500 to-slate-500' },
  { id: 'paint', name: 'Paint', icon: Paintbrush, color: 'from-pink-500 to-red-500' },
  { id: 'eggmail', name: 'EggMail', icon: Mail, color: 'from-blue-500 to-indigo-600' },
  { id: 'phone', name: 'Phone', icon: Phone, color: 'from-green-500 to-emerald-600' }
];



export default function StartMenu({ isOpen, onClose, onAppLaunch, onEnterRecovery, onPowerOff }) {
  const [showPowerMenu, setShowPowerMenu] = useState(false);
  const isDemoMode = localStorage.getItem('eos_demo_mode') === 'true';
  
  const { data: installedApps = [] } = useQuery({
    queryKey: ['installed-apps'],
    queryFn: () => base44.entities.InstalledApp.list('-created_date'),
    enabled: isOpen
  });

  const { data: user } = useQuery({
    queryKey: ['current-user-startmenu'],
    queryFn: () => base44.auth.me(),
    enabled: isOpen
  });

  const { data: adminWhitelist = [] } = useQuery({
    queryKey: ['admin-whitelist-startmenu'],
    queryFn: () => base44.entities.AdminWhitelist.filter({ is_active: true }),
    enabled: isOpen
  });

  const isWhitelisted = adminWhitelist.some(a => a.email === user?.email);
  const isAdmin = !isDemoMode && (isWhitelisted || user?.admin_role || user?.role === 'admin');

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed bottom-16 left-4 w-[550px] max-h-[700px] bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex-shrink-0 flex items-center gap-3">
              <img 
                src="https://media.base44.com/images/public/6946b759fb67abb9152e7314/c697387e9_file_000000006d3481f5be81064990edc01f.png" 
                alt="EggetSystem" 
                className="w-32 h-10 object-contain"
              />
            </div>

            {/* Apps Grid */}
            <div className="flex-1 p-6 overflow-auto">
              {/* Built-in Apps */}
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">System Apps</h3>
                <div className="grid grid-cols-4 gap-4">
                  {builtInApps.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => {
                        onAppLaunch(app.id);
                        onClose();
                      }}
                      className="group flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-white/5 transition-all"
                    >
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${app.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                        <app.icon className="w-8 h-8 text-white" />
                      </div>
                      <span className="text-sm text-white text-center">{app.name}</span>
                    </button>
                  ))}

                </div>
              </div>

              {/* Installed Apps */}
              {installedApps.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Installed Apps</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {installedApps.map((app) => (
                      <button
                        key={app.id}
                        onClick={() => {
                          onAppLaunch(app.app_id);
                          onClose();
                        }}
                        className="group flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-white/5 transition-all"
                      >
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${app.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                          <Package className="w-8 h-8 text-white" />
                        </div>
                        <span className="text-sm text-white text-center">{app.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 flex-shrink-0">
              {showPowerMenu ? (
                <div className="space-y-2">
                  <Button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <LogOut className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">Sign Out</p>
                      <p className="text-xs text-gray-400">End your session</p>
                    </div>
                  </Button>
                  
                  <Button
                    onClick={() => {
                      setShowPowerMenu(false);
                      onClose();
                      onPowerOff();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-red-500/20 transition-colors text-white"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center">
                      <Power className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">Power Off</p>
                      <p className="text-xs text-gray-400">Shut down the system</p>
                    </div>
                  </Button>

                  <Button
                    onClick={() => setShowPowerMenu(false)}
                    variant="ghost"
                    className="w-full text-gray-400 hover:text-white hover:bg-white/5"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setShowPowerMenu(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                    <Power className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-white">Power</p>
                    <p className="text-xs text-gray-400">Sign out or shut down</p>
                  </div>
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}