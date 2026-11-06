import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { sendOneSignalNotification } from '@/lib/oneSignalNotify';
import { toast } from '@/lib/devToast';
import { Mail, Send, Star, Trash2, Inbox, ChevronLeft, Plus, RefreshCw, Reply, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import EggSysWord from '@/components/os/EggSysWord';
import { useEggSysOSDisabled } from '@/hooks/useEggSysOSDisabled';
import EggSysOSFailure from '@/components/os/EggSysOSFailure';
import { useIsTablet } from '@/hooks/useIsTablet';
import MailTabletLayout from './mobile/MailTabletLayout';

const FOLDERS = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'trash', label: 'Trash', icon: Trash2 },
];

export default function EggMailApp() {
  const queryClient = useQueryClient();
  const [folder, setFolder] = useState('inbox');
  const [selectedMail, setSelectedMail] = useState(null);
  const [composing, setComposing] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [search, setSearch] = useState('');
  const [compose, setCompose] = useState({ to: '', subject: '', body: '' });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity,
  });

  const { data: eAccounts = [] } = useQuery({
    queryKey: ['eaccount', user?.email],
    queryFn: () => base44.entities.EAccount.filter({ owner_email: user?.email }),
    enabled: !!user?.email,
  });
  const eAccount = eAccounts[0] || null;
  const myAddress = eAccount?.username ? `${eAccount.username}@EggSys.com` : null;
  const eggSysOSDisabled = useEggSysOSDisabled();
  const isTablet = useIsTablet();

  const notifiedMailIds = useRef(new Set());
  const baselineSet = useRef(false);

  const { data: allMails = [], isLoading, refetch } = useQuery({
    queryKey: ['eggmail', eAccount?.username],
    queryFn: () => base44.entities.EggMail.list('-created_date', 200),
    enabled: !!eAccount?.username,
    refetchInterval: 15000,
  });

  // Detect new unread inbox mail: fire push, create an in-app Notification,
  // and send a descriptive email to the recipient's E-Account address.
  useEffect(() => {
    if (!eAccount?.username || allMails.length === 0) return;
    const incoming = allMails.filter(m => m.to_username === eAccount.username && !m.read && m.folder !== 'trash');
    // First load: establish baseline without notifying for already-present mail
    if (!baselineSet.current) {
      baselineSet.current = true;
      incoming.forEach(m => notifiedMailIds.current.add(m.id));
      return;
    }
    const newMails = incoming.filter(m => !notifiedMailIds.current.has(m.id));
    newMails.forEach(mail => {
      notifiedMailIds.current.add(mail.id);
      const title = `New EggMail from ${mail.from_address}`;
      sendOneSignalNotification(title, mail.subject);
      base44.entities.Notification.create({
        title,
        message: mail.subject,
        recipient_username: eAccount.username,
        type: 'message',
        read: false,
      }).catch(() => {});
    });
  }, [allMails, eAccount?.username]);

  const inbox = allMails.filter(m => m.to_username === eAccount?.username && m.folder !== 'trash');
  const sent = allMails.filter(m => m.from_username === eAccount?.username && m.folder !== 'trash');
  const trash = allMails.filter(m => (m.to_username === eAccount?.username || m.from_username === eAccount?.username) && m.folder === 'trash');
  const starred = allMails.filter(m => m.starred && (m.to_username === eAccount?.username || m.from_username === eAccount?.username) && m.folder !== 'trash');
  const folderMap = { inbox, sent, trash, starred };

  const currentMails = (folderMap[folder] || []).filter(m =>
    !search || m.subject?.toLowerCase().includes(search.toLowerCase()) ||
    m.from_address?.toLowerCase().includes(search.toLowerCase()) ||
    m.to_address?.toLowerCase().includes(search.toLowerCase()) ||
    m.body?.toLowerCase().includes(search.toLowerCase())
  );

  const unreadCount = inbox.filter(m => !m.read).length;

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      const toUsername = data.to.replace(/@EggSys\.com$/i, '').trim();
      const recipients = await base44.entities.EAccount.filter({ username: toUsername });
      if (recipients.length === 0) throw new Error(`No EggSys account found for ${data.to}`);
      const recipient = recipients[0];
      const threadId = replyTo?.thread_id || replyTo?.id || crypto.randomUUID();
      await base44.entities.EggMail.create({
        from_address: myAddress,
        from_username: eAccount.username,
        to_address: `${recipient.username}@EggSys.com`,
        to_username: recipient.username,
        subject: data.subject,
        body: data.body,
        folder: 'inbox',
        thread_id: threadId,
        reply_to_id: replyTo?.id || null,
      });
    },
    onSuccess: () => {
      toast.success('Mail sent!');
      setComposing(false);
      setReplyTo(null);
      setCompose({ to: '', subject: '', body: '' });
      queryClient.invalidateQueries({ queryKey: ['eggmail', eAccount?.username] });
    },
    onError: (e) => toast.error(e.message || 'Failed to send'),
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.EggMail.update(id, { read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['eggmail', eAccount?.username] }),
  });

  const toggleStarMutation = useMutation({
    mutationFn: ({ id, starred }) => base44.entities.EggMail.update(id, { starred }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['eggmail', eAccount?.username] }),
  });

  const trashMutation = useMutation({
    mutationFn: (id) => base44.entities.EggMail.update(id, { folder: 'trash' }),
    onSuccess: () => { setSelectedMail(null); queryClient.invalidateQueries({ queryKey: ['eggmail', eAccount?.username] }); toast.success('Moved to trash'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EggMail.delete(id),
    onSuccess: () => { setSelectedMail(null); queryClient.invalidateQueries({ queryKey: ['eggmail', eAccount?.username] }); toast.success('Deleted permanently'); },
  });

  const openMail = (mail) => {
    setSelectedMail(mail);
    if (!mail.read && mail.to_username === eAccount?.username) markReadMutation.mutate(mail.id);
  };

  const startReply = (mail) => {
    setReplyTo(mail);
    setCompose({
      to: mail.from_address,
      subject: mail.subject.startsWith('Re:') ? mail.subject : `Re: ${mail.subject}`,
      body: `\n\n--- Original message from ${mail.from_address} ---\n${mail.body}`,
    });
    setComposing(true);
    setSelectedMail(null);
  };

  // EggSys OS disabled — EggMail cannot load
  if (eggSysOSDisabled) {
    return <EggSysOSFailure title="EggMail" />;
  }

  // No EAccount
  if (!eAccount) {
    return (
      <div className="h-full flex items-center justify-center bg-white p-8">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">EggMail</h2>
          <p className="text-gray-500 text-sm mb-1">You need an E Account to use EggMail.</p>
          <p className="text-gray-400 text-xs">Go to Settings → <EggSysWord /> Account to create or link one.</p>
        </div>
      </div>
    );
  }

  // ── TABLET (three-pane: folders | list | reading/compose) ─────────────────
  if (isTablet) {
    return (
      <MailTabletLayout
        eAccount={eAccount}
        myAddress={myAddress}
        folder={folder}
        setFolder={setFolder}
        currentMails={currentMails}
        isLoading={isLoading}
        refetch={refetch}
        search={search}
        setSearch={setSearch}
        selectedMail={selectedMail}
        setSelectedMail={setSelectedMail}
        openMail={openMail}
        composing={composing}
        setComposing={setComposing}
        compose={compose}
        setCompose={setCompose}
        sendMutation={sendMutation}
        replyTo={replyTo}
        setReplyTo={setReplyTo}
        startReply={startReply}
        toggleStarMutation={toggleStarMutation}
        trashMutation={trashMutation}
        deleteMutation={deleteMutation}
        unreadCount={unreadCount}
      />
    );
  }

  // ── COMPOSE ──────────────────────────────────────────────────────────────
  if (composing) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <button onClick={() => { setComposing(false); setReplyTo(null); }} className="text-gray-400 active:text-gray-700 p-1 -ml-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="font-semibold text-gray-800 flex-1">{replyTo ? 'Reply' : 'New Mail'}</h2>
          <Button
            onClick={() => sendMutation.mutate(compose)}
            disabled={sendMutation.isPending || !compose.to || !compose.subject || !compose.body}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="ml-1 hidden sm:inline">Send</span>
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">To</label>
            <Input placeholder="username@EggSys.com" value={compose.to} onChange={e => setCompose(p => ({ ...p, to: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Subject</label>
            <Input placeholder="Subject" value={compose.subject} onChange={e => setCompose(p => ({ ...p, subject: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Message</label>
            <textarea
              className="w-full h-48 p-3 border rounded-md text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="Write your message..."
              value={compose.body}
              onChange={e => setCompose(p => ({ ...p, body: e.target.value }))}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── MAIL DETAIL ───────────────────────────────────────────────────────────
  if (selectedMail) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <button onClick={() => setSelectedMail(null)} className="text-gray-400 active:text-gray-700 p-1 -ml-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="font-semibold text-gray-800 flex-1 truncate text-sm">{selectedMail.subject}</h2>
          <button
            onClick={() => toggleStarMutation.mutate({ id: selectedMail.id, starred: !selectedMail.starred })}
            className={`p-2 rounded-lg active:bg-gray-100 ${selectedMail.starred ? 'text-yellow-500' : 'text-gray-300'}`}
          >
            <Star className="w-5 h-5" fill={selectedMail.starred ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => folder === 'trash' ? deleteMutation.mutate(selectedMail.id) : trashMutation.mutate(selectedMail.id)}
            className="p-2 rounded-lg active:bg-gray-100 text-gray-400"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="mb-4 space-y-0.5">
            <p className="text-xs text-gray-500">From: <span className="font-semibold text-gray-700">{selectedMail.from_address}</span></p>
            <p className="text-xs text-gray-500">To: <span className="font-semibold text-gray-700">{selectedMail.to_address}</span></p>
            <p className="text-xs text-gray-400">{selectedMail.created_date ? format(new Date(selectedMail.created_date), 'MMM d, yyyy · h:mm a') : ''}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 whitespace-pre-wrap text-gray-800 text-sm leading-relaxed">
            {selectedMail.body}
          </div>
        </div>
        {selectedMail.to_username === eAccount?.username && (
          <div className="p-4 border-t">
            <Button variant="outline" onClick={() => startReply(selectedMail)} className="w-full gap-2">
              <Reply className="w-4 h-4" /> Reply
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ── MAIL LIST + BOTTOM TAB NAV ────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Mail className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-bold text-gray-800 text-sm">EggMail</span>
          <p className="text-xs text-gray-400 truncate">{myAddress}</p>
        </div>
        <button onClick={() => refetch()} className="p-2 text-gray-400 active:text-gray-700 rounded-lg active:bg-gray-100">
          <RefreshCw className="w-4 h-4" />
        </button>
        <Button
          onClick={() => { setComposing(true); setReplyTo(null); setCompose({ to: '', subject: '', body: '' }); }}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 h-8 px-3"
        >
          <Plus className="w-4 h-4" />
          <span className="ml-1 hidden sm:inline text-xs">Compose</span>
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-2">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          className="flex-1 text-sm outline-none placeholder-gray-400 bg-transparent"
          placeholder={`Search ${folder}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button onClick={() => setSearch('')} className="text-gray-400 text-xs">Clear</button>}
      </div>

      {/* Mail List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : currentMails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Mail className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">No mail here</p>
          </div>
        ) : (
          <div className="divide-y bg-white">
            {currentMails.map(mail => {
              const isUnread = !mail.read && mail.to_username === eAccount?.username;
              return (
                <div
                  key={mail.id}
                  onClick={() => openMail(mail)}
                  className={`flex items-start gap-3 px-4 py-3 active:bg-blue-50 cursor-pointer transition-colors ${isUnread ? 'bg-blue-50/50' : ''}`}
                >
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${isUnread ? 'bg-blue-500' : 'bg-transparent'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {folder === 'sent' ? mail.to_address : mail.from_address}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {mail.created_date ? format(new Date(mail.created_date), 'MMM d') : ''}
                      </span>
                    </div>
                    <p className={`text-xs truncate ${isUnread ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{mail.subject}</p>
                    <p className="text-xs text-gray-400 truncate">{mail.body?.split('\n')[0]}</p>
                  </div>
                  {mail.starred && <Star className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-1" fill="currentColor" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Tab Bar */}
      <div className="bg-white border-t flex">
        {FOLDERS.map(f => {
          const Icon = f.icon;
          const isActive = folder === f.id;
          const count = f.id === 'inbox' ? unreadCount : 0;
          return (
            <button
              key={f.id}
              onClick={() => { setFolder(f.id); setSelectedMail(null); setSearch(''); }}
              className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 transition-colors relative ${isActive ? 'text-blue-600' : 'text-gray-400'}`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {count}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{f.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}