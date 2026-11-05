import React, { useState } from 'react';
import { AlertTriangle, RotateCcw, Trash2, Shield, Wrench, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from '@/lib/devToast';
import { confirmAction } from '@/components/os/ConfirmDialog';

export default function RecoveryMode({ onExit }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  const handleResetSystem = async () => {
    if (!await confirmAction('Reset System?\n\nThis will delete all installed apps and files, returning EggetSystem to factory settings. This action cannot be undone.')) {
      return;
    }

    setIsProcessing(true);
    try {
      // Delete all installed apps
      const apps = await base44.entities.InstalledApp.list();
      for (const app of apps) {
        await base44.entities.InstalledApp.delete(app.id);
      }

      // Delete all files
      const files = await base44.entities.File.list();
      for (const file of files) {
        await base44.entities.File.delete(file.id);
      }

      // Reset user setup
      await base44.auth.updateMe({
        setup_completed: false,
        pinned_apps: [],
        pin: null,
        preferences: null,
        os_version: '1.0.0'
      });

      toast.success('System reset complete - restarting...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      toast.error('Reset failed: ' + error.message);
      setIsProcessing(false);
    }
  };

  const handleClearApps = async () => {
    if (!await confirmAction('Delete All Installed Apps?\n\nThis will remove all apps from the App Store. System apps will not be affected.')) {
      return;
    }

    setIsProcessing(true);
    try {
      const apps = await base44.entities.InstalledApp.list();
      for (const app of apps) {
        await base44.entities.InstalledApp.delete(app.id);
      }
      toast.success('All installed apps deleted!');
      setIsProcessing(false);
    } catch (error) {
      toast.error('Failed to delete apps: ' + error.message);
      setIsProcessing(false);
    }
  };

  const handleClearFiles = async () => {
    if (!await confirmAction('Delete All Files?\n\nThis will permanently delete all files in File Explorer. This action cannot be undone.')) {
      return;
    }

    setIsProcessing(true);
    try {
      const files = await base44.entities.File.list();
      for (const file of files) {
        await base44.entities.File.delete(file.id);
      }
      toast.success('All files deleted!');
      setIsProcessing(false);
    } catch (error) {
      toast.error('Failed to delete files: ' + error.message);
      setIsProcessing(false);
    }
  };

  const handleRestartOS = async () => {
    if (await confirmAction('Restart EggetSystem?\n\nThis will reload the operating system. Any unsaved work will be lost.')) {
      window.location.reload();
    }
  };

  const recoveryOptions = [
    {
      id: 'restart',
      title: 'Restart System',
      description: 'Reload the operating system',
      icon: RotateCcw,
      color: 'from-blue-500 to-cyan-500',
      action: handleRestartOS
    },
    {
      id: 'clear-apps',
      title: 'Delete Installed Apps',
      description: 'Remove all apps from App Store',
      icon: Trash2,
      color: 'from-orange-500 to-amber-500',
      action: handleClearApps,
      requiresProcessing: true
    },
    {
      id: 'clear-files',
      title: 'Delete All Files',
      description: 'Permanently delete all files',
      icon: Trash2,
      color: 'from-red-500 to-orange-500',
      action: handleClearFiles,
      requiresProcessing: true
    },
    {
      id: 'reset',
      title: 'Reset System',
      description: 'Factory reset - removes all data',
      icon: AlertTriangle,
      color: 'from-red-600 to-pink-600',
      action: handleResetSystem,
      requiresProcessing: true
    }
  ];

  if (selectedOption) {
    const option = recoveryOptions.find(o => o.id === selectedOption);
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-gray-800 rounded-2xl border border-gray-700 p-8 text-center">
          <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${option.color} mx-auto mb-6 flex items-center justify-center`}>
            <option.icon className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">{option.title}</h2>
          <p className="text-gray-400 mb-6">{option.description}</p>
          
          {isProcessing ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-400">Processing...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={option.action}
                className={`w-full bg-gradient-to-r ${option.color} hover:opacity-90`}
              >
                Confirm
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedOption(null)}
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 overflow-auto">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Recovery Mode</h1>
              <p className="text-sm text-gray-400">Troubleshoot and repair your system</p>
            </div>
          </div>
          <Button
            onClick={onExit}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Exit Recovery
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-8">
        {/* Warning Banner */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-500 mb-2">Warning</h3>
              <p className="text-sm text-gray-300">
                Recovery options can permanently delete data. Make sure you understand what each option does before proceeding.
              </p>
            </div>
          </div>
        </div>

        {/* Recovery Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recoveryOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                if (option.requiresProcessing) {
                  setSelectedOption(option.id);
                } else {
                  option.action();
                }
              }}
              disabled={isProcessing}
              className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-gray-600 hover:bg-gray-750 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${option.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  <option.icon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">{option.title}</h3>
                  <p className="text-sm text-gray-400">{option.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* System Info */}
        <div className="mt-8 bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            System Information
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">OS Version</span>
              <span className="text-white font-mono">EggetSystem 1.0.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Build</span>
              <span className="text-white font-mono">2025.01.12</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Platform</span>
              <span className="text-white">Web-based Operating System</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Recovery Mode</span>
              <span className="text-green-500">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}