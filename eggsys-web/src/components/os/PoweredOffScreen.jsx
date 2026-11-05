import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

export default function PoweredOffScreen() {
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['current-user-powered-off'],
    queryFn: () => base44.auth.me(),
    retry: false,
    staleTime: Infinity
  });

  useEffect(() => {
    const handleAnyKey = () => {
      const isOwner = user?.role === 'owner';
      if (isOwner) {
        navigate(createPageUrl('SelectOS'));
      } else {
        navigate(createPageUrl('StartupTerminal'));
      }
    };

    window.addEventListener('keydown', handleAnyKey);
    window.addEventListener('click', handleAnyKey);
    window.addEventListener('touchstart', handleAnyKey);

    return () => {
      window.removeEventListener('keydown', handleAnyKey);
      window.removeEventListener('click', handleAnyKey);
      window.removeEventListener('touchstart', handleAnyKey);
    };
  }, [navigate, user?.role]);

  return (
    <div className="w-screen h-screen bg-black cursor-none flex flex-col items-center justify-center">
      {user?.role === 'owner' && (
        <button
          onClick={() => navigate(createPageUrl('SelectOS'))}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Bypass (Owner Only)
        </button>
      )}
    </div>
  );
}