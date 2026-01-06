import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
    LiveKitRoom,
    useTracks,
    useRoomContext,
    useLocalParticipant,
    useParticipants,
} from '@livekit/components-react';
import { Track, RoomEvent, Participant, ConnectionState } from 'livekit-client';
import '@livekit/components-styles';

const patchRTCPeerConnection = () => {
    if (typeof window === 'undefined' || !window.RTCPeerConnection) {
        console.warn('[TURN PATCH] RTCPeerConnection not available');
        return;
    }

    if ((window as any).__RTCPeerConnectionPatched) {
        console.log('[TURN PATCH] Already patched, skipping');
        return;
    }

    const OriginalRTCPeerConnection = window.RTCPeerConnection;

    const ExternalTurnServer: RTCIceServer = {
        urls: ['turn:212.192.217.217:3478'],
        username: 'turnuser',
        credential: '4089f0b7dffe89ccb5e08998d371939c'
    };

    console.log('[TURN PATCH] Patching RTCPeerConnection, external TURN:', ExternalTurnServer);

    const PatchedRTCPeerConnection = function (this: RTCPeerConnection, configuration?: RTCConfiguration): RTCPeerConnection {
        const existingIceServers = configuration?.iceServers || [];

        console.log('[TURN PATCH] RTCPeerConnection created, existing ICE servers:', existingIceServers);

        const customIceServers: RTCIceServer[] = [
            ExternalTurnServer,
            ...existingIceServers
        ];

        console.log('[TURN PATCH] Patched ICE servers:', customIceServers);

        const patchedConfiguration: RTCConfiguration = {
            ...configuration,
            iceServers: customIceServers
        };

        return new OriginalRTCPeerConnection(patchedConfiguration);
    };

    PatchedRTCPeerConnection.prototype = OriginalRTCPeerConnection.prototype;
    Object.setPrototypeOf(PatchedRTCPeerConnection, OriginalRTCPeerConnection);

    Object.getOwnPropertyNames(OriginalRTCPeerConnection).forEach(name => {
        if (name !== 'prototype' && name !== 'length' && name !== 'name') {
            try {
                (PatchedRTCPeerConnection as any)[name] = (OriginalRTCPeerConnection as any)[name];
            } catch (e) {
            }
        }
    });

    window.RTCPeerConnection = PatchedRTCPeerConnection as any;
    (window as any).__RTCPeerConnectionPatched = true;
    console.log('[TURN PATCH] RTCPeerConnection patched successfully');
};

patchRTCPeerConnection();

import { PreCallSetup } from '../components/PreCallSetup';
import { VideoGrid } from '../components/VideoGrid';
import { ControlPanel } from '../components/ControlPanel';
import { ChatPanel } from '../components/ChatPanel';
import { RaisedHandsBadge } from '../components/RaisedHandsBadge';
import { YouTubePlayer } from '../components/YouTubePlayer';
import { DeviceSettings } from '../components/DeviceSettings';
import { getToken } from '@/api/calls';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Monitor } from 'lucide-react';

// Message types for data channel
interface ChatMessage {
    id: string;
    sender: string;
    text: string;
    timestamp: number;
}

interface DataMessage {
    type: 'chat' | 'raised_hand';
    payload: any;
}

// Featured Content Item Type
type FeaturedItem =
    | { type: 'screen', track: any, identity: string }
    | { type: 'youtube' };

// Carousel Item Component
const CarouselItem = ({ item, isActive, isUiVisible, total, index, onYouTubeClose, youtubeCreatorId, localParticipantId }: { item: FeaturedItem, isActive: boolean, isUiVisible: boolean, total: number, index: number, onYouTubeClose: () => void, youtubeCreatorId: string | null, localParticipantId: string }) => {
    const videoRef = React.useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && item.type === 'screen' && item.track) {
            item.track.attach(videoRef.current);
            return () => {
                if (videoRef.current) item.track.detach(videoRef.current);
            };
        }
    }, [item]);

    if (item.type === 'youtube') {
        return (
            <div className={`w-full h-full absolute inset-0 transition-opacity duration-500 ${isActive ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'}`}>
                <YouTubePlayer
                    onClose={onYouTubeClose}
                    isVisible={isActive}
                    isUiVisible={isUiVisible}
                    isCreator={youtubeCreatorId === localParticipantId}
                    onChangeVideo={() => {
                        if ((window as any).__youtubeChangeVideo) {
                            (window as any).__youtubeChangeVideo();
                        }
                    }}
                />
            </div>
        );
    }

    return (
        <div className={`w-full h-full absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${isActive ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'}`}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
            />

            {/* Screen info badge */}
            <div className={`absolute top-4 left-4 bg-background/90 px-3 py-1.5 rounded-lg flex items-center gap-2 z-[21] transition-all duration-500 ${isUiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                <Monitor className="w-4 h-4" />
                <span className="text-sm font-medium">
                    {item.identity || 'Screen Share'}
                </span>
                {total > 1 && (
                    <span className="text-xs text-muted-foreground ml-2">
                        {index + 1} / {total}
                    </span>
                )}
            </div>
        </div>
    );
};

// Content Carousel Component
const ContentCarousel = ({ items, onYouTubeClose, isUiVisible, youtubeCreatorId, localParticipantId }: { items: FeaturedItem[], onYouTubeClose: () => void, isUiVisible: boolean, youtubeCreatorId: string | null, localParticipantId: string }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Sync currentIndex with items length
    useEffect(() => {
        if (currentIndex >= items.length && items.length > 0) {
            setCurrentIndex(items.length - 1);
        }
    }, [items.length, currentIndex]);

    // Auto-switch to YouTube if it's newly added
    const prevItemsLength = React.useRef(items.length);
    useEffect(() => {
        if (items.length > prevItemsLength.current) {
            const youtubeIndex = items.findIndex(item => item.type === 'youtube');
            if (youtubeIndex !== -1) {
                setCurrentIndex(youtubeIndex);
            }
        }
        prevItemsLength.current = items.length;
    }, [items]);

    if (items.length === 0) return null;

    // Boundary check for render
    const safeIndex = Math.min(currentIndex, items.length - 1);
    const effectiveIndex = safeIndex < 0 ? 0 : safeIndex;

    return (
        <div className="w-full h-full bg-muted flex-shrink-0 relative flex items-center justify-center overflow-hidden">
            {items.map((item, idx) => (
                <CarouselItem
                    key={item.type === 'screen' ? `screen-${item.identity}` : 'youtube'}
                    item={item}
                    isActive={idx === effectiveIndex}
                    isUiVisible={isUiVisible}
                    total={items.length}
                    index={idx}
                    onYouTubeClose={onYouTubeClose}
                    youtubeCreatorId={youtubeCreatorId}
                    localParticipantId={localParticipantId}
                />
            ))}

            {/* Navigation arrows (only if more than 1 item) */}
            {items.length > 1 && (
                <div className={`transition-all duration-500 z-30 ${isUiVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <button
                        onClick={() => setCurrentIndex(prev => prev > 0 ? prev - 1 : items.length - 1)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 hover:bg-background rounded-full flex items-center justify-center transition-colors shadow-lg group"
                    >
                        <ChevronLeft className="w-6 h-6 text-muted-foreground group-hover:text-foreground" />
                    </button>
                    <button
                        onClick={() => setCurrentIndex(prev => prev < items.length - 1 ? prev + 1 : 0)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 hover:bg-background rounded-full flex items-center justify-center transition-colors shadow-lg group"
                    >
                        <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-foreground" />
                    </button>
                </div>
            )}

            {/* Dots indicator */}
            {items.length > 1 && (
                <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-30 pointer-events-none transition-all duration-500 ${isUiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    {items.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`w-2 h-2 rounded-full transition-colors pointer-events-auto ${idx === effectiveIndex ? 'bg-primary' : 'bg-muted-foreground/50'
                                }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// Inner component to handle Room context logic
const CallContent = ({ onLeave, callId, onReconnecting, onReconnected }: { onLeave: () => void; callId: string; onReconnecting?: () => void; onReconnected?: () => void }) => {
    const room = useRoomContext();
    const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);
    const participants = useParticipants();
    const { localParticipant } = useLocalParticipant();

    // States
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isYouTubeActive, setIsYouTubeActive] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [youtubeCreatorId, setYoutubeCreatorId] = useState<string | null>(null);
    const [speakingParticipants, setSpeakingParticipants] = useState<Set<string>>(new Set());
    const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isParticipantsVisible, setIsParticipantsVisible] = useState(true);
    const [isUiVisible, setIsUiVisible] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [isDeviceSettingsOpen, setIsDeviceSettingsOpen] = useState(false);
    const [participantVolumes, setParticipantVolumes] = useState<Map<string, number>>(new Map());

    const idleTimerRef = React.useRef<NodeJS.Timeout | null>(null);
    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
    const chunksRef = React.useRef<Blob[]>([]);

    const restartIdleTimer = useCallback(() => {
        setIsUiVisible(true);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
            setIsUiVisible(false);
        }, 5000);
    }, []);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart'];
        const handleInteraction = () => restartIdleTimer();

        restartIdleTimer();
        events.forEach(e => window.addEventListener(e, handleInteraction, { passive: true }));

        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            events.forEach(e => window.removeEventListener(e, handleInteraction));
        };
    }, [restartIdleTimer]);

    // Collect all screen share tracks
    const screenTracks = tracks
        .filter(t => t.source === Track.Source.ScreenShare && t.publication?.track)
        .map(t => ({
            track: t.publication!.track!,
            participantIdentity: t.participant?.name || t.participant?.identity || 'Unknown'
        }));



    // Data channel for chat and raised hands
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const sendDataMessage = useCallback((message: DataMessage | { type: 'youtube_sync', payload: any }) => {
        const data = encoder.encode(JSON.stringify(message));
        localParticipant.publishData(data, { reliable: true });
    }, [localParticipant]);

    // Handle incoming data messages
    useEffect(() => {
        const handleDataReceived = (payload: Uint8Array, participant?: Participant) => {
            try {
                const message = JSON.parse(decoder.decode(payload));

                if (message.type === 'chat') {
                    const chatMsg: ChatMessage = {
                        id: Date.now().toString() + Math.random(),
                        sender: participant?.name || participant?.identity || 'Unknown',
                        text: message.payload.text,
                        timestamp: Date.now(),
                    };
                    setMessages(prev => [...prev, chatMsg]);
                } else if (message.type === 'raised_hand') {
                    const { identity, raised } = message.payload;
                    setRaisedHands(prev => {
                        const next = new Set(prev);
                        if (raised) {
                            next.add(identity);
                        } else {
                            next.delete(identity);
                        }
                        return next;
                    });
                } else if (message.type === 'youtube_sync') {
                    const { action, senderId } = message.payload;
                    if (action === 'load' || action === 'sync_response') {
                        setIsYouTubeActive(true);
                        if (action === 'load' && senderId && !youtubeCreatorId) {
                            setYoutubeCreatorId(senderId);
                        }
                    } else if (action === 'close') {
                        setIsYouTubeActive(false);
                        if (senderId === youtubeCreatorId) {
                            setYoutubeCreatorId(null);
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to parse data message', e);
            }
        };

        room.on(RoomEvent.DataReceived, handleDataReceived);
        return () => { room.off(RoomEvent.DataReceived, handleDataReceived); };
    }, [room, youtubeCreatorId, decoder]);

    // Speaking detection
    useEffect(() => {
        const onActiveSpeakersChanged = (speakers: Participant[]) => {
            const output = new Set<string>();
            speakers.forEach(s => output.add(s.identity));
            setSpeakingParticipants(output);
        }
        room.on(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged);
        return () => { room.off(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged); }
    }, [room]);

    // Reconnection handling
    useEffect(() => {
        const handleConnectionStateChanged = (state: ConnectionState) => {
            console.log('Connection state changed:', state);
            if (state === ConnectionState.Reconnecting) {
                if (onReconnecting) onReconnecting();
            } else if (state === ConnectionState.Connected) {
                if (onReconnected) onReconnected();
            }
        };

        room.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);

        // Check initial state
        if (room.state === ConnectionState.Reconnecting && onReconnecting) {
            onReconnecting();
        }

        return () => {
            room.off(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged);
        };
    }, [room, onReconnecting, onReconnected]);

    // Handlers
    const toggleCamera = () => localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled);
    const toggleMicrophone = () => localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
    const toggleScreenShare = () => localParticipant.setScreenShareEnabled(!localParticipant.isScreenShareEnabled);

    const toggleRaiseHand = () => {
        const isCurrentlyRaised = raisedHands.has(localParticipant.identity);
        const newRaised = !isCurrentlyRaised;

        // Update local state
        setRaisedHands(prev => {
            const next = new Set(prev);
            if (newRaised) {
                next.add(localParticipant.identity);
            } else {
                next.delete(localParticipant.identity);
            }
            return next;
        });

        // Broadcast to others
        sendDataMessage({
            type: 'raised_hand',
            payload: { identity: localParticipant.identity, raised: newRaised }
        });
    };

    const handleToggleYouTube = () => {
        if (!isYouTubeActive) {
            setIsYouTubeActive(true);
            setYoutubeCreatorId(localParticipant.identity);
        } else {
            if (youtubeCreatorId === localParticipant.identity) {
                sendDataMessage({
                    type: 'youtube_sync',
                    payload: { action: 'close', senderId: localParticipant.identity }
                });
                setIsYouTubeActive(false);
                setYoutubeCreatorId(null);
            }
        }
    };

    const handleToggleRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
        } else {
            try {
                // 1. Get Display Media (Video + System Audio)
                const displayStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true
                });

                // 2. Setup Audio Mixing
                const audioContext = new AudioContext();
                const destination = audioContext.createMediaStreamDestination();
                const sources: MediaStreamAudioSourceNode[] = [];

                // Add System Audio (if available)
                if (displayStream.getAudioTracks().length > 0) {
                    const systemSource = audioContext.createMediaStreamSource(displayStream);
                    const systemGain = audioContext.createGain();
                    systemGain.gain.value = 1.0;
                    systemSource.connect(systemGain).connect(destination);
                    sources.push(systemSource);
                }

                // Add Local Microphone (if enabled)
                if (localParticipant.isMicrophoneEnabled) {
                    try {
                        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        const micSource = audioContext.createMediaStreamSource(micStream);
                        const micGain = audioContext.createGain();
                        micGain.gain.value = 1.0;
                        micSource.connect(micGain).connect(destination);
                        sources.push(micSource);
                    } catch (e) {
                        console.warn("Could not add microphone to recording", e);
                    }
                }

                // 3. Create Final Mixed Stream
                // If we have mixed audio, use it. Otherwise, use what we have.
                const mixedAudioTracks = destination.stream.getAudioTracks();
                const finalAudioTracks = mixedAudioTracks.length > 0 ? mixedAudioTracks : displayStream.getAudioTracks();

                const mixedStream = new MediaStream([
                    ...displayStream.getVideoTracks(),
                    ...finalAudioTracks
                ]);

                // Determine best supported mime type
                const mimeTypes = [
                    'video/webm;codecs=vp9,opus',
                    'video/webm;codecs=vp8,opus',
                    'video/webm',
                    'video/mp4'
                ];

                const selectedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
                console.log('Using mime type for recording:', selectedMimeType);

                const mediaRecorder = new MediaRecorder(mixedStream, {
                    mimeType: selectedMimeType
                });

                mediaRecorderRef.current = mediaRecorder;
                chunksRef.current = [];

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) {
                        chunksRef.current.push(e.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    const blob = new Blob(chunksRef.current, { type: selectedMimeType });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    // Determine extension based on mime type
                    const ext = selectedMimeType.includes('mp4') ? 'mp4' : 'webm';
                    const timestamp = new Date().getTime();
                    a.download = `rec_${timestamp}.${ext}`;
                    a.click();
                    URL.revokeObjectURL(url);

                    // Cleanup
                    displayStream.getTracks().forEach(t => t.stop());

                    // Close context and sources specific to recording (mic stream is separate userMedia)
                    audioContext.close();

                    if (isRecording) setIsRecording(false);
                };

                // Stop recording if user stops sharing via browser UI
                displayStream.getVideoTracks()[0].onended = () => {
                    if (mediaRecorder.state !== 'inactive') {
                        mediaRecorder.stop();
                    }
                    setIsRecording(false);
                };

                mediaRecorder.start(1000); // Collect in 1s chunks
                setIsRecording(true);
            } catch (err) {
                console.error("Error starting recording:", err);
                alert("Recording failed. Please ensure you grant screen access and audio permissions.");
            }
        }
    };

    const handleYouTubeClose = () => {
        if (youtubeCreatorId === localParticipant.identity) {
            sendDataMessage({
                type: 'youtube_sync',
                payload: { action: 'close', senderId: localParticipant.identity }
            });
            setYoutubeCreatorId(null);
        }
        setIsYouTubeActive(false);
    };

    const sendMessage = (text: string) => {
        // Add to local messages
        const msg: ChatMessage = {
            id: Date.now().toString(),
            sender: localParticipant.name || 'Me',
            text,
            timestamp: Date.now(),
        };
        setMessages(prev => [...prev, msg]);

        // Broadcast to others
        sendDataMessage({
            type: 'chat',
            payload: { text }
        });
    };

    // Build featured items list (Screens + YouTube)
    const featuredItems: FeaturedItem[] = [
        ...screenTracks.map(t => ({ type: 'screen' as const, track: t.track, identity: t.participantIdentity })),
        ...(isYouTubeActive ? [{ type: 'youtube' as const }] : [])
    ];

    const hasFeaturedContent = featuredItems.length > 0;

    return (
        <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
            {/* Featured Content (Unified Carousel) */}
            {hasFeaturedContent && (
                <div
                    className="w-full bg-muted flex-shrink-0 relative transition-all duration-300"
                    style={{
                        height: isParticipantsVisible
                            ? isMobile
                                ? 'calc(100% - 120px - 48px)'
                                : 'calc(100% - 160px - 56px)'
                            : isMobile
                                ? 'calc(100% - 48px)'
                                : 'calc(100% - 56px)'
                    }}
                >
                    <ContentCarousel
                        items={featuredItems}
                        onYouTubeClose={handleYouTubeClose}
                        isUiVisible={isUiVisible}
                        youtubeCreatorId={youtubeCreatorId}
                        localParticipantId={localParticipant.identity}
                    />
                </div>
            )}

            {/* Participants strip (changes height based on featured content) */}
            <div
                className={`overflow-hidden transition-all duration-300 relative ${hasFeaturedContent && !isParticipantsVisible ? 'h-0' : hasFeaturedContent ? 'h-[120px] md:h-[160px]' : 'flex-1 pb-12 md:pb-14'
                    }`}
            >
                <VideoGrid
                    participants={participants.filter(p => !p.isLocal)}
                    localParticipant={localParticipant}
                    speakingParticipants={speakingParticipants}
                    raisedHands={raisedHands}
                    isScreenSharing={hasFeaturedContent}
                    callId={callId}
                    participantVolumes={participantVolumes}
                    onVolumeChange={(participantId, volume) => {
                        setParticipantVolumes(prev => {
                            const next = new Map(prev);
                            next.set(participantId, volume);
                            return next;
                        });
                    }}
                />
            </div>

            {/* Collapse toggle bar - when participants are visible */}
            {hasFeaturedContent && isParticipantsVisible && (
                <button
                    onClick={() => setIsParticipantsVisible(false)}
                    className="fixed bottom-[calc(48px+120px)] md:bottom-[calc(56px+160px)] left-0 right-0 bg-card/30 hover:bg-card/95 hover:backdrop-blur-sm transition-all duration-200 flex items-center justify-center py-2 cursor-pointer group z-40 min-h-[44px]"
                    title="Скрыть участников"
                >
                    <div className="flex items-center gap-2 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                        <div className="w-8 h-0.5 bg-border/50 group-hover:bg-border transition-colors rounded-full" />
                        <ChevronDown className="w-4 h-4" />
                        <div className="w-8 h-0.5 bg-border/50 group-hover:bg-border transition-colors rounded-full" />
                    </div>
                </button>
            )}

            {/* Expand toggle bar - when participants are hidden */}
            {hasFeaturedContent && !isParticipantsVisible && (
                <button
                    onClick={() => setIsParticipantsVisible(true)}
                    className="fixed bottom-12 md:bottom-14 left-0 right-0 bg-card/30 hover:bg-card/95 hover:backdrop-blur-sm transition-all duration-200 flex items-center justify-center py-2 cursor-pointer group z-40 min-h-[44px]"
                    title="Показать участников"
                >
                    <div className="flex items-center gap-2 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                        <div className="w-8 h-0.5 bg-border/50 group-hover:bg-border transition-colors rounded-full" />
                        <ChevronUp className="w-4 h-4" />
                        <div className="w-8 h-0.5 bg-border/50 group-hover:bg-border transition-colors rounded-full" />
                    </div>
                </button>
            )}

            {/* Raised hands badge (only when participants are hidden) */}
            {hasFeaturedContent && !isParticipantsVisible && (
                <RaisedHandsBadge participants={participants} raisedHands={raisedHands} />
            )}

            {/* Control Panel - fixed at bottom */}
            <div className="fixed bottom-0 left-0 right-0 z-30">
                <ControlPanel
                    isCameraEnabled={localParticipant.isCameraEnabled}
                    isMicrophoneEnabled={localParticipant.isMicrophoneEnabled}
                    isScreenSharing={localParticipant.isScreenShareEnabled}
                    isChatOpen={isChatOpen}
                    isHandRaised={raisedHands.has(localParticipant.identity)}
                    isYouTubeActive={isYouTubeActive}
                    isRecording={isRecording}
                    onToggleCamera={toggleCamera}
                    onToggleMicrophone={toggleMicrophone}
                    onToggleScreenShare={toggleScreenShare}
                    onToggleChat={() => setIsChatOpen(!isChatOpen)}
                    onToggleRaiseHand={toggleRaiseHand}
                    onToggleYouTube={handleToggleYouTube}
                    onToggleRecording={handleToggleRecording}
                    onOpenSettings={() => setIsDeviceSettingsOpen(true)}
                    onYouTubeChangeVideo={isYouTubeActive && youtubeCreatorId === localParticipant.identity ? () => {
                        if ((window as any).__youtubeChangeVideo) {
                            (window as any).__youtubeChangeVideo();
                        }
                    } : undefined}
                    onLeave={onLeave}
                />
            </div>

            {/* Device Settings */}
            <DeviceSettings
                isOpen={isDeviceSettingsOpen}
                onClose={() => setIsDeviceSettingsOpen(false)}
            />

            {/* Side Chat */}
            <ChatPanel
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                messages={messages}
                onSendMessage={sendMessage}
            />

        </div>
    );
};

const CallPage: React.FC = () => {
    const { callId } = useParams<{ callId: string }>();
    const [searchParams] = useSearchParams();
    const defaultName = searchParams.get('name') || '';

    const [token, setToken] = useState('');
    const [hasJoined, setHasJoined] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const isReconnectingRef = React.useRef(false);

    const handleDisconnected = React.useCallback((reason?: any) => {
        console.log('Disconnected from room:', reason);
        if (reason === 'CLIENT_REQUESTED') {
            window.location.href = '/';
            return;
        }

        if (isReconnectingRef.current) {
            return;
        }

        setConnectionError(`Соединение прервано: ${reason || 'Неизвестная причина'}`);
        setTimeout(() => {
            if (!isReconnectingRef.current) {
                window.location.href = '/';
            }
        }, 5000);
    }, []);

    const handleReconnecting = React.useCallback(() => {
        isReconnectingRef.current = true;
        setIsReconnecting(true);
        setConnectionError(null);
    }, []);

    const handleReconnected = React.useCallback(() => {
        isReconnectingRef.current = false;
        setIsReconnecting(false);
        setConnectionError(null);
    }, []);

    const handleJoin = async (settings: { name: string, cameraEnabled: boolean, microphoneEnabled: boolean }) => {
        try {
            const t = await getToken(callId || 'default-room', settings.name);
            setToken(t);
            setHasJoined(true);
            setConnectionError(null);
        } catch (e) {
            console.error("Failed to get token", e);
            alert("Failed to join room");
        }
    };

    if (!hasJoined) {
        return <PreCallSetup onJoin={handleJoin} defaultName={defaultName} />;
    }

    const getServerUrl = () => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const hostname = window.location.hostname;

        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'ws://localhost:7880';
        }

        const port = window.location.port ? `:${window.location.port}` : '';
        return `${protocol}//${hostname}${port}`;
    };

    return (
        <>
            {isReconnecting && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-white px-4 py-2 rounded z-50 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Переподключение...</span>
                </div>
            )}
            {connectionError && !isReconnecting && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded z-50">
                    {connectionError}
                </div>
            )}
            <LiveKitRoom
                token={token}
                serverUrl={getServerUrl()}
                connect={true}
                video={true}
                audio={true}
                data-lk-theme="default"
                onDisconnected={handleDisconnected}
                options={{
                    adaptiveStream: true,
                    dynacast: true
                }}
            >
                <CallContent
                    onLeave={() => window.location.href = '/'}
                    callId={callId || ''}
                    onReconnecting={handleReconnecting}
                    onReconnected={handleReconnected}
                />
            </LiveKitRoom>
        </>
    );
};

export default CallPage;
