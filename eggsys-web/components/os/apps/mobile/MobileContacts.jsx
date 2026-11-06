import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useContacts } from '@/hooks/useContacts';
import { User, UserPlus, Search, X, Trash2, ArrowLeft, MessageCircle, Phone, UserCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/devToast';
import ProfilePopup from '@/components/os/ProfilePopup';
import { getUserThemeGradient } from '@/lib/themeUtils';
import VerifiedBadge from '@/components/os/VerifiedBadge';
import { getKidsAllowedContacts, THEEGGET_USERNAME } from '@/lib/kidsMode';

export default function MobileContacts({ kidsMode = false }) {
  const { contacts, addContactMutation, removeContactMutation } = useContacts();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [showProfilePopup, setShowProfilePopup] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['current-user-contacts'],
    queryFn: () => base44.auth.me()
  });

  const accent = getUserThemeGradient(currentUser, 'from-indigo-500 to-purple-600');

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-contacts'],
    queryFn: async () => {
      const users = await base44.entities.User.list('-created_date');
      return users.filter(u => u.username && u.username !== currentUser?.username);
    },
    enabled: !!currentUser?.username
  });

  const blockedUsernames = currentUser?.blocked_usernames || [];
  const contactUsernames = contacts.map(c => c.contact_username);
  const contactUsers = allUsers.filter(u => contactUsernames.includes(u.username) && !blockedUsernames.includes(u.username));

  // Kids Mode: only Theegget + parent-approved contacts are visible, read-only.
  const kidsAllowed = getKidsAllowedContacts();
  const kidsContactUsers = allUsers.filter((u) => kidsAllowed.includes(u.username));
  if (!kidsContactUsers.some((u) => u.username === THEEGGET_USERNAME)) {
    kidsContactUsers.unshift({ id: 'theegget', username: THEEGGET_USERNAME, full_name: 'Theegget', verified: true });
  }
  const visibleContacts = kidsMode ? kidsContactUsers : contactUsers;
  const searchResults = allUsers.filter(u =>
    !contactUsernames.includes(u.username) &&
    !blockedUsernames.includes(u.username) &&
    (u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAdd = (user) => {
    addContactMutation.mutate(user.username, {
      onSuccess: () => toast.success(`Added @${user.username}`)
    });
  };

  const handleRemove = (contact) => {
    removeContactMutation.mutate(contact.id, {
      onSuccess: () => toast.success('Contact removed')
    });
  };

  if (!currentUser?.username) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-800 mb-2">Username Required</h3>
          <p className="text-sm text-gray-600">Set up your username in Settings to use Contacts</p>
        </div>
      </div>
    );
  }

  if (showAdd) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className={`p-4 bg-gradient-to-r ${accent} text-white`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Add Contact</h2>
            <button onClick={() => { setShowAdd(false); setSearch(''); }} className="p-2 hover:bg-white/20 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/60"
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {search && searchResults.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            <div className="p-2">
              {!search && <p className="text-xs text-gray-500 px-3 py-2">Search to find users to add</p>}
              {searchResults.map(user => (
                <div key={user.id} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {user.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-800 flex items-center gap-1">@{user.username}{user.verified && <VerifiedBadge size={12} />}</p>
                    <p className="text-sm text-gray-500">{user.full_name || 'No name set'}</p>
                  </div>
                  <Button size="sm" onClick={() => handleAdd(user)} disabled={addContactMutation.isPending}>
                    <UserPlus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (selectedContact) {
    const user = selectedContact;
    const contact = contacts.find(c => c.contact_username === user.username);
    return (
      <div className="h-full flex flex-col bg-white">
        <div className={`p-4 bg-gradient-to-r ${accent} text-white flex items-center gap-3`}>
          <button onClick={() => setSelectedContact(null)} className="p-2 hover:bg-white/20 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold">Contact Details</h2>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-semibold mb-3 overflow-hidden">
              {user.profile_picture ? (
                <img src={user.profile_picture} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                user.username?.[0]?.toUpperCase() || '?'
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-1.5">{user.full_name || 'No name set'}{user.verified && <VerifiedBadge size={15} />}</h3>
            <p className="text-sm text-gray-500">@{user.username}</p>
          </div>

          <div className={`grid ${kidsMode ? 'grid-cols-2' : 'grid-cols-3'} gap-3 mb-6`}>
            {!kidsMode && (
            <button
              onClick={() => {
                setSelectedContact(null);
                window.dispatchEvent(new CustomEvent('open-chat', { detail: { username: user.username } }));
              }}
              className="flex flex-col items-center gap-1 py-3 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-xs font-medium">Message</span>
            </button>
            )}
            <button
              onClick={() => {
                setSelectedContact(null);
                window.dispatchEvent(new CustomEvent('open-call', { detail: { username: user.username } }));
              }}
              className="flex flex-col items-center gap-1 py-3 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
            >
              <Phone className="w-5 h-5" />
              <span className="text-xs font-medium">Call</span>
            </button>
            <button
              onClick={() => setShowProfilePopup(true)}
              className="flex flex-col items-center gap-1 py-3 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
            >
              <UserCircle className="w-5 h-5" />
              <span className="text-xs font-medium">Profile</span>
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <span className="text-sm text-gray-500">Username</span>
              <span className="text-sm font-medium text-gray-800">@{user.username}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <span className="text-sm text-gray-500">Name</span>
              <span className="text-sm font-medium text-gray-800">{user.full_name || 'No name set'}</span>
            </div>
            {!kidsMode && (
            <button
              onClick={() => {
                handleRemove(contact);
                setSelectedContact(null);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm font-medium">Remove Contact</span>
            </button>
            )}
          </div>
        </div>

        {showProfilePopup && (
          <ProfilePopup user={user} onClose={() => setShowProfilePopup(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className={`p-4 bg-gradient-to-r ${accent} text-white flex items-center justify-between`}>
        <div>
          <h2 className="text-xl font-bold">Contacts</h2>
          <p className="text-xs opacity-80">{kidsMode ? `${visibleContacts.length} allowed` : `${contacts.length} contact${contacts.length !== 1 ? 's' : ''}`}</p>
        </div>
        {!kidsMode && (
        <button onClick={() => setShowAdd(true)} className="p-2 hover:bg-white/20 rounded-lg">
          <UserPlus className="w-6 h-6" />
        </button>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {visibleContacts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">{kidsMode ? 'No allowed contacts' : 'No contacts yet'}</p>
            <p className="text-xs">{kidsMode ? 'Ask a parent to approve contacts' : 'Tap + to add a contact'}</p>
          </div>
        ) : (
          <div className="p-2">
            {visibleContacts.map(user => {
              const contact = contacts.find(c => c.contact_username === user.username);
              return (
                <button
                  key={user.id}
                  onClick={() => setSelectedContact(user)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden">
                    {user.profile_picture ? (
                      <img src={user.profile_picture} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                      user.username?.[0]?.toUpperCase() || '?'
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-800 flex items-center gap-1">@{user.username}{user.verified && <VerifiedBadge size={12} />}</p>
                    <p className="text-sm text-gray-500">{user.full_name || 'No name set'}</p>
                  </div>
                  {!kidsMode && (
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => { e.stopPropagation(); handleRemove(contact); }}
                    className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                    title="Remove contact"
                  >
                    <Trash2 className="w-5 h-5" />
                  </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}