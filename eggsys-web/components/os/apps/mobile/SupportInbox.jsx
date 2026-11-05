import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Headphones, ArrowLeft, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/lib/devToast';
import { confirmAction } from '@/components/os/ConfirmDialog';
import SupportChat from './SupportChat';

export default function SupportInbox({ currentUser, onBack }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);

  const { data: allMessages = [] } = useQuery({
    queryKey: ['support-inbox'],
    queryFn: () => base44.entities.SupportMessage.list('-created_date'),
    refetchInterval: 60000
  });

  // The inbox stays live through a subscription instead of a three-second poll.
  useEffect(() => {
    const unsub = base44.entities.SupportMessage.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['support-inbox'] });
    });
    return unsub;
  }, [queryClient]);

  const deleteConversationMutation = useMutation({
    mutationFn: async (email) => {
      const msgs = await base44.entities.SupportMessage.filter({ user_email: email });
      await Promise.all(msgs.map((m) => base44.entities.SupportMessage.delete(m.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-inbox'] });
      toast.success('Conversation deleted');
    },
    onError: (e) => toast.error('Failed to delete: ' + (e.message || 'Unknown error'))
  });

  const handleDeleteConversation = async (e, email, username) => {
    e.stopPropagation();
    if (!await confirmAction(`Delete the conversation with ${username ? '@' + username : email}? All messages will be permanently removed.`)) return;
    deleteConversationMutation.mutate(email);
  };

  if (selected) {
    return (
      <SupportChat
        conversationEmail={selected.email}
        conversationUsername={selected.username}
        isSupport={true}
        currentUser={currentUser}
        onBack={() => setSelected(null)}
      />
    );
  }

  const convMap = {};
  allMessages.forEach(m => {
    const e = m.user_email;
    if (!convMap[e] || new Date(m.created_date) > new Date(convMap[e].lastDate)) {
      convMap[e] = {
        email: e,
        username: m.user_username,
        lastMessage: m.content,
        lastDate: m.created_date,
        unread: !m.read && m.from_support === false
      };
    }
  });
  const conversations = Object.values(convMap).sort(
    (a, b) => new Date(b.lastDate) - new Date(a.lastDate)
  );

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
        {onBack && (
          <button onClick={onBack} className="p-1 hover:bg-white/20 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <Headphones className="w-5 h-5" />
        <div>
          <h2 className="text-xl font-bold">Support Inbox</h2>
          <p className="text-xs opacity-80">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {conversations.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Headphones className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No support messages yet</p>
            <p className="text-xs">User appeals and questions appear here</p>
          </div>
        ) : (
          <div className="p-2">
            {conversations.map(c => (
              <div
                key={c.email}
                onClick={() => setSelected(c)}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors relative text-left cursor-pointer"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold shrink-0">
                  {(c.username || c.email)?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-gray-800 truncate">
                      {c.username ? `@${c.username}` : c.email}
                    </p>
                    <p className="text-xs text-gray-400 shrink-0">
                      {format(new Date(c.lastDate), 'h:mm a')}
                    </p>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{c.lastMessage}</p>
                </div>
                {c.unread && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full absolute right-12 top-1/2 -translate-y-1/2" />
                )}
                <button
                  onClick={(e) => handleDeleteConversation(e, c.email, c.username)}
                  disabled={deleteConversationMutation.isPending}
                  className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                  title="Delete conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}