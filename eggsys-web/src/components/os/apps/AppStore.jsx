import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Upload, Download, Trash2, Pencil, Plus, Package, CheckCircle, Shield, X, Search, Star, Filter, ChevronLeft, Send, User, Image, Bell, TrendingUp, Calculator, FileText, Folder, Terminal, Settings, Globe, Sparkles, ListChecks, Code, Cloud, BarChart3, Paintbrush, ExternalLink, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/lib/devToast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getEggSysIcon } from '@/lib/eggSysIcon';
import { getDeviceId } from '@/lib/deviceId';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import EditAppDialog from './EditAppDialog';
import ContentRatingBadge from '@/components/os/ContentRatingBadge';
import { useFollows } from '@/hooks/useFollows';
import { useFollowedCreatorApps } from '@/hooks/useFollows';
import { syncFollowedAppNotifications } from '@/lib/followNotifications';
import { confirmAction } from '@/components/os/ConfirmDialog';
import { useVerifiedMap } from '@/hooks/useVerified';
import VerifiedBadge from '@/components/os/VerifiedBadge';

const AVAILABLE_PERMISSIONS = [
  { id: 'storage', label: 'Local Storage', description: 'Store data on your device', icon: '💾' },
  { id: 'network', label: 'Network Access', description: 'Make network requests', icon: '🌐' },
  { id: 'files', label: 'File Access', description: 'Read and write files', icon: '📁' },
  { id: 'notifications', label: 'Notifications', description: 'Show notifications', icon: '🔔' },
  { id: 'clipboard', label: 'Clipboard Access', description: 'Copy and paste data', icon: '📋' },
  { id: 'geolocation', label: 'Location Access', description: 'Access your location', icon: '📍' },
];

const CATEGORIES = ['All', 'Productivity', 'Utilities', 'Games', 'Creative', 'Entertainment', 'Education', 'Finance', 'Health', 'Other'];

export default function AppStore({ onLaunchApp }) {
  const [isInstalling, setIsInstalling] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedApp, setSelectedApp] = useState(null);
  const [newReview, setNewReview] = useState({ rating: 5, review_text: '' });
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const { isVerified } = useVerifiedMap();

  const { data: installedApps = [] } = useQuery({
    queryKey: ['installed-apps'],
    queryFn: () => base44.entities.InstalledApp.list('-created_date')
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });



  const { data: reviews = [] } = useQuery({
    queryKey: ['app-reviews', selectedApp?.app_id],
    queryFn: () => selectedApp ? base44.entities.AppReview.filter({ app_id: selectedApp.app_id }, '-created_date') : [],
    enabled: !!selectedApp
  });

  const { data: screenshots = [] } = useQuery({
    queryKey: ['app-screenshots', selectedApp?.app_id],
    queryFn: () => selectedApp ? base44.entities.AppScreenshot.filter({ app_id: selectedApp.app_id }, '-created_date') : [],
    enabled: !!selectedApp
  });

  const deleteAppMutation = useMutation({
    mutationFn: (appId) => base44.entities.InstalledApp.delete(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installed-apps'] });
      toast.success('App uninstalled');
    }
  });

  const installAppMutation = useMutation({
    mutationFn: async ({ eafData }) => {
      await base44.entities.InstalledApp.create({
        name: eafData.name,
        app_id: eafData.app_id,
        version: eafData.version || '1.0.0',
        description: eafData.description || 'No description',
        icon: eafData.icon || 'Package',
        color: eafData.color || 'from-gray-500 to-slate-500',
        html_content: eafData.html_content || '',
        app_data: { ...eafData, license_text: eafData?.license_text || eafData?.app_data?.license_text || null },
        permissions: {}, // Permissions are not part of the simple store install for now
        device_id: getDeviceId()
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['installed-apps'] });
      toast.success(`${variables.eafData.name} installed!`);
    }
  });

  const submitReviewMutation = useMutation({
    mutationFn: async (reviewData) => {
      await base44.entities.AppReview.create({
        ...reviewData,
        reviewer_name: user?.full_name || 'Anonymous',
        reviewer_username: user?.username || null
      });

      // Check milestone: 10 five-star reviews → award 50 credits to app creator
      if (reviewData.rating === 5) {
        const allReviews = await base44.entities.AppReview.filter({ app_id: reviewData.app_id });
        const fiveStarCount = allReviews.filter(r => r.rating === 5).length;
        if (fiveStarCount === 10) {
          // Find the app's creator and award credits
          const app = approvedApps.find(a => a.app_id === reviewData.app_id);
          if (app) {
            const allUsers = await base44.entities.User.list();
            const creator = allUsers.find(u => u.email === app.created_by);
            if (creator) {
              await base44.entities.User.update(creator.id, {
                app_credits: (creator.app_credits || 0) + 50
              });
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-reviews', selectedApp?.app_id] });
      setNewReview({ rating: 5, review_text: '' });
      toast.success('Review submitted!');
    },
    onError: (error) => {
      toast.error(`Failed to submit review: ${error.message}`);
    }
  });

  const uploadScreenshotMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.AppScreenshot.create({
        app_id: selectedApp.app_id,
        image_url: file_url,
        caption: ''
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-screenshots', selectedApp?.app_id] });
      toast.success('Screenshot uploaded!');
      setUploadingScreenshot(false);
    }
  });



  const requestUpdateMutation = useMutation({
    mutationFn: async ({ app, message }) => {
      await base44.entities.UpdateRequest.create({
        app_id: app.app_id,
        app_name: app.name,
        current_version: app.version,
        message: message || ''
      });
    },
    onSuccess: () => {
      toast.success('Update request submitted!');
    }
  });

  const { data: approvedApps = [] } = useQuery({
    queryKey: ['approved-published-apps'],
    queryFn: async () => {
      const apps = await base44.entities.PublishedApp.filter({ status: 'approved' }, '-created_date');
      return apps.filter(a => !a.is_TV_original);
    }
  });

  const { followingUsernames } = useFollows();
  const { followedApps, allUsers } = useFollowedCreatorApps();

  useEffect(() => {
    if (user?.username && followingUsernames.length) {
      syncFollowedAppNotifications({ currentUser: user, followingUsernames, apps: approvedApps, allUsers });
    }
  }, [user?.username, followingUsernames, approvedApps, allUsers]);

  const isAdmin = ['admin', 'co-owner', 'owner'].includes(user?.role);
  const isOwner = user?.email === 'eggtheegget@outlook.com' || ['owner', 'co-owner'].includes(user?.role);

  const { data: eggSysApps = [] } = useQuery({
    queryKey: ['eggsys-apps'],
    queryFn: () => base44.entities.EggSysApps.list()
  });

  const deleteEggSysAppMutation = useMutation({
    mutationFn: (app) => base44.entities.EggSysApps.delete(app.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eggsys-apps'] });
      toast.success('Official app removed from store');
    },
    onError: (e) => toast.error('Failed to delete: ' + (e.message || ''))
  });

  const deletePublishedAppMutation = useMutation({
    mutationFn: (app) => base44.entities.PublishedApp.delete(app.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approved-published-apps'] });
      toast.success('App removed from store');
      setSelectedApp(null);
    },
    onError: (e) => toast.error('Failed to delete: ' + (e.message || ''))
  });

  // Only show approved user-submitted apps
  const allAvailableApps = approvedApps.map(app => ({
    ...app,
    downloads: app.downloads || 0,
    rating: app.rating || 0
  }));

  const featuredApps = allAvailableApps.filter(app => app.is_featured);
  const topRatedApps = [...allAvailableApps].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 6);

  const filteredApps = allAvailableApps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (app.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleInstallFromStore = async (app) => {
    const existing = installedApps.find(a => a.app_id === app.app_id);
    if (existing) {
      toast.error('App already installed');
      return;
    }
    
    setIsInstalling(true);
    try {
      await installAppMutation.mutateAsync({ eafData: app });
    } catch (error) {
      toast.error('Installation failed');
    }
    setIsInstalling(false);
  };

  const handleUninstall = async (app) => {
    if (!await confirmAction(`Uninstall ${app.name}?`)) return;
    deleteAppMutation.mutate(app.id);
  };

  const handleSubmitReview = () => {
    if (!newReview.review_text.trim()) {
      toast.error('Please write a review before submitting.');
      return;
    }
    submitReviewMutation.mutate({
      app_id: selectedApp.app_id,
      rating: newReview.rating,
      review_text: newReview.review_text
    });
  };

  const handleScreenshotUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    setUploadingScreenshot(true);
    uploadScreenshotMutation.mutate(file);
  };

  const handleRequestUpdate = () => {
    const installedApp = installedApps.find(a => a.app_id === selectedApp.app_id);
    if (!installedApp) {
      toast.error('App not installed');
      return;
    }
    const message = prompt('Why do you need an update? (Optional)');
    requestUpdateMutation.mutate({ app: installedApp, message });
  };

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : selectedApp?.rating || 0;

  if (selectedApp) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="p-6 bg-white border-b">
          <Button variant="ghost" onClick={() => setSelectedApp(null)} className="mb-4">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Store
          </Button>
          <div className="flex gap-6">
            <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${selectedApp.color} flex items-center justify-center shadow-xl flex-shrink-0`}>
              {/* Using a generic Package icon for now, could dynamically render based on app.icon if needed */}
              <Package className="w-12 h-12 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-gray-800 mb-1">{selectedApp.name}</h2>
              {selectedApp.developer_nickname && (
                <p className="text-sm text-gray-500 mb-2">by {selectedApp.developer_nickname}</p>
              )}
              <p className="text-gray-600 mb-3">{selectedApp.description}</p>
              <div className="flex items-center gap-6 text-sm flex-wrap">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-bold text-lg">{avgRating}</span>
                  <span className="text-gray-500">({reviews.length} reviews)</span>
                </div>
                <div>
                  <span className="text-gray-500">{selectedApp.downloads.toLocaleString()} downloads</span>
                </div>
                <div>
                  <span className="text-gray-500 capitalize">{selectedApp.category}</span>
                </div>
                <div>
                  <ContentRatingBadge rating={selectedApp.content_rating} size="md" />
                </div>
              </div>
            </div>
            {installedApps.some(a => a.app_id === selectedApp.app_id) ? (
              <Button
                variant="outline"
                onClick={() => {
                  const installed = installedApps.find(a => a.app_id === selectedApp.app_id);
                  handleUninstall(installed);
                }}
                className="self-start"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Uninstall
              </Button>
            ) : (
              <Button
                onClick={() => handleInstallFromStore(selectedApp)}
                disabled={isInstalling}
                className="self-start bg-blue-600 hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                {isInstalling ? 'Installing...' : 'Install'}
              </Button>
            )}
            {isAdmin && (
              <div className="flex gap-2 self-start">
                <Button
                  variant="outline"
                  onClick={() => setEditTarget({ app: selectedApp, isOfficial: false })}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => { if (await confirmAction(`Delete ${selectedApp.name} from the store? This removes it for all users.`)) deletePublishedAppMutation.mutate(selectedApp); }}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* Preview Media */}
          {selectedApp.preview_url && (
            <div className="bg-white rounded-xl border p-6 mb-6">
              <h3 className="font-semibold text-gray-800 mb-4">Preview</h3>
              <img 
                src={selectedApp.preview_url} 
                alt="App preview" 
                className="w-full rounded-lg"
              />
            </div>
          )}

          {/* Screenshots */}
          <div className="bg-white rounded-xl border p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Screenshots ({screenshots.length})</h3>
              <label>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleScreenshotUpload}
                  disabled={uploadingScreenshot}
                />
                <Button variant="outline" size="sm" disabled={uploadingScreenshot} onClick={() => document.querySelector('input[type=file]').click()}>
                  <Image className="w-4 h-4 mr-2" />
                  {uploadingScreenshot ? 'Uploading...' : 'Add Screenshot'}
                </Button>
              </label>
            </div>
            {screenshots.length === 0 ? (
              <p className="text-gray-500 text-sm">No screenshots yet</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {screenshots.map((ss) => (
                  <img 
                    key={ss.id} 
                    src={ss.image_url} 
                    alt={ss.caption || 'Screenshot'} 
                    className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                    onClick={() => window.open(ss.image_url, '_blank')}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Permissions */}
          <div className="bg-white rounded-xl border p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Required Permissions
            </h3>
            <div className="space-y-2">
              {AVAILABLE_PERMISSIONS.map((perm) => (
                <div key={perm.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-xl">{perm.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{perm.label}</p>
                    <p className="text-xs text-gray-500">{perm.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Request Update */}
          {installedApps.some(a => a.app_id === selectedApp.app_id) && (
            <div className="bg-white rounded-xl border p-6 mb-6">
              <h3 className="font-semibold text-gray-800 mb-4">Need an Update?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Request the developer to release a new version with bug fixes or features.
              </p>
              <Button onClick={handleRequestUpdate} variant="outline" className="w-full">
                <Bell className="w-4 h-4 mr-2" />
                Request Update
              </Button>
            </div>
          )}

          {/* Write Review */}
          <div className="bg-white rounded-xl border p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">Write a Review</h3>
            <div className="flex items-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setNewReview({ ...newReview, rating: star })}
                  className="transition-transform hover:scale-110"
                >
                  <Star 
                    className={cn(
                      "w-8 h-8",
                      star <= newReview.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                    )} 
                  />
                </button>
              ))}
              <span className="ml-2 font-medium text-gray-700">{newReview.rating} stars</span>
            </div>
            <Textarea
              placeholder="Share your experience with this app..."
              value={newReview.review_text}
              onChange={(e) => setNewReview({ ...newReview, review_text: e.target.value })}
              className="mb-4"
              rows={4}
            />
            <Button onClick={handleSubmitReview} disabled={submitReviewMutation.isPending}>
              <Send className="w-4 h-4 mr-2" />
              Submit Review
            </Button>
          </div>

          {/* Reviews List */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-4">
              Reviews ({reviews.length})
            </h3>
            {reviews.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border">
                <p className="text-gray-500">No reviews yet. Be the first to review!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-white rounded-xl border p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-800 flex items-center gap-1">
                            {review.reviewer_name}
                            {isVerified(review.reviewer_username) && <VerifiedBadge className="w-3.5 h-3.5" />}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(review.created_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              className={cn(
                                "w-4 h-4",
                                star <= review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                              )}
                            />
                          ))}
                        </div>
                        <p className="text-gray-700">{review.review_text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <EditAppDialog app={editTarget?.app} isOfficial={editTarget?.isOfficial} onLaunchApp={onLaunchApp} onClose={() => setEditTarget(null)} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="p-6 bg-white border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">App Store</h2>
            <p className="text-sm text-gray-500">Discover and install apps</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  selectedCategory === cat
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* From creators you follow */}
        {followedApps.length > 0 && !searchQuery && selectedCategory === 'All' && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              From creators you follow
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {followedApps.slice(0, 6).map(app => (
                <div
                  key={app.app_id}
                  onClick={() => setSelectedApp(app)}
                  className="bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md transition-all"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${app.color || 'from-gray-500 to-gray-700'} flex items-center justify-center mb-3`}>
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-1 line-clamp-1 text-sm">{app.name}</h3>
                  <p className="text-xs text-gray-500 line-clamp-1">{app.developer_nickname || 'Creator'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Featured Apps */}
        {featuredApps.length > 0 && !searchQuery && selectedCategory === 'All' && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Featured Apps
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featuredApps.slice(0, 4).map((app) => (
                <div
                  key={app.app_id}
                  onClick={() => setSelectedApp(app)}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white cursor-pointer hover:shadow-xl transition-all"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Package className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{app.name}</h3>
                      <p className="text-sm text-white/80">{app.category}</p>
                    </div>
                  </div>
                  <p className="text-sm text-white/90 line-clamp-2 mb-3">{app.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Download className="w-4 h-4" /> {app.downloads || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> {app.rating || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Rated Apps */}
        {topRatedApps.length > 0 && !searchQuery && selectedCategory === 'All' && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Top Rated Apps
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {topRatedApps.map((app) => (
                <div
                  key={app.app_id}
                  onClick={() => setSelectedApp(app)}
                  className="bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md transition-all"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center mb-3`}>
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-1 line-clamp-1 text-sm">{app.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{app.rating || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">All Apps ({filteredApps.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredApps.map((app) => {
              const isInstalled = installedApps.some(a => a.app_id === app.app_id);
              return (
                <div 
                  key={app.app_id} 
                  className="bg-white rounded-xl border p-5 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => setSelectedApp(app)}
                >
                  <div className="flex gap-4 mb-4">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${app.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                      {/* Using a generic Package icon for now, could dynamically render based on app.icon if needed */}
                      <Package className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-800 truncate">{app.name}</h4>
                      {app.developer_nickname && (
                        <p className="text-xs text-gray-400">by {app.developer_nickname}</p>
                      )}
                      <p className="text-xs text-gray-500">{app.category}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-medium">{app.rating}</span>
                        <ContentRatingBadge rating={app.content_rating} />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{app.description}</p>
                  {isInstalled && (
                    <div className="flex items-center gap-2 text-xs text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      Installed
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <EditAppDialog app={editTarget?.app} isOfficial={editTarget?.isOfficial} onLaunchApp={onLaunchApp} onClose={() => setEditTarget(null)} />
      <EditAppDialog app={null} isOfficial isCreate={createOpen} onLaunchApp={onLaunchApp} onClose={() => setCreateOpen(false)} onSaved={() => setCreateOpen(false)} />
    </div>
  );
}