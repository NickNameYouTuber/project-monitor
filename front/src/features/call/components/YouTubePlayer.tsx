import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link2, RefreshCw, X, Youtube, Search } from 'lucide-react';
import { useRoomContext, useLocalParticipant } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';

interface YouTubePlayerProps {
    onClose: () => void;
    isVisible: boolean;
    isUiVisible: boolean;
    isCreator: boolean;
    onChangeVideo?: () => void;
}

interface YouTubeSyncMessage {
    type: 'youtube_sync';
    payload: {
        action: 'play' | 'pause' | 'seek' | 'load' | 'sync_request' | 'sync_response' | 'close';
        videoId?: string;
        currentTime?: number;
        isPlaying?: boolean;
        senderId?: string;
    };
}

// Extend Window interface for YouTube API
declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
    }
}

// Extract YouTube video ID from various URL formats
const extractVideoId = (url: string): string | null => {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
        /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
};

// Load YouTube IFrame API
const loadYouTubeAPI = (): Promise<void> => {
    return new Promise((resolve) => {
        if (window.YT && window.YT.Player) {
            resolve();
            return;
        }

        const existingScript = document.getElementById('youtube-iframe-api');
        if (existingScript) {
            window.onYouTubeIframeAPIReady = () => resolve();
            return;
        }

        const script = document.createElement('script');
        script.id = 'youtube-iframe-api';
        script.src = 'https://www.youtube.com/iframe_api';
        window.onYouTubeIframeAPIReady = () => resolve();
        document.body.appendChild(script);
    });
};

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ onClose, isVisible, isUiVisible, isCreator, onChangeVideo }) => {
    const room = useRoomContext();
    const { localParticipant } = useLocalParticipant();

    const [videoUrl, setVideoUrl] = useState('');
    const [videoId, setVideoId] = useState<string | null>(null);
    const [apiReady, setApiReady] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showUrlInput, setShowUrlInput] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    const playerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const ignoreNextStateChange = useRef(false);
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Load YouTube API on mount
    useEffect(() => {
        loadYouTubeAPI().then(() => setApiReady(true));
    }, []);

    // Send sync message via data channel
    const sendSyncMessage = useCallback((message: YouTubeSyncMessage) => {
        message.payload.senderId = localParticipant.identity;
        const data = encoder.encode(JSON.stringify(message));
        localParticipant.publishData(data, { reliable: true });
    }, [localParticipant]);

    // Listen for URLs from extension
    useEffect(() => {
        const handleExtensionUrl = (event: MessageEvent) => {
            if (event.source !== window) return;
            if (event.data?.type === 'nimeet_load_youtube_url' && event.data?.url) {
                console.log('[YouTubePlayer] Received URL from extension:', event.data.url);
                const vid = extractVideoId(event.data.url);
                if (vid) {
                    setVideoUrl(event.data.url);
                    setVideoId(vid);
                    setShowUrlInput(false);
                    // Broadcast to other participants
                    sendSyncMessage({
                        type: 'youtube_sync',
                        payload: { action: 'load', videoId: vid }
                    });
                }
            }
        };

        window.addEventListener('message', handleExtensionUrl);
        return () => window.removeEventListener('message', handleExtensionUrl);
    }, [sendSyncMessage]);

    // Initialize YouTube player when video ID changes
    useEffect(() => {
        if (!apiReady || !videoId || !containerRef.current) return;

        if (playerRef.current) {
            playerRef.current.destroy();
        }

        const playerId = 'youtube-player-' + Date.now();
        containerRef.current.innerHTML = `<div id="${playerId}" style="width:100%;height:100%"></div>`;

        playerRef.current = new window.YT.Player(playerId, {
            videoId: videoId,
            width: '100%',
            height: '100%',
            playerVars: {
                autoplay: 1,
                controls: 1,
                modestbranding: 1,
                rel: 0,
                enablejsapi: 1,
            },
            events: {
                onReady: () => {
                    setShowUrlInput(false);
                    if (isCreator && playerRef.current) {
                        playerRef.current.unMute();
                        playerRef.current.setVolume(100);
                    }
                },
                onStateChange: (event: any) => {
                    if (ignoreNextStateChange.current) {
                        ignoreNextStateChange.current = false;
                        return;
                    }

                    const state = event.data;
                    const time = playerRef.current?.getCurrentTime() || 0;

                    if (state === 1) { // Playing
                        sendSyncMessage({
                            type: 'youtube_sync',
                            payload: { action: 'play', currentTime: time }
                        });
                    } else if (state === 2) { // Paused
                        sendSyncMessage({
                            type: 'youtube_sync',
                            payload: { action: 'pause', currentTime: time }
                        });
                    }
                }
            }
        });

        return () => {
            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
        };
    }, [apiReady, videoId, sendSyncMessage, isCreator]);

    // Handle incoming sync messages
    useEffect(() => {
        const handleDataReceived = (payload: Uint8Array) => {
            try {
                const message = JSON.parse(decoder.decode(payload));
                if (message.type !== 'youtube_sync') return;
                if (message.payload.senderId === localParticipant.identity) return;

                const { action, videoId: vid, currentTime: time, isPlaying: playing } = message.payload;

                switch (action) {
                    case 'load':
                        if (vid) {
                            setVideoId(vid);
                            setVideoUrl(`https://youtube.com/watch?v=${vid}`);
                            setShowUrlInput(false);
                        }
                        break;
                    case 'play':
                        if (playerRef.current && playerRef.current.playVideo) {
                            const localTime = playerRef.current.getCurrentTime() || 0;
                            const shouldSeek = time !== undefined && Math.abs(localTime - time) > 5;

                            if (shouldSeek) {
                                ignoreNextStateChange.current = true;
                                playerRef.current.seekTo(time, true);
                            }
                            playerRef.current.playVideo();
                        }
                        break;
                    case 'pause':
                        if (playerRef.current && playerRef.current.pauseVideo) {
                            const localTime = playerRef.current.getCurrentTime() || 0;
                            const shouldSeek = time !== undefined && Math.abs(localTime - time) > 5;

                            ignoreNextStateChange.current = true;
                            playerRef.current.pauseVideo();

                            if (shouldSeek) {
                                playerRef.current.seekTo(time, true);
                            }
                        }
                        break;
                    case 'seek':
                        if (playerRef.current && time !== undefined) {
                            const localTime = playerRef.current.getCurrentTime() || 0;
                            if (Math.abs(localTime - time) > 5) {
                                playerRef.current.seekTo(time, true);
                            }
                        }
                        break;
                    case 'sync_request':
                        if (videoId && playerRef.current) {
                            const curTime = playerRef.current.getCurrentTime?.() || 0;
                            const state = playerRef.current.getPlayerState?.();
                            sendSyncMessage({
                                type: 'youtube_sync',
                                payload: {
                                    action: 'sync_response',
                                    videoId,
                                    currentTime: curTime,
                                    isPlaying: state === 1,
                                }
                            });
                        }
                        break;
                    case 'sync_response':
                        if (!videoId && vid) {
                            setVideoId(vid);
                            setVideoUrl(`https://youtube.com/watch?v=${vid}`);
                            setShowUrlInput(false);
                        }
                        setTimeout(() => {
                            if (playerRef.current && time !== undefined) {
                                playerRef.current.seekTo(time, true);
                                if (playing) playerRef.current.playVideo();
                            }
                        }, 1000);
                        break;
                    case 'close':
                        onClose();
                        break;
                }
            } catch (e) {
                console.error('Failed to parse YouTube sync message', e);
            }
        };

        room.on(RoomEvent.DataReceived, handleDataReceived);
        return () => { room.off(RoomEvent.DataReceived, handleDataReceived); };
    }, [room, videoId, localParticipant.identity, sendSyncMessage, onClose]);

    // Request sync state when becoming visible
    useEffect(() => {
        if (!isVisible) return;
        const timer = setTimeout(() => {
            sendSyncMessage({
                type: 'youtube_sync',
                payload: { action: 'sync_request' }
            });
        }, 500);
        return () => clearTimeout(timer);
    }, [sendSyncMessage, isVisible]);

    const handleLoadVideo = (vidId?: string) => {
        const id = vidId || extractVideoId(videoUrl);
        if (id) {
            setVideoId(id);
            setVideoUrl(`https://youtube.com/watch?v=${id}`);
            setShowUrlInput(false);
            setShowSearch(false);
            sendSyncMessage({
                type: 'youtube_sync',
                payload: { action: 'load', videoId: id, senderId: localParticipant.identity }
            });
        }
    };

    useEffect(() => {
        if (onChangeVideo) {
            const openChangeVideo = () => {
                setVideoId(null);
                setVideoUrl('');
                setShowUrlInput(true);
            };
            (window as any).__youtubeChangeVideo = openChangeVideo;
            return () => {
                delete (window as any).__youtubeChangeVideo;
            };
        }
    }, [onChangeVideo]);

    const handleSearch = () => {
        if (!searchQuery.trim()) return;
        window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`, '_blank');
    };

    const handleSync = () => {
        setIsSyncing(true);
        sendSyncMessage({ type: 'youtube_sync', payload: { action: 'sync_request' } });
        setTimeout(() => setIsSyncing(false), 2000);
    };

    const handleClose = () => {
        if (isCreator) {
            sendSyncMessage({ type: 'youtube_sync', payload: { action: 'close', senderId: localParticipant.identity } });
        }
        onClose();
    };

    return (
        <div className={`w-full h-full flex flex-col bg-black relative overflow-hidden transition-all duration-300 ${!isUiVisible ? 'cursor-none' : ''}`}>
            {/* Header bar */}
            <div
                className={`absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none transition-all duration-500 ease-in-out ${isUiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
                    }`}
            >
                <div className="bg-background/90 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2 pointer-events-auto shadow-xl border border-border/50">
                    <Youtube className="w-5 h-5 text-red-500" />
                    <span className="font-semibold text-sm">Watch Together</span>
                </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="p-2.5 bg-background/90 backdrop-blur-sm rounded-lg hover:bg-background transition-all shadow-xl border border-border/50 group"
                        title="Sync State"
                    >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                    </button>
                    <button
                        onClick={handleClose}
                        className="p-2.5 bg-background/90 backdrop-blur-sm rounded-lg hover:bg-background transition-all shadow-xl border border-border/50 text-red-500/80 hover:text-red-500"
                        title="Stop Session"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* URL Input overlay */}
            {showUrlInput && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] z-20">
                    <div className="bg-card/95 backdrop-blur-md p-8 rounded-2xl max-w-lg w-full mx-4 shadow-2xl border border-border/50">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-red-500/10 rounded-xl">
                                <Youtube className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Watch Together</h3>
                                <p className="text-sm text-muted-foreground">Share the video experience with everyone</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowSearch(false)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all ${!showSearch ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                                >
                                    URL
                                </button>
                                <button
                                    onClick={() => setShowSearch(true)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all ${showSearch ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                                >
                                    Поиск
                                </button>
                            </div>
                            {!showSearch ? (
                                <div className="relative">
                                    <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={videoUrl}
                                        onChange={(e) => setVideoUrl(e.target.value)}
                                        placeholder="Вставьте ссылку на видео YouTube..."
                                        className="w-full pl-12 pr-4 py-3.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                                        onKeyDown={(e) => e.key === 'Enter' && handleLoadVideo()}
                                        autoFocus
                                    />
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Поиск видео на YouTube..."
                                        className="w-full pl-12 pr-4 py-3.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        autoFocus
                                    />
                                </div>
                            )}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleClose}
                                    className="flex-1 py-3 bg-muted hover:bg-muted/80 rounded-xl font-semibold transition-all"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={() => showSearch ? handleSearch() : handleLoadVideo()}
                                    disabled={showSearch ? !searchQuery.trim() : (!videoUrl || !apiReady)}
                                    className="flex-[2] py-3 bg-red-600 hover:bg-red-700 disabled:bg-muted disabled:text-muted-foreground text-white rounded-xl font-semibold shadow-lg shadow-red-600/20 transition-all active:scale-[0.98]"
                                >
                                    {showSearch ? 'Открыть поиск' : (apiReady ? 'Начать просмотр' : 'Загрузка API...')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Video Player - full size */}
            <div
                ref={containerRef}
                className="w-full h-full"
            />
        </div>
    );
};
