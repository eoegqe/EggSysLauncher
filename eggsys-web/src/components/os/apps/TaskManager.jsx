import React, { useState, useEffect } from 'react';
import { X, Activity, Cpu, HardDrive, Wifi, AlertTriangle, TrendingUp, ListChecks } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/devToast';
import { cn } from '@/lib/utils';
import { confirmAction } from '@/components/os/ConfirmDialog';

export default function TaskManager({ runningWindows, onCloseWindow }) {
  const [activeTab, setActiveTab] = useState('processes');
  const [cpuUsage, setCpuUsage] = useState(0);
  const [ramUsage, setRamUsage] = useState(0);
  const [diskUsage, setDiskUsage] = useState(0);
  const [networkActivity, setNetworkActivity] = useState(0);
  const [cpuHistory, setCpuHistory] = useState(Array(20).fill(0));
  const [ramHistory, setRamHistory] = useState(Array(20).fill(0));

  const queryClient = useQueryClient();

  const { data: installedApps = [] } = useQuery({
    queryKey: ['installed-apps'],
    queryFn: () => base44.entities.InstalledApp.list()
  });

  const { data: files = [] } = useQuery({
    queryKey: ['files'],
    queryFn: () => base44.entities.File.list()
  });

  const uninstallAppMutation = useMutation({
    mutationFn: (appId) => base44.entities.InstalledApp.delete(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installed-apps'] });
      toast.success('App uninstalled successfully');
    }
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const newCpu = Math.random() * 60 + 20;
      const newRam = Math.random() * 50 + 30;
      const newDisk = 45 + (files.length * 0.5);
      const newNetwork = Math.random() * 100;

      setCpuUsage(newCpu);
      setRamUsage(newRam);
      setDiskUsage(Math.min(newDisk, 95));
      setNetworkActivity(newNetwork);

      setCpuHistory(prev => [...prev.slice(1), newCpu]);
      setRamHistory(prev => [...prev.slice(1), newRam]);
    }, 1000);

    return () => clearInterval(interval);
  }, [files.length]);

  const getStatusColor = (value) => {
    if (value > 80) return 'text-red-500';
    if (value > 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  const MetricCard = ({ icon: Icon, title, value, history, unit = '%', color }) => (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className={`text-2xl font-bold ${getStatusColor(value)}`}>
              {value.toFixed(1)}{unit}
            </p>
          </div>
        </div>
        {value > 80 && <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />}
      </div>
      
      {history && (
        <div className="flex items-end gap-1 h-16">
          {history.map((val, idx) => (
            <div
              key={idx}
              className={`flex-1 rounded-t transition-all ${
                val > 80 ? 'bg-red-400' : val > 60 ? 'bg-yellow-400' : 'bg-green-400'
              }`}
              style={{ height: `${val}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );

  const systemApps = [
    { id: 'system', name: 'System', type: 'System Process', status: 'Running', canEnd: false },
    { id: 'desktop', name: 'Desktop Window Manager', type: 'System Process', status: 'Running', canEnd: false }
  ];

  const runningApps = runningWindows.map(w => ({
    id: w.id,
    name: w.title,
    type: 'Application',
    status: 'Running',
    canEnd: true,
    isWindow: true
  }));

  const allProcesses = [...systemApps, ...runningApps];

  const runningProcesses = [
    { name: 'File Explorer', memory: 45.2, cpu: 2.1, status: 'running' },
    { name: 'Browser', memory: 128.5, cpu: 8.4, status: 'running' },
    { name: 'Settings', memory: 32.1, cpu: 0.5, status: 'running' },
    { name: 'System', memory: 156.3, cpu: 3.2, status: 'running' },
    ...runningApps.map(app => ({
      name: app.name,
      memory: Math.random() * 80 + 20,
      cpu: Math.random() * 5,
      status: 'running'
    }))
  ];

  return (
    <div className="h-full bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col overflow-hidden">
      {/* Header with Tabs */}
      <div className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <ListChecks className="w-6 h-6 text-blue-600" />
          Task Manager
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('processes')}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-all",
              activeTab === 'processes'
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            Processes
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-all",
              activeTab === 'performance'
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            Performance
          </button>
          <button
            onClick={() => setActiveTab('apps')}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-all",
              activeTab === 'apps'
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            Installed Apps
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'processes' && (
          <div className="space-y-6">
            {/* Alerts */}
            {(cpuUsage > 80 || ramUsage > 80 || diskUsage > 80) && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  <div>
                    <h3 className="font-bold text-red-800">Critical Resource Usage Detected</h3>
                    <p className="text-sm text-red-600">
                      {cpuUsage > 80 && 'CPU usage is critically high. '}
                      {ramUsage > 80 && 'RAM usage is critically high. '}
                      {diskUsage > 80 && 'Disk space is running low. '}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Active Processes */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-bold text-gray-800">Active Processes</h2>
                <span className="text-sm text-gray-600">{allProcesses.length} running</span>
              </div>
              <div className="divide-y divide-gray-200">
                {allProcesses.map((process) => (
                  <div key={process.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{process.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {process.type}
                        </span>
                        <span className="text-xs text-green-600">● {process.status}</span>
                      </div>
                    </div>
                    {process.canEnd && (
                      <Button
                        onClick={() => {
                          if (process.isWindow && onCloseWindow) {
                            onCloseWindow(process.id);
                            toast.success(`${process.name} closed`);
                          }
                        }}
                        variant="destructive"
                        size="sm"
                      >
                        <X className="w-4 h-4 mr-1" />
                        End Task
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Process Details */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Process Details
              </h2>
              <div className="space-y-2">
                {runningProcesses.map((process, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{process.name}</p>
                      <p className="text-xs text-gray-500">{process.status}</p>
                    </div>
                    <div className="flex gap-6 text-sm">
                      <div className="text-right">
                        <p className="text-gray-500">CPU</p>
                        <p className="font-semibold text-gray-800">{process.cpu.toFixed(1)}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500">Memory</p>
                        <p className="font-semibold text-gray-800">{process.memory.toFixed(1)} MB</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MetricCard
                icon={Cpu}
                title="CPU Usage"
                value={cpuUsage}
                history={cpuHistory}
                color="from-blue-500 to-cyan-500"
              />
              <MetricCard
                icon={Activity}
                title="RAM Usage"
                value={ramUsage}
                history={ramHistory}
                color="from-purple-500 to-pink-500"
              />
              <MetricCard
                icon={HardDrive}
                title="Disk Usage"
                value={diskUsage}
                color="from-orange-500 to-red-500"
              />
              <MetricCard
                icon={Wifi}
                title="Network"
                value={networkActivity}
                unit=" Mbps"
                color="from-green-500 to-emerald-500"
              />
            </div>

            {/* Performance Summary */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="font-bold text-gray-800 mb-4">System Health</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Overall Status</span>
                  <span className={cn(
                    "font-semibold",
                    cpuUsage > 80 || ramUsage > 80 ? "text-red-600" :
                    cpuUsage > 60 || ramUsage > 60 ? "text-yellow-600" :
                    "text-green-600"
                  )}>
                    {cpuUsage > 80 || ramUsage > 80 ? "Critical" :
                     cpuUsage > 60 || ramUsage > 60 ? "Warning" : "Good"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Running Processes</span>
                  <span className="font-semibold">{allProcesses.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Available Storage</span>
                  <span className="font-semibold">{(100 - diskUsage).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'apps' && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-bold text-gray-800">Installed Applications</h2>
            </div>
            {installedApps.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {installedApps.map((app) => (
                  <div key={app.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{app.name}</p>
                      <p className="text-sm text-gray-500">Version {app.version}</p>
                    </div>
                    <Button
                      onClick={async () => {
                        if (await confirmAction(`Are you sure you want to uninstall ${app.name}?`)) {
                          uninstallAppMutation.mutate(app.id);
                        }
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Uninstall
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                No installed applications
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}