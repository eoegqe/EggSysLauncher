import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, ShieldCheck, ArrowRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/components/AuthLayout';

// "Sign in with EggetSystem" redirect consent. An external site links here with
// ?redirect=<its callback URL>. The user is already logged in (RouteGuard), so
// we show what we'll send and bounce them back to the provider with username +
// name as query params. The provider pre-fills a signup and makes the user set a
// password — so no password or email ever leaves EggetSystem. No backend needed.
export default function EggetRedirectConsent({ redirect, service }) {
  const { data: me, isLoading } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const [redirecting, setRedirecting] = useState(false);

  // Validate + parse the destination for display (open-redirect guard: we only
  // follow http(s) URLs, and the user sees the hostname before approving).
  let dest = '';
  let valid = false;
  try {
    const u = new URL(redirect);
    // Allow http(s) for web callbacks and custom app schemes (e.g. myapp://)
    // for native mobile apps. Any non-empty, non-javascript scheme is accepted.
    const scheme = u.protocol.replace(':', '');
    valid = !!scheme && scheme !== 'javascript' && !!service;
    dest = u.hostname || (u.protocol + (u.slashes ? '//' : '') + u.pathname);
  } catch (_) { /* invalid */ }

  const approve = () => {
    const params = new URLSearchParams();
    if (me?.data?.username) params.set('username', me.data.username);
    if (me?.full_name) params.set('name', me.full_name);
    const sep = redirect.includes('?') ? '&' : '?';
    setRedirecting(true);
    window.location.href = redirect + sep + params.toString();
  };

  if (isLoading) {
    return (
      <AuthLayout icon={ShieldCheck} title="Sign in with EggetSystem">
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
          Loading…
        </div>
      </AuthLayout>
    );
  }

  if (!valid) {
    return (
      <AuthLayout icon={AlertTriangle} title="Invalid sign-in link">
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          The sign-in link is missing a required service name. Go back to the service and try again.
        </div>
      </AuthLayout>
    );
  }

  const display = service;

  return (
    <AuthLayout
      icon={ShieldCheck}
      title="Sign in with EggetSystem"
      subtitle={`${display} wants to sign you in with your EggetSystem account`}
    >
      <div className="rounded-lg border p-4 mb-4 space-y-2">
        <p className="text-sm font-medium text-foreground">What we'll send to {display}:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Username: <span className="font-medium text-foreground">{me?.data?.username || '—'}</span></li>
          <li>• Name: <span className="font-medium text-foreground">{me?.full_name || '—'}</span></li>
        </ul>
        <p className="text-xs text-muted-foreground pt-2 border-t">
          Your email and password stay here. {dest} will ask you to set a new password to finish creating your account there.
        </p>
      </div>

      <Button className="w-full h-12 font-medium" onClick={approve} disabled={redirecting}>
        {redirecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Continue to {dest} <ArrowRight className="w-4 h-4" />
      </Button>
    </AuthLayout>
  );
}