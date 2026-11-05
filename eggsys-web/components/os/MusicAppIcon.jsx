import React from 'react';
import { Music } from 'lucide-react';
import SpotifyIcon from '@/components/os/SpotifyIcon';
import { useMusicAppMeta, isPoweredBySpotify } from '@/lib/musicAppMeta';

// Icon slot for the built-in music app: the EggetSystem Music Player tile by
// default, or the Spotify logo once Spotify is powered on (see musicAppMeta).
export default function MusicAppIcon({ className = 'w-14 h-14' }) {
  const meta = useMusicAppMeta();

  if (isPoweredBySpotify()) {
    return <SpotifyIcon className={className} />;
  }

  return (
    <div className={`${className} rounded-2xl bg-gradient-to-br ${meta.color} flex items-center justify-center shadow-lg`}>
      <Music className="w-1/2 h-1/2 text-white" />
    </div>
  );
}