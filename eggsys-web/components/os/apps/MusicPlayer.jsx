import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Crown, Music, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/devToast';
import {
  beginLogin,
  isConfigured,
  isLoggedIn,
  logout,
  getValidToken,
  getMe,
  getMyPlaylists,
  getPlaylist,
  syncTokensFromServer,
} from '@/lib/spotifyAuth';
import { SpotifyPlayer } from '@/lib/spotifyPlayer';
import { Mp3Player } from '@/lib/mp3Player';
import { musicController } from '@/lib/musicController';
import ExpandedPlayer from './ExpandedPlayer';
import SpotifyIcon from '@/components/os/SpotifyIcon';
import BottomNav from './music/BottomNav';
import MiniPlayer from './music/MiniPlayer';
import LibraryTab from './music/LibraryTab';
import HomeTab from './music/HomeTab';
import SearchTab from './music/SearchTab';
import PlaylistDetail from './music/PlaylistDetail';
import Mp3Tab from './music/Mp3Tab';

// The first Home recommendation is always this playlist.
const FNAF_ID = '0gumksoXLgx9L2zlx9IdgA';

export default function MusicPlayer() {
  const [authed, setAuthed] = useState(() => isLoggedIn());
  const [hydrating, setHydrating] = useState(() => !isLoggedIn());

  const { data: currentUser } = useQuery({
    queryKey: ['spotify-auth-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 60000,
  });

  // Hydrate Spotify tokens from the synced EggetSystem account (cross-device).
  useEffect(() => {
    let cancelled = false;
    if (isLoggedIn()) return;
    syncTokensFromServer().then((ok) => {
      if (cancelled) return;
      if (ok) setAuthed(true);
      setHydrating(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Pick up popup auth-completion messages.
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'spotify-auth-complete') setAuthed(true);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const [profile, setProfile] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [fnaf, setFnaf] = useState(null);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);

  const [playerReady, setPlayerReady] = useState(false);
  const [remoteMode, setRemoteMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [premiumRequired, setPremiumRequired] = useState(false);
  const [error, setError] = useState(null);

  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expanded, setExpanded] = useState(() => musicController.getState().expanded);

  const [activeTab, setActiveTab] = useState('home');
  const [selected, setSelected] = useState(null);

  // Local MP3 playback (persisted to the MP3 entity)
  const [mp3Tracks, setMp3Tracks] = useState([]);
  const [mp3Loading, setMp3Loading] = useState(true);
  const [mp3Uploading, setMp3Uploading] = useState(false);
  const [mp3Active, setMp3Active] = useState(false);
  const [showMp3Shell, setShowMp3Shell] = useState(false);

  const playerRef = useRef(null);
  const spotifyPlayerRef = useRef(null);
  const mp3PlayerRef = useRef(null);

  // Shared handler for player state events — works for both Spotify and MP3.
  const handlePlayerState = (state) => {
    if (!state) {
      setIsPlaying(false);
      musicController.setState({ isPlaying: false, currentTrack: null });
      return;
    }
    setIsPlaying(!state.paused);
    const track = state.track_window?.current_track || null;
    if (track) setCurrentTrack(track);
    setShuffle(!!state.shuffle);
    setRepeatMode(state.repeat_mode ?? 0);
    setPosition(state.position || 0);
    setDuration(state.duration || 0);
    musicController.setState({ isPlaying: !state.paused, currentTrack: track });
  };

  useEffect(() => musicController.subscribe((s) => setExpanded(s.expanded)), []);

  // Initialize the Web Playback SDK + load profile/playlists once signed in.
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;

    const initPlayer = async () => {
      try {
        const player = new SpotifyPlayer(getValidToken);
        playerRef.current = player;
        player.on('ready', () => { if (!cancelled) { setPlayerReady(true); musicController.setState({ playerReady: true }); } });
        player.on('not_ready', () => { setPlayerReady(false); musicController.setState({ playerReady: false }); });
        player.on('state', (state) => {
          if (cancelled) return;
          // Spotify took over playback — make sure controls target it.
          setMp3Active(false);
          playerRef.current = spotifyPlayerRef.current;
          musicController.registerPlayer(spotifyPlayerRef.current);
          handlePlayerState(state);
        });
        player.on('premium_required', (msg) => {
          setPremiumRequired(true);
          setError(msg || 'Spotify Premium is required for in-app playback.');
        });
        player.on('remote_mode', () => {
          if (cancelled) return;
          setRemoteMode(true);
          setPlayerReady(true);
          musicController.setState({ playerReady: true });
        });
        player.on('error', (e) => console.error('Spotify player error:', e));
        await player.init();
        spotifyPlayerRef.current = player;
        musicController.registerPlayer(player);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to start the Spotify player.');
      }
    };

    const loadData = async () => {
      setLoadingPlaylists(true);
      try {
        const [me, pls] = await Promise.all([getMe(), getMyPlaylists()]);
        if (cancelled) return;
        setProfile(me);
        setPlaylists(pls);
      } catch (e) {
        if (cancelled) return;
        setError(e.message || 'Failed to load your Spotify library.');
      } finally {
        if (!cancelled) setLoadingPlaylists(false);
      }
      // FNaF Songs is always the first Home recommendation.
      try {
        const pl = await getPlaylist(FNAF_ID);
        if (!cancelled) setFnaf(pl);
      } catch (e) { /* non-fatal */ }
    };

    initPlayer();
    loadData();

    return () => {
      cancelled = true;
      musicController.unregisterPlayer();
      if (spotifyPlayerRef.current) {
        spotifyPlayerRef.current.disconnect();
        spotifyPlayerRef.current = null;
      }
    };
  }, [authed]);

  // Initialize the local MP3 player once. It shares the same state-handling path
  // as Spotify so the mini player, expanded player, and Control Center all work.
  useEffect(() => {
    const mp3 = new Mp3Player();
    mp3PlayerRef.current = mp3;
    mp3.on('state', (state) => {
      handlePlayerState(state);
    });
    mp3.on('ready', () => {
      setPlayerReady(true);
      musicController.setState({ playerReady: true });
    });
    return () => {
      mp3.disconnect();
      mp3PlayerRef.current = null;
    };
  }, []);

  // Load persisted MP3 tracks from the database.
  useEffect(() => {
    let cancelled = false;
    base44.entities.MP3.list('-created_date')
      .then((records) => { if (!cancelled) setMp3Tracks(records); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setMp3Loading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { musicController.setState({ authed }); }, [authed]);

  // Poll player position for a smooth progress bar + remote-mode state sync.
  useEffect(() => {
    if (!authed || !playerReady) return;
    const id = setInterval(async () => {
      const st = await playerRef.current?.getCurrentState();
      if (st) {
        setPosition(st.position || 0);
        setDuration(st.duration || 0);
        if (remoteMode) {
          setIsPlaying(!st.paused);
          const track = st.track_window?.current_track || null;
          if (track) setCurrentTrack(track);
          setShuffle(!!st.shuffle);
          setRepeatMode(st.repeat_mode ?? 0);
          musicController.setState({ isPlaying: !st.paused, currentTrack: track });
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [authed, playerReady, remoteMode]);

  const playTrack = async (track) => {
    if (!spotifyPlayerRef.current) return;
    playerRef.current = spotifyPlayerRef.current;
    musicController.registerPlayer(spotifyPlayerRef.current);
    setMp3Active(false);
    try {
      await playerRef.current.playTracks([track.uri]);
      toast.success(`Playing ${track.name}`);
    } catch (e) {
      setError(e.message || 'Playback failed.');
      if (!remoteMode) setPremiumRequired(true);
    }
  };

  const playPlaylist = async (pl, tracks) => {
    if (!spotifyPlayerRef.current) return;
    playerRef.current = spotifyPlayerRef.current;
    musicController.registerPlayer(spotifyPlayerRef.current);
    setMp3Active(false);
    try {
      if (pl.isLiked) {
        const uris = (tracks || []).map((t) => t.uri).filter(Boolean);
        if (!uris.length) { toast.error('No tracks to play'); return; }
        await playerRef.current.playTracks(uris);
      } else {
        await playerRef.current.playContext(pl.uri);
      }
      toast.success(`Playing ${pl.name}`);
    } catch (e) {
      setError(e.message || 'Playback failed.');
      if (!remoteMode) setPremiumRequired(true);
    }
  };

  const playTrackInContext = async (pl, track) => {
    if (!spotifyPlayerRef.current) return;
    playerRef.current = spotifyPlayerRef.current;
    musicController.registerPlayer(spotifyPlayerRef.current);
    setMp3Active(false);
    try {
      if (pl.isLiked) await playerRef.current.playTracks([track.uri]);
      else await playerRef.current.playTrackInContext(pl.uri, track.uri);
    } catch (e) {
      setError(e.message || 'Playback failed.');
      if (!remoteMode) setPremiumRequired(true);
    }
  };

  // --- Local MP3 playback (backed by the MP3 entity) ---
  const addMp3Files = async (files) => {
    if (!files.length) return;
    setMp3Uploading(true);
    const created = [];
    try {
      for (const file of files) {
        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          const rec = await base44.entities.MP3.create({
            name: file.name,
            file_url,
            size: file.size,
          });
          created.push(rec);
        } catch (e) {
          console.error('MP3 save failed for', file.name, e);
          toast.error(`Failed to save ${file.name}: ${e?.message || String(e)}`);
        }
      }
      if (created.length) setMp3Tracks((prev) => [...created, ...prev]);
    } finally {
      setMp3Uploading(false);
    }
  };

  const removeMp3Track = (index) => {
    const track = mp3Tracks[index];
    if (!track) return;
    // Stop playback if the removed track is currently playing.
    if (mp3Active && currentTrack?.id === track.id) {
      mp3PlayerRef.current?.disconnect();
      musicController.setState({ isPlaying: false, currentTrack: null });
      setMp3Active(false);
    }
    setMp3Tracks((prev) => prev.filter((_, i) => i !== index));
    base44.entities.MP3.delete(track.id).catch(() => {});
  };

  const playMp3Track = (index) => {
    if (!mp3PlayerRef.current || !mp3Tracks.length) return;
    setMp3Active(true);
    playerRef.current = mp3PlayerRef.current;
    musicController.registerPlayer(mp3PlayerRef.current);
    mp3PlayerRef.current.playQueue(mp3Tracks, index);
    setActiveTab('mp3');
  };

  const cycleRepeat = () => {
    const next = repeatMode === 0 ? 'context' : repeatMode === 1 ? 'track' : 'off';
    playerRef.current?.setRepeat(next);
  };

  const handleSignIn = () => {
    if (!isConfigured()) {
      toast.error('Spotify Client ID not set. See the setup note in Spotify.');
      return;
    }
    beginLogin(window.location.pathname, currentUser?.email);
  };

  const handleSignOut = () => {
    if (playerRef.current) {
      playerRef.current.disconnect();
      playerRef.current = null;
    }
    logout();
    setAuthed(false);
    setProfile(null);
    setPlaylists([]);
    setFnaf(null);
    setSelected(null);
    setPlayerReady(false);
    setCurrentTrack(null);
    toast.success('Signed out of Spotify');
  };

  // --- Not configured ---
  if (!isConfigured() && !showMp3Shell) {
    return (
      <div className="h-full flex flex-col bg-[#121212] text-white overflow-auto">
        <div className="px-5 pt-6 pb-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#1DB954] flex items-center justify-center">
            <SpotifyIcon className="w-6 h-6 text-black" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight">Spotify</h1>
            <p className="text-xs text-white/60">Powered by Spotify</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#181818] rounded-2xl p-6">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <h2 className="font-bold text-lg mb-2">Spotify setup required</h2>
            <p className="text-sm text-white/60 mb-4">
              Real Spotify sign-in needs a Spotify Developer app. Create one at{' '}
              <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" className="text-[#1DB954] underline">developer.spotify.com/dashboard</a>, then:
            </p>
            <ol className="text-sm text-white/70 space-y-1 list-decimal list-inside mb-4">
              <li>Add Redirect URI: <code className="text-[#1DB954]">{window.location.origin}/spotify-callback</code></li>
              <li>Copy your Client ID</li>
              <li>Paste it into <code className="text-[#1DB954]">SPOTIFY_CLIENT_ID</code> in <code className="text-[#1DB954]">src/lib/spotifyAuth.js</code></li>
            </ol>
            <p className="text-xs text-white/40">Once configured, reload the app to sign in to Spotify.</p>
          </div>
          <Button
            onClick={() => { setShowMp3Shell(true); setActiveTab('mp3'); }}
            variant="secondary"
            className="w-full max-w-sm mx-auto mt-4 bg-[#282828] text-white hover:bg-[#383838] rounded-full"
          >
            <Music className="w-4 h-4 mr-2" /> Play local MP3s instead
          </Button>
        </div>
      </div>
    );
  }

  // --- Sign-in gate ---
  if (!authed && !showMp3Shell) {
    if (hydrating) {
      return (
        <div className="h-full flex flex-col bg-black text-white">
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="w-10 h-10 border-4 border-white/20 border-t-[#1DB954] rounded-full animate-spin mb-4" />
            <p className="text-sm text-white/60">Connecting to your Spotify account…</p>
          </div>
        </div>
      );
    }
    return (
      <div className="h-full flex flex-col bg-black text-white">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-24 h-24 rounded-full bg-[#1DB954] flex items-center justify-center mb-8">
            <SpotifyIcon className="w-12 h-12 text-black" />
          </div>
          <h1 className="text-3xl font-bold mb-3 text-center tracking-tight">Log in to Spotify</h1>
          <p className="text-sm text-white/60 mb-8 text-center max-w-xs">
            Connect your Spotify account to stream your playlists and saved songs right here. Premium required for full playback.
          </p>
          <Button onClick={handleSignIn} className="w-full max-w-xs bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold rounded-full">
            <Crown className="w-4 h-4 mr-2" /> Log in with Spotify
          </Button>
          <Button
            onClick={() => { setShowMp3Shell(true); setActiveTab('mp3'); }}
            variant="secondary"
            className="w-full max-w-xs mt-3 bg-[#282828] text-white hover:bg-[#383838] rounded-full"
          >
            <Music className="w-4 h-4 mr-2" /> Play local MP3s instead
          </Button>
        </div>
      </div>
    );
  }

  // --- Main shell ---
  const openPlaylist = (pl) => setSelected(pl);
  const backFromDetail = () => setSelected(null);

  return (
    <div className="relative h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Error / status banners */}
      {error && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-300/70 hover:text-red-200">×</button>
        </div>
      )}
      {premiumRequired && !remoteMode && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
          <Crown className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>In-app playback requires Spotify Premium. You can still browse your playlists.</span>
        </div>
      )}
      {remoteMode && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs text-blue-200 flex items-start gap-2">
          <Crown className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>Remote control — music plays on your active Spotify device. Open Spotify there, then press play.</span>
        </div>
      )}

      {/* Tab content (or playlist detail overlay) */}
      <div className="relative flex-1 overflow-hidden">
        {selected?.isMp3 ? (
          <div className="absolute inset-0 z-40 flex flex-col bg-black text-white overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <button onClick={backFromDetail} className="p-1.5 hover:bg-white/10 rounded-full transition-colors" title="Back">
                <ChevronDown className="w-7 h-7" />
              </button>
              <div className="text-center min-w-0">
                <p className="text-[10px] text-white/60 uppercase tracking-wider">Local files</p>
                <p className="text-xs font-semibold truncate max-w-[180px]">#MP3</p>
              </div>
              <div className="w-10" />
            </div>
            <div className="flex-1 overflow-hidden">
              <Mp3Tab
                tracks={mp3Tracks}
                currentTrackId={mp3Active ? currentTrack?.id : null}
                isPlaying={isPlaying}
                uploading={mp3Uploading}
                onAddFiles={addMp3Files}
                onPlayTrack={playMp3Track}
                onRemoveTrack={removeMp3Track}
              />
            </div>
          </div>
        ) : selected ? (
          <PlaylistDetail
            playlist={selected}
            playerReady={playerReady}
            isPlaying={isPlaying}
            currentTrack={currentTrack}
            onBack={backFromDetail}
            onPlayContext={playPlaylist}
            onPlayTrackInContext={playTrackInContext}
            onOpenPlaylist={openPlaylist}
          />
        ) : (
          <>
            {activeTab === 'library' && (
              <LibraryTab
                playlists={playlists}
                loading={loadingPlaylists}
                profile={profile}
                onOpenPlaylist={openPlaylist}
                onGoSearch={() => setActiveTab('search')}
                onSignOut={handleSignOut}
                mp3Count={mp3Tracks.length}
                onOpenMp3={() => setSelected({ id: 'mp3-collection', name: '#MP3', isMp3: true })}
              />
            )}
            {activeTab === 'home' && (
              <HomeTab
                profile={profile}
                playlists={playlists}
                fnaf={fnaf}
                onOpenPlaylist={openPlaylist}
              />
            )}
            {activeTab === 'search' && (
              <SearchTab
                profile={profile}
                playlists={playlists}
                onOpenPlaylist={openPlaylist}
                onPlayTrack={playTrack}
                currentTrackId={currentTrack?.id}
              />
            )}
            {activeTab === 'mp3' && (
              <Mp3Tab
                tracks={mp3Tracks}
                currentTrackId={mp3Active ? currentTrack?.id : null}
                isPlaying={isPlaying}
                uploading={mp3Uploading}
                onAddFiles={addMp3Files}
                onPlayTrack={playMp3Track}
                onRemoveTrack={removeMp3Track}
              />
            )}
          </>
        )}
      </div>

      {/* Persistent mini player + bottom nav (hidden while expanded) */}
      {!expanded && (
        <>
          <MiniPlayer />
          <BottomNav active={activeTab} onChange={setActiveTab} />
        </>
      )}

      {/* Full-screen now-playing overlay */}
      {expanded && currentTrack && (
        <ExpandedPlayer
          track={currentTrack}
          isPlaying={isPlaying}
          playerReady={playerReady}
          shuffle={shuffle}
          repeatMode={repeatMode}
          position={position}
          duration={duration}
          onTogglePlay={() => playerRef.current?.togglePlay()}
          onPrev={() => playerRef.current?.previousTrack()}
          onNext={() => playerRef.current?.nextTrack()}
          onToggleShuffle={() => playerRef.current?.setShuffle(!shuffle)}
          onCycleRepeat={cycleRepeat}
          onSeek={(ms) => playerRef.current?.seek(ms)}
          onClose={() => musicController.setExpanded(false)}
        />
      )}
    </div>
  );
}