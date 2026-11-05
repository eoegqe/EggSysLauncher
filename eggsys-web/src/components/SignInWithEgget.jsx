import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { KeyRound, Copy, Check, Plus, Trash2, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthLayout from '@/components/AuthLayout';

// Generate a random opaque key: egg_ + 24 random bytes as hex.
function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return 'egg_' + hex;
}

// "Sign in with EggetSystem" key manager. A logged-in user generates an access
// key, copies it, and pastes it into an external service to connect their
// EggetSystem account. Keys are tied to the owner via RLS.
export default function SignInWithEgget() {
  const qc = useQueryClient();
  const [label, setLabel] = useState('');
  const [justCreated, setJustCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: tokens = [], isLoading } = useQuery({
    queryKey: ['access-tokens'],
    queryFn: () => base44.entities.AccessToken.filter({}, '-created_date'),
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.AccessToken.create(data),
    onSuccess: (rec) => {
      setJustCreated(rec);
      setCopied(false);
      setLabel('');
      qc.invalidateQueries({ queryKey: ['access-tokens'] });
    },
  });

  const revokeMut = useMutation({
    mutationFn: (id) => base44.entities.AccessToken.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['access-tokens'] }),
  });

  const handleCreate = () => {
    createMut.mutate({
      token: randomToken(),
      owner_email: me?.email || '',
      owner_username: me?.data?.username || '',
      label: label.trim() || 'External service',
    });
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) { /* clipboard may be blocked; user can still select */ }
  };

  return (
    <AuthLayout
      icon={KeyRound}
      title="Sign in with EggetSystem"
      subtitle="Generate a key, then paste it into the external service to connect your EggetSystem account"
    >
      {justCreated ? (
        <div className="mb-6">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm text-green-700 dark:text-green-400 mb-3">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Key created. Copy it now and paste it into your service — it won't be shown in full again.</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg bg-muted border text-xs break-all select-all">{justCreated.token}</code>
            <Button size="icon" variant="outline" onClick={() => copy(justCreated.token)} aria-label="Copy key">
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <Button variant="ghost" className="mt-3" onClick={() => setJustCreated(null)}>Done</Button>
        </div>
      ) : (
        <div className="mb-6">
          <label className="text-sm font-medium mb-1 block">Service name (optional)</label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. My Discord bot"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            />
            <Button onClick={handleCreate} disabled={createMut.isPending}>
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Generate
            </Button>
          </div>
          {createMut.isError && (
            <p className="text-sm text-destructive mt-2">Couldn't create the key. Please try again.</p>
          )}
        </div>
      )}

      <p className="text-sm font-medium mb-2">Your keys</p>
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : tokens.length === 0 ? (
        <p className="text-sm text-muted-foreground">No keys yet. Generate one above to connect a service.</p>
      ) : (
        <ul className="space-y-2">
          {tokens.map((t) => (
            <li key={t.id} className="flex items-center gap-3 p-3 rounded-lg border">
              <KeyRound className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{t.label || 'External service'}</p>
                <p className="text-xs text-muted-foreground font-mono">egg_••••{t.token?.slice(-4)}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => revokeMut.mutate(t.id)}
                disabled={revokeMut.isPending}
                aria-label="Revoke key"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </AuthLayout>
  );
}