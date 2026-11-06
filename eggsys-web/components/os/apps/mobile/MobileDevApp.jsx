import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Code, LayoutDashboard, Package, Star, Download, Clock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getUserThemeGradient } from '@/lib/themeUtils';
import MobileAppCreator from './MobileAppCreator';

const STATUS_INFO = {
  approved: { label: 'Approved', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle },
  pending: { label: 'Pending Review', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Clock },
  rejected: { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-100', icon: XCircle },
};

export default function MobileDevApp() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: user } = useQuery({
    queryKey: ['dev-app-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: myApps = [], isLoading } = useQuery({
    queryKey: ['dev-app-my-apps'],
    queryFn: async () => {
      const apps = await base44.entities.PublishedApp.list('-created_date');
      return apps.filter(app => app.created_by === user?.email);
    },
    enabled: !!user
  });

  const totalDownloads = myApps.reduce((sum, app) => sum + (app.downloads || 0), 0);
  const avgRating = myApps.length > 0
    ? (myApps.reduce((sum, app) => sum + (app.rating || 0), 0) / myApps.length).toFixed(1)
    : '0.0';

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className={`bg-gradient-to-r ${getUserThemeGradient(user, 'from-indigo-500 to-purple-600')} border-b p-4`}>
        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Code className="w-5 h-5" /> Dev Studio
        </h2>
        <div className="flex gap-1 bg-white/20 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn('flex-1 text-xs py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1', activeTab === 'dashboard' ? 'bg-white shadow text-gray-800' : 'text-white/80')}
          >
            <LayoutDashboard className="w-3 h-3" /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={cn('flex-1 text-xs py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1', activeTab === 'create' ? 'bg-white shadow text-gray-800' : 'text-white/80')}
          >
            <Code className="w-3 h-3" /> Create
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl p-3 border text-center">
              <Package className="w-5 h-5 mx-auto text-indigo-500 mb-1" />
              <p className="text-lg font-bold text-gray-800">{myApps.length}</p>
              <p className="text-xs text-gray-500">Apps</p>
            </div>
            <div className="bg-white rounded-xl p-3 border text-center">
              <Download className="w-5 h-5 mx-auto text-blue-500 mb-1" />
              <p className="text-lg font-bold text-gray-800">{totalDownloads}</p>
              <p className="text-xs text-gray-500">Downloads</p>
            </div>
            <div className="bg-white rounded-xl p-3 border text-center">
              <Star className="w-5 h-5 mx-auto text-yellow-500 mb-1" />
              <p className="text-lg font-bold text-gray-800">{avgRating}</p>
              <p className="text-xs text-gray-500">Avg Rating</p>
            </div>
          </div>

          {/* App list */}
          {isLoading ? (
            <p className="text-center text-gray-400 text-sm py-8">Loading your apps...</p>
          ) : myApps.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border">
              <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">You haven't published any apps yet.</p>
              <button
                onClick={() => setActiveTab('create')}
                className="mt-3 text-sm font-medium text-indigo-600"
              >
                Create your first app →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {myApps.map(app => {
                const status = STATUS_INFO[app.status] || STATUS_INFO.pending;
                const StatusIcon = status.icon;
                return (
                  <div key={app.id} className="bg-white rounded-xl p-3 border flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${app.color || 'from-gray-500 to-slate-500'} flex items-center justify-center flex-shrink-0`}>
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 text-sm">{app.name}</h3>
                      <p className="text-xs text-gray-500 truncate">{app.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium', status.bg, status.color)}>
                          <StatusIcon className="w-3 h-3" /> {status.label}
                        </span>
                        <span className="text-xs text-gray-400">v{app.version}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Download className="w-3 h-3" /> {app.downloads || 0}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {app.rating || 0}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <MobileAppCreator />
        </div>
      )}
    </div>
  );
}