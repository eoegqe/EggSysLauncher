import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { sendOneSignalNotification } from '@/lib/oneSignalNotify';
import { useContacts } from '@/hooks/useContacts';
import { Send, ArrowLeft, User, Check, CheckCheck, Edit2, Trash2, X, Flag, MoreVertical, Lock, Signal, Headphones, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/devToast';
import { format } from 'date-fns';
import ProfilePopup from '@/components/os/ProfilePopup';
import { getUserThemeGradient } from '@/lib/themeUtils';
import SupportChat from './SupportChat';
import { confirmAction } from '@/components/os/ConfirmDialog';
import VerifiedBadge from '@/components/os/VerifiedBadge';
import GroupChatCreator from './GroupChatCreator';
import GroupChatView from './GroupChatView';
import { Users, Ban } from 'lucide-react';
import { moderateMessage, banAccount } from '@/lib/contentModeration';


export default function MobileMessages({ esimActive = true, onLaunchApp, mobileDataEnabled = true }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showConversationSettings, setShowConversationSettings] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [nonExistentChat, setNonExistentChat] = useState(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);
  const [moderating, setModerating] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();
  const { contacts } = useContacts();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user-messages'],
    queryFn: () => base44.auth.me()
  });

  const accent = getUserThemeGradient(currentUser, 'from-blue-500 to-purple-600');
  const isAdmin = currentUser?.role === 'admin' || !!currentUser?.admin_role;
  const blockedUsernames = currentUser?.blocked_usernames || [];

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-messages'],
    queryFn: async () => {
      const users = await base44.entities.User.list('-created_date');
      return users.filter(u => u.username && u.username !== currentUser?.username && !blockedUsernames.includes(u.username));
    },
    enabled: !!currentUser?.username
  });

  const { data: groupChats = [] } = useQuery({
    queryKey: ['group-chats', currentUser?.username],
    queryFn: async () => {
      if (!currentUser?.username) return [];
      return base44.entities.GroupChat.list('-created_date');
    },
    enabled: !!currentUser?.username,
    refetchInterval: 60000
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['user-messages', selectedUser?.username],
    queryFn: async () => {
      if (!selectedUser || !currentUser?.username) return [];
      const sent = await base44.entities.UserMessage.filter({
        sender_username: currentUser.username,
        recipient_username: selectedUser.username
      }, 'created_date');
      const received = await base44.entities.UserMessage.filter({
        sender_username: selectedUser.username,
        recipient_username: currentUser.username
      }, 'created_date');
      return [...sent, ...received].sort((a, b) => 
        new Date(a.created_date) - new Date(b.created_date)
      );
    },
    enabled: !!selectedUser && !!currentUser?.username,
    refetchInterval: 60000
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', currentUser?.username],
    queryFn: async () => {
      if (!currentUser?.username) return [];
      const allMessages = await base44.entities.UserMessage.filter({
        $or: [
          { sender_username: currentUser.username },
          { recipient_username: currentUser.username }
        ]
      }, '-created_date');

      const convMap = {};
      allMessages.forEach(msg => {
        // Skip group messages — they appear in the group conversations section
        if (msg.group_id) return;
        const otherUser = msg.sender_username === currentUser.username
          ? msg.recipient_username
          : msg.sender_username;
        // Hide conversations with blocked users
        if (blockedUsernames.includes(otherUser)) return;

        if (!convMap[otherUser] || new Date(msg.created_date) > new Date(convMap[otherUser].created_date)) {
          convMap[otherUser] = {
            username: otherUser,
            lastMessage: msg.is_image ? '📷 Photo' : msg.content,
            lastMessageDate: msg.created_date,
            unread: msg.recipient_username === currentUser.username && !msg.read
          };
        }
      });

      return Object.values(convMap);
    },
    enabled: !!currentUser?.username,
    refetchInterval: 60000
  });

  const { data: groupConversations = [] } = useQuery({
    queryKey: ['group-conversations', currentUser?.username],
    queryFn: async () => {
      if (!currentUser?.username) return [];
      const myGroups = groupChats.filter(g => (g.member_usernames || []).includes(currentUser.username));
      const result = [];
      for (const group of myGroups) {
        const msgs = await base44.entities.UserMessage.filter({ group_id: group.id }, '-created_date');
        const lastMsg = msgs[0];
        result.push({
          group,
          lastMessage: lastMsg ? (lastMsg.is_image ? '📷 Photo' : lastMsg.content) : 'New group',
          lastMessageDate: lastMsg?.created_date || group.created_date,
          unread: msgs.some(m => (m.recipient_usernames?.includes(currentUser.username) || m.recipient_username === currentUser.username) && !m.read),
        });
      }
      return result.sort((a, b) => new Date(b.lastMessageDate) - new Date(a.lastMessageDate));
    },
    enabled: !!currentUser?.username,
    refetchInterval: 60000,
  });

  const myGroups = groupChats.filter(g => (g.member_usernames || []).includes(currentUser?.username));

  const { data: chatRequests = [] } = useQuery({
    queryKey: ['chat-requests', currentUser?.username],
    queryFn: async () => {
      if (!currentUser?.username) return [];
      return await base44.entities.ChatRequest.filter(
        { recipient_username: currentUser.username, status: 'pending' },
        '-created_date'
      );
    },
    enabled: !!currentUser?.username,
    refetchInterval: 60000
  });

  // Chats stay live through subscriptions instead of polling every couple of
  // seconds, which is what exhausted the per-user list budget. Only traffic
  // involving this user refreshes the open screens.
  useEffect(() => {
    if (!currentUser?.username) return;
    const unsubMessages = base44.entities.UserMessage.subscribe((event) => {
      const m = event.data;
      if (!m) return;
      const involvesMe = m.sender_username === currentUser.username ||
        m.recipient_username === currentUser.username ||
        (m.recipient_usernames || []).includes(currentUser.username);
      if (!involvesMe) return;
      queryClient.invalidateQueries({ queryKey: ['user-messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['group-conversations'] });
    });
    const unsubGroups = base44.entities.GroupChat.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['group-chats'] });
      queryClient.invalidateQueries({ queryKey: ['group-conversations'] });
    });
    const unsubRequests = base44.entities.ChatRequest.subscribe((event) => {
      const r = event.data;
      if (!r) return;
      if (r.recipient_username !== currentUser.username && r.sender_username !== currentUser.username) return;
      queryClient.invalidateQueries({ queryKey: ['chat-requests'] });
    });
    return () => { unsubMessages(); unsubGroups(); unsubRequests(); };
  }, [currentUser?.username, queryClient]);



  const isUnder13 = currentUser?.age && currentUser.age < 13;

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.UserMessage.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setMessageText('');
      setPendingImage(null);
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.UserMessage.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  const editMessageMutation = useMutation({
    mutationFn: ({ id, content }) => base44.entities.UserMessage.update(id, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setEditingId(null);
      setEditText('');
      toast.success('Message edited');
    }
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (id) => base44.entities.UserMessage.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Message deleted');
    }
  });

  const reportUserMutation = useMutation({
    mutationFn: ({ reportedUsername, reason }) => {
      return base44.entities.Feedback?.create?.({
        category: 'report',
        subject: `Report: ${reportedUsername}`,
        message: reason,
        user_email: currentUser?.email
      }).catch(() => null);
    },
    onSuccess: () => {
      toast.success('User reported');
    }
  });

  const blockMutation = useMutation({
    mutationFn: async ({ username, block }) => {
      const current = currentUser?.blocked_usernames || [];
      const updated = block
        ? [...new Set([...current, username])]
        : current.filter(u => u !== username);
      await base44.auth.updateMe({ blocked_usernames: updated });
      return updated;
    },
    onSuccess: (_, { block, username }) => {
      queryClient.invalidateQueries({ queryKey: ['current-user-messages'] });
      queryClient.invalidateQueries({ queryKey: ['all-users-messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success(block ? 'User blocked' : 'User unblocked');
      if (block) setSelectedUser(null);
    },
    onError: () => toast.error('Failed to update block list'),
  });

  const handleBlockUser = (username) => blockMutation.mutate({ username, block: true });
  const handleUnblockUser = (username) => blockMutation.mutate({ username, block: false });

  const handleReportUser = (username) => {
    const reason = prompt(`Report ${username} - Enter reason (spam, harassment, abuse, etc):`);
    if (reason?.trim()) {
      reportUserMutation.mutate({ reportedUsername: username, reason });
    }
  };





  const createChatRequestMutation = useMutation({
    mutationFn: ({ requesterUsername, recipientUsername }) => {
      return base44.entities.ChatRequest.create({
        requester_username: requesterUsername,
        recipient_username: recipientUsername,
        status: 'pending'
      });
    },
    onSuccess: () => {
      toast.success('Chat request sent');
    }
  });

  const respondChatRequestMutation = useMutation({
    mutationFn: ({ id, status }) => {
      return base44.entities.ChatRequest.update(id, { status });
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['chat-requests'] });
      if (status === 'accepted') {
        toast.success('Chat request accepted');
      } else {
        toast.success('Chat request rejected');
      }
    }
  });

  const getChatRequestStatus = (username) => {
    return chatRequests.find(r => r.requester_username === username)?.status;
  };

  const checkIfAlreadyMessaging = (username) => {
    return conversations.some(c => c.username === username);
  };

  // Open a specific chat when launched from a notification (sessionStorage transport)
  useEffect(() => {
    const pending = sessionStorage.getItem('eos_open_chat');
    if (!pending) return;
    sessionStorage.removeItem('eos_open_chat');
    if (pending === '__test_text__') {
      setNonExistentChat(pending);
      return;
    }
    const u = allUsers.find(x => x.username === pending);
    setSelectedUser(u || { username: pending });
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const c = messagesEndRef.current?.parentElement;
    if (c) c.scrollTop = c.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (selectedUser && messages.length > 0) {
      messages.forEach(msg => {
        if (msg.recipient_username === currentUser?.username && !msg.read) {
          markAsReadMutation.mutate(msg.id);
        }
      });
    }
  }, [messages, selectedUser, currentUser]);

  useEffect(() => {
    if (messages.length > 0 && currentUser?.username) {
      const lastMsg = messages[messages.length - 1];
      const isIncomingMsg = lastMsg.recipient_username === currentUser.username && !lastMsg.read;
      
      if (isIncomingMsg && lastMsg.sender_username !== currentUser.username) {
        const senderUser = allUsers.find(u => u.username === lastMsg.sender_username);
        const notificationTitle = `Message from @${lastMsg.sender_username}`;
        const notificationBody = lastMsg.is_image ? '📷 Sent a photo' : lastMsg.content;

        // Show in-app toast notification
        toast.success(
          <div>
            <p className="font-semibold text-sm">{notificationTitle}</p>
            <p className="text-xs text-gray-600">{notificationBody}</p>
          </div>
        );

        // Send push notification via OneSignal
        sendOneSignalNotification(notificationTitle, notificationBody);
      }
    }
  }, [messages, currentUser?.username, allUsers]);

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedUser) return;
    if (!mobileDataEnabled) {
      window.dispatchEvent(new CustomEvent('eos_no_service', { detail: { app: 'Messages' } }));
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    setUploadingImage(true);
    try {
      const res = await base44.integrations.Core.UploadPublicFile({ file });
      setPendingImage(res.file_url);
    } catch (err) {
      toast.error('Failed to upload image: ' + (err?.message || err));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSend = async () => {
    if ((!messageText.trim() && !pendingImage) || !selectedUser) return;
    if (!mobileDataEnabled) {
      window.dispatchEvent(new CustomEvent('eos_no_service', { detail: { app: 'Messages' } }));
      return;
    }
    setModerating(true);
    try {
      const result = await moderateMessage(messageText.trim(), pendingImage);
      if (result.inappropriate) {
        toast.error('Your account has been banned for inappropriate content.');
        await banAccount(currentUser.email, currentUser.username, `${result.category}: ${result.reason}`);
        queryClient.invalidateQueries({ queryKey: ['eaccount-mobile'] });
        queryClient.invalidateQueries({ queryKey: ['current-user-messages'] });
        setMessageText('');
        setPendingImage(null);
        return;
      }
      sendMessageMutation.mutate({
        sender_username: currentUser.username,
        recipient_username: selectedUser.username,
        content: messageText.trim(),
        is_image: !!pendingImage,
        image_url: pendingImage || undefined
      });
    } catch {
      sendMessageMutation.mutate({
        sender_username: currentUser.username,
        recipient_username: selectedUser.username,
        content: messageText.trim(),
        is_image: !!pendingImage,
        image_url: pendingImage || undefined
      });
    } finally {
      setModerating(false);
    }
  };

  if (!currentUser?.username) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-800 mb-2">Username Required</h3>
          <p className="text-sm text-gray-600">Set up your username in Settings to use Messages</p>
        </div>
      </div>
    );
  }





  if (nonExistentChat) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className={`flex items-center gap-3 p-4 bg-gradient-to-r ${accent} text-white`}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setNonExistentChat(null)}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h3 className="font-semibold">@{nonExistentChat}</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-700 font-medium">Conversation does not exist.</p>
            <p className="text-sm text-gray-500 mt-1">This is a test</p>
          </div>
        </div>
      </div>
    );
  }

  if (supportOpen) {
    return (
      <div className="h-full">
        <SupportChat
          conversationEmail={currentUser.email}
          conversationUsername={currentUser.username}
          isSupport={false}
          currentUser={currentUser}
          onBack={() => setSupportOpen(false)}
        />
      </div>
    );
  }

  if (showNewGroup) {
    return (
      <div className="h-full">
        <GroupChatCreator
          currentUser={currentUser}
          onClose={() => setShowNewGroup(false)}
          onCreated={(group) => {
            setShowNewGroup(false);
            setSelectedGroup(group);
          }}
        />
      </div>
    );
  }

  if (selectedGroup) {
    return (
      <div className="h-full">
        <GroupChatView
          group={selectedGroup}
          currentUser={currentUser}
          onBack={() => setSelectedGroup(null)}
          onLaunchApp={onLaunchApp}
          mobileDataEnabled={mobileDataEnabled}
          esimActive={esimActive}
        />
      </div>
    );
  }

  if (selectedUser) {
    const recipientIsUnder13 = selectedUser.age && selectedUser.age < 13;
    const chatRequestStatus = getChatRequestStatus(selectedUser.username);
    const alreadyMessaging = checkIfAlreadyMessaging(selectedUser.username);
    const canMessage = !recipientIsUnder13 || alreadyMessaging || chatRequestStatus === 'accepted';

    return (
      <div className="h-full flex flex-col bg-white">
        {/* Chat Header */}
        <div className={`flex items-center gap-3 p-4 bg-gradient-to-r ${accent} text-white`}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedUser(null)}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <button type="button" onClick={() => setShowProfilePopup(true)} className="flex items-center gap-3 flex-1 text-left hover:bg-white/10 rounded-lg -ml-1 px-1 py-1 transition-colors">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
              {selectedUser.profile_picture ? (
                <img src={selectedUser.profile_picture} alt={selectedUser.username} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-1">@{selectedUser.username}{selectedUser.verified && <VerifiedBadge size={13} />}</h3>
              <p className="text-xs opacity-80">{selectedUser.full_name || 'No name set'}</p>
              {recipientIsUnder13 && !alreadyMessaging && (
                <p className="text-xs opacity-60 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Age restricted
                </p>
              )}
              <p className="text-[10px] opacity-60 mt-0.5">Tap to view profile</p>
            </div>
          </button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowConversationSettings(true)}
              className="text-white hover:bg-white/20"
              title="Conversation settings"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Messages or Locked View */}
        {!canMessage ? (
          <div className="flex-1 flex items-center justify-center p-4 bg-gray-50">
            <div className="text-center">
              <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">Chat Request Required</h3>
              <p className="text-sm text-gray-600 mb-4">
                {selectedUser.full_name || `@${selectedUser.username}`} is under 13. They must accept your chat request first.
              </p>
              {chatRequestStatus === 'pending' ? (
                <p className="text-xs text-blue-600">Chat request sent — waiting for response</p>
              ) : (
                <Button
                  onClick={() => createChatRequestMutation.mutate({
                    requesterUsername: currentUser.username,
                    recipientUsername: selectedUser.username
                  })}
                  className="bg-gradient-to-r from-blue-500 to-purple-600"
                >
                  Send Chat Request
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-4 bg-gray-50 flex flex-col">
          <div className="flex-1" />
          {messages.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs">Say hello! 👋</p>
            </div>
          ) : (
            <div className="space-y-3">
               {messages.map((msg) => {
                 const isMine = msg.sender_username === currentUser.username;
                 const isEditing = editingId === msg.id;
                 return (
                   <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                       isMine 
                         ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
                         : 'bg-white border border-gray-200 text-gray-800'
                     }`}>
                       {isEditing ? (
                         <div className="flex gap-2 items-center">
                           <input
                             type="text"
                             value={editText}
                             onChange={(e) => setEditText(e.target.value)}
                             className="flex-1 text-sm bg-white/20 text-white placeholder-white/50 rounded px-2 py-1"
                             autoFocus
                           />
                           <button
                             onClick={() => editMessageMutation.mutate({ id: msg.id, content: editText })}
                             className="text-xs font-semibold hover:opacity-80"
                           >
                             Save
                           </button>
                           <button
                             onClick={() => { setEditingId(null); setEditText(''); }}
                             className="text-xs hover:opacity-80"
                           >
                             <X className="w-3 h-3" />
                           </button>
                         </div>
                       ) : (
                         <>
                           {msg.is_image && msg.image_url ? (
                             <div className="space-y-1">
                               <img
                                 src={msg.image_url}
                                 alt="Message image"
                                 onClick={() => setViewingImage(msg.image_url)}
                                 className="rounded-xl max-w-full max-h-60 object-cover cursor-pointer"
                               />
                               {msg.content && <p className="text-sm">{msg.content}</p>}
                             </div>
                           ) : (
                             <p className="text-sm">{msg.content}</p>
                           )}
                           <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                             <p className={`text-xs ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                               {format(new Date(msg.created_date), 'h:mm a')}
                             </p>
                             {isMine && (
                               msg.read ? (
                                 <CheckCheck className="w-3 h-3 text-white/70" />
                               ) : (
                                 <Check className="w-3 h-3 text-white/70" />
                               )
                             )}
                           </div>
                         </>
                       )}
                     </div>
                     {isMine && !isEditing && (
                       <div className="flex gap-1 ml-2 items-start pt-1">
                         <button
                           onClick={() => { setEditingId(msg.id); setEditText(msg.content); }}
                           className="p-1 hover:bg-gray-200 rounded text-gray-600"
                           title="Edit"
                         >
                           <Edit2 className="w-3 h-3" />
                         </button>
                         <button
                           onClick={async () => { if (await confirmAction('Delete message?')) deleteMessageMutation.mutate(msg.id); }}
                           className="p-1 hover:bg-gray-200 rounded text-gray-600"
                           title="Delete"
                         >
                           <Trash2 className="w-3 h-3" />
                         </button>
                       </div>
                     )}
                   </div>
                 );
               })}
               <div ref={messagesEndRef} />
             </div>
          )}
          </div>
          )}

          {/* Blocked banner */}
          {blockedUsernames.includes(selectedUser.username) && (
            <div className="p-4 bg-gray-100 border-t flex items-center justify-center gap-2 text-gray-500 text-sm font-medium">
              <Ban className="w-4 h-4" />
              You blocked this user · Unblock in conversation settings
            </div>
          )}

          {/* Input */}
          {canMessage && !blockedUsernames.includes(selectedUser.username) && (
           esimActive ? (
           <div className="p-4 bg-white border-t">
           {pendingImage && (
             <div className="mb-2 flex items-end gap-2">
               <div className="relative">
                 <img src={pendingImage} alt="Pending" className="w-20 h-20 object-cover rounded-lg border" />
                 <button
                   onClick={() => setPendingImage(null)}
                   className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg"
                 >
                   <X className="w-3.5 h-3.5" />
                 </button>
               </div>
               <p className="text-xs text-gray-500 mb-1">Image ready to send{messageText.trim() ? ' with caption' : ''}</p>
             </div>
           )}
           <div className="flex items-center gap-2">
           <input
             ref={fileInputRef}
             type="file"
             accept="image/*"
             onChange={handleImageSelect}
             className="hidden"
           />
           <Button
             onClick={() => fileInputRef.current?.click()}
             disabled={uploadingImage}
             variant="outline"
             size="icon"
             className="shrink-0"
             title="Send image"
           >
             {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
           </Button>
           <Input
             value={messageText}
             onChange={(e) => setMessageText(e.target.value)}
             placeholder={uploadingImage ? "Uploading..." : (pendingImage ? "Add a caption..." : "Type a message...")}
             onKeyPress={(e) => e.key === 'Enter' && !moderating && handleSend()}
             className="flex-1"
             disabled={uploadingImage}
           />
           <Button
             onClick={handleSend}
             disabled={(!messageText.trim() && !pendingImage) || uploadingImage || moderating}
             className="bg-gradient-to-r from-blue-500 to-purple-600"
             size="icon"
           >
             <Send className="w-4 h-4" />
           </Button>
           </div>
           </div>
           ) : (
           <button
             onClick={() => {
               sessionStorage.setItem('eos_settings_tab', 'network');
               onLaunchApp?.('settings');
             }}
             className="w-full p-4 bg-amber-50 border-t border-amber-200 flex items-center justify-center gap-2 text-amber-700 text-sm font-medium active:bg-amber-100 transition-colors"
           >
             <Signal className="w-4 h-4" />
             Please download or re-enable your eSIM
           </button>
           )
           )}

           {/* Conversation Settings Modal */}
           {showConversationSettings && (
             <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
               <div className="w-full bg-white rounded-t-3xl p-6 max-h-[70vh] overflow-auto">
                 <div className="flex items-center justify-between mb-6">
                   <h2 className="text-xl font-bold text-gray-800">Conversation Settings</h2>
                   <button onClick={() => setShowConversationSettings(false)} className="text-gray-400 hover:text-gray-600">
                     <X className="w-6 h-6" />
                   </button>
                 </div>

                 <div className="space-y-3">
                   <button
                     onClick={async () => {
                       setShowConversationSettings(false);
                       if (await confirmAction(`Delete all messages with ${selectedUser.username}?`)) {
                         messages.forEach(msg => deleteMessageMutation.mutate(msg.id));
                         toast.success('Conversation deleted');
                       }
                     }}
                     className="w-full flex items-center gap-3 p-4 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-200"
                   >
                     <Trash2 className="w-5 h-5 text-red-600" />
                     <div className="text-left">
                       <p className="font-medium text-red-600">Delete Conversation</p>
                       <p className="text-xs text-red-500">Remove all messages with this user</p>
                     </div>
                   </button>

                   {blockedUsernames.includes(selectedUser.username) ? (
                     <button
                       onClick={async () => {
                         setShowConversationSettings(false);
                         if (await confirmAction(`Unblock ${selectedUser.username}?`)) {
                           handleUnblockUser(selectedUser.username);
                         }
                       }}
                       className="w-full flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors border border-green-200"
                     >
                       <Ban className="w-5 h-5 text-green-600" />
                       <div className="text-left">
                         <p className="font-medium text-green-600">Unblock User</p>
                         <p className="text-xs text-green-500">Allow messages from this user again</p>
                       </div>
                     </button>
                   ) : (
                     <button
                       onClick={async () => {
                         setShowConversationSettings(false);
                         if (await confirmAction(`Block ${selectedUser.username}?`)) {
                           handleBlockUser(selectedUser.username);
                         }
                       }}
                       className="w-full flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors border border-orange-200"
                     >
                       <Flag className="w-5 h-5 text-orange-600" />
                       <div className="text-left">
                         <p className="font-medium text-orange-600">Block User</p>
                         <p className="text-xs text-orange-500">You won't see messages from this user</p>
                       </div>
                     </button>
                   )}
                 </div>
               </div>
             </div>
           )}

           {showProfilePopup && (
             <ProfilePopup user={selectedUser} onClose={() => setShowProfilePopup(false)} />
           )}

           {viewingImage && (
             <div
               className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center"
               onClick={() => setViewingImage(null)}
             >
               <button
                 onClick={() => setViewingImage(null)}
                 className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white"
               >
                 <X className="w-6 h-6" />
               </button>
               <img
                 src={viewingImage}
                 alt="Full size"
                 className="max-w-full max-h-full object-contain"
                 onClick={(e) => e.stopPropagation()}
               />
             </div>
           )}
           </div>
           );
           }

          if (chatRequests.length > 0 && isUnder13) {
          return (
          <div className="h-full flex flex-col bg-white">
          <div className={`p-4 bg-gradient-to-r ${accent} text-white`}>
          <h2 className="text-xl font-bold">Chat Requests</h2>
          <p className="text-xs opacity-80">You have {chatRequests.length} pending request{chatRequests.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-3">
          {chatRequests.map(req => {
           const requester = allUsers.find(u => u.username === req.requester_username);
           return (
             <div key={req.id} className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
               <div className="flex items-center gap-3 mb-3">
                 <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                   {req.requester_username?.[0]?.toUpperCase()}
                 </div>
                 <div>
                   <p className="font-medium text-gray-800 flex items-center gap-1">@{req.requester_username}{requester?.verified && <VerifiedBadge size={12} />}</p>
                   <p className="text-xs text-gray-500">{requester?.full_name || 'No name set'}</p>
                 </div>
               </div>
               <div className="flex gap-2">
                 <Button
                   onClick={() => respondChatRequestMutation.mutate({ id: req.id, status: 'accepted' })}
                   className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm"
                 >
                   Accept
                 </Button>
                 <Button
                   onClick={() => respondChatRequestMutation.mutate({ id: req.id, status: 'rejected' })}
                   variant="outline"
                   className="flex-1 text-sm"
                 >
                   Decline
                 </Button>
               </div>
             </div>
           );
          })}
          </div>

          <div className="p-4 border-t">
          <Button
           onClick={() => setSelectedUser(null)}
           variant="outline"
           className="w-full"
          >
           Back to Messages
          </Button>
          </div>
          </div>
          );
          }

          return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className={`p-4 bg-gradient-to-r ${accent} text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Messages</h2>
            <p className="text-xs opacity-80">Add contacts in the Contacts app to message them</p>
          </div>
          <button
            onClick={() => setShowNewGroup(true)}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            title="New Group"
          >
            <Users className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-auto">
        {/* Group Chats */}
        {myGroups.length > 0 && (
          <div className="p-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 mb-1">Group Chats</p>
            {myGroups.map(group => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white">
                  <Users className="w-6 h-6" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-gray-800 truncate">{group.name}</p>
                  <p className="text-sm text-gray-500 truncate">{(group.member_usernames || []).length} members</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {!isAdmin && (
          <button
            onClick={() => setSupportOpen(true)}
            className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 transition-colors border-b border-gray-100"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <Headphones className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-800">EggetSystem Support</p>
              <p className="text-xs text-gray-500">Tech support · No eSIM needed</p>
            </div>
          </button>
        )}
        {contacts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No contacts yet</p>
            <p className="text-xs">Add contacts in the Contacts app</p>
          </div>
        ) : (
          <div className="p-2">
            {contacts.map(contact => {
              const user = allUsers.find(u => u.username === contact.contact_username);
              const conv = conversations.find(c => c.username === contact.contact_username);
              return (
                <button
                  key={contact.id}
                  onClick={() => user && setSelectedUser(user)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors relative"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {contact.contact_username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-gray-800 flex items-center gap-1">@{contact.contact_username}{user?.verified && <VerifiedBadge size={12} />}</p>
                      {conv && (
                        <p className="text-xs text-gray-400">
                          {format(new Date(conv.lastMessageDate), 'h:mm a')}
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {conv ? conv.lastMessage : (user?.full_name || 'No messages yet')}
                    </p>
                  </div>
                  {conv?.unread && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full absolute right-3 top-1/2 -translate-y-1/2" />
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