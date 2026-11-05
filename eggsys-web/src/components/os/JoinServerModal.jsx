import React, { useState } from 'react';
import { X, Loader2, LogIn, Server } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from '@/lib/devToast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function JoinServerModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['current-user'], queryFn: () => base44.auth.me() });
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

  if (!isOpen) return null;

  const handleJoin = async () => {
    const c = code.trim().toUpperCase();
    if (!c) {
      toast.error('Enter an invite code');
      return;
    }
    setJoining(true);
    try {
      const found = await base44.entities.Server.filter({ invite_code: c });
      if (!found.length) {
        toast.error('No server found with that invite code');
        setJoining(false);
        return;
      }
      const server = found[0];

      // Check existing membership (read returns only the current user's own records)
      const existing = await base44.entities.ServerMember.filter({ server_id: server.id });
      const mine = existing.find(m => m.member_email === user?.email);
      if (mine) {
        toast.info(`You are already a member of ${server.name}`);
        setCode('');
        onClose();
        return;
      }

      await base44.entities.ServerMember.create({
        server_id: server.id,
        server_name: server.name,
        owner_email: server.owner_email,
        member_email: user.email,
        member_username: user.username,
        role: 'member'
      });
      toast.success(`Joined ${server.name}!`);
      queryClient.invalidateQueries({ queryKey: ['server-members'] });
      queryClient.invalidateQueries({ queryKey: ['my-servers'] });
      setCode('');
      onClose();
    } catch (e) {
      toast.error('Failed to join server: ' + (e.message || 'Unknown error'));
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100001] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 border border-green-400/30 rounded-2xl shadow-2xl overflow-hidden font-mono">
        <div className="flex items-center justify-between px-5 py-4 border-b border-green-400/20 bg-green-400/5">
          <div className="flex items-center gap-2 text-green-400">
            <Server className="w-5 h-5" />
            <h2 className="text-lg font-bold">Join custom server?</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-400">
            Enter the invite code for the server you'd like to join.
          </p>
          <div>
            <label className="block text-xs text-green-400/70 mb-1.5 tracking-wider uppercase">Invite Code</label>
            <Input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter' && !joining) handleJoin(); }}
              placeholder="e.g. AB12CD"
              className="bg-black/60 border-green-400/30 text-green-400 placeholder-green-400/30 font-mono tracking-widest text-lg"
              autoFocus
              spellCheck={false}
              disabled={joining}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleJoin}
              disabled={joining}
              className="flex-1 bg-green-500 hover:bg-green-600 text-black font-semibold"
            >
              {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {joining ? 'Joining...' : 'Join Server'}
            </Button>
            <Button onClick={onClose} variant="outline" className="border-green-400/30 text-green-400 hover:bg-green-400/10">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}