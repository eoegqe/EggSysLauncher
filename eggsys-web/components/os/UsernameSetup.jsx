import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/devToast';
import { Check, X, User, Loader2 } from 'lucide-react';

export default function UsernameSetup({ user, onComplete }) {
  const [username, setUsername] = useState(user?.username || '');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);
  const queryClient = useQueryClient();

  const checkUsername = async (value) => {
    if (!value || value.length < 3) {
      setAvailable(null);
      return;
    }
    
    // Skip availability check - just validate format
    setAvailable(true);
  };

  const updateUsernameMutation = useMutation({
    mutationFn: (username) => base44.auth.updateMe({ username }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user-desktop'] });
      queryClient.invalidateQueries({ queryKey: ['current-user-mobile'] });
      toast.success(`Username set! Your profile URL is /@${username}`);
      if (onComplete) onComplete();
    },
    onError: () => {
      toast.error('Failed to set username');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username || username.length < 3) {
      toast.error('Username must be at least 3 characters');
      return;
    }
    if (available === false) {
      toast.error('Username is taken');
      return;
    }
    updateUsernameMutation.mutate(username);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-6 flex items-center justify-center">
          <User className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">
          Choose Your Username
        </h1>
        <p className="text-gray-600 text-center mb-6">
          This will be how others identify you in EggetSystem
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Username</Label>
            <div className="relative mt-1">
              <Input
                value={username}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                  setUsername(value);
                  if (value.length >= 3) {
                    checkUsername(value);
                  } else {
                    setAvailable(null);
                  }
                }}
                placeholder="e.g., johndoe123"
                className="pr-10"
                maxLength={20}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checking && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                {!checking && available === true && <Check className="w-4 h-4 text-green-600" />}
                {!checking && available === false && <X className="w-4 h-4 text-red-600" />}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              3-20 characters, letters, numbers, and underscores only
            </p>
            {available === false && (
              <p className="text-xs text-red-600 mt-1">Username is already taken</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            disabled={!username || username.length < 3 || available === false || checking || updateUsernameMutation.isPending}
          >
            {updateUsernameMutation.isPending ? 'Setting...' : 'Continue'}
          </Button>

          {user?.username && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => onComplete && onComplete()}
            >
              Skip for now
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}