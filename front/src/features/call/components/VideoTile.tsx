import React, { useEffect, useRef, useState } from 'react';
import { MicOff, VideoOff, Volume2, VolumeX } from 'lucide-react';
import { Participant, Track } from 'livekit-client';
import { useParticipantTracks } from '@livekit/components-react';
import { VideoTileBorder } from './VideoTileBorder';

interface VideoTileProps {
    participant: Participant;
    isLocal: boolean;
    isCameraEnabled: boolean;
    isMicEnabled: boolean;
    isSpeaking: boolean;
    isHandRaised: boolean;
    volume?: number;
    onVolumeChange?: (volume: number) => void;
}

export const VideoTile: React.FC<VideoTileProps> = ({
    participant,
    isLocal,
    isCameraEnabled,
    isMicEnabled,
    isSpeaking,
    isHandRaised,
    volume = 1.0,
    onVolumeChange,
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [showVolumeControl, setShowVolumeControl] = useState(false);

    // Use LiveKit hook to properly subscribe to track changes
    const tracks = useParticipantTracks([Track.Source.Camera, Track.Source.Microphone], participant.identity);

    const cameraTrack = tracks.find(t => t.source === Track.Source.Camera);
    const microphoneTrack = tracks.find(t => t.source === Track.Source.Microphone);
    const hasVideo = !!cameraTrack?.publication?.track && isCameraEnabled;

    useEffect(() => {
        if (!audioRef.current) return;

        const audioTrack = microphoneTrack?.publication?.track;
        if (audioTrack) {
            audioTrack.attach(audioRef.current);
            return () => {
                audioTrack.detach(audioRef.current!);
            };
        }
    }, [microphoneTrack]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    useEffect(() => {
        if (!videoRef.current) return;

        if (!isCameraEnabled) {
            videoRef.current.srcObject = null;
            return;
        }

        const videoTrack = cameraTrack?.publication?.track;
        if (videoTrack) {
            videoTrack.attach(videoRef.current);
            return () => {
                videoTrack.detach(videoRef.current!);
            };
        } else {
            videoRef.current.srcObject = null;
        }
    }, [cameraTrack, isCameraEnabled]);

    const displayName = participant.name || participant.identity;

    return (
        <div className="relative w-full h-full bg-card rounded-lg overflow-hidden group shadow-sm border border-border">
            {hasVideo ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover -scale-x-100"
                />
            ) : (
                <div className="flex items-center justify-center w-full h-full bg-muted">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-2xl sm:text-3xl text-muted-foreground font-semibold">
                            {displayName?.[0]?.toUpperCase() || '?'}
                        </span>
                    </div>
                </div>
            )}

            <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-black/80 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg">
                <span className="text-white text-xs sm:text-sm font-medium flex items-center gap-1.5">
                    {!hasVideo && (
                        <VideoOff className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
                    )}
                    {!isMicEnabled && (
                        <MicOff className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
                    )}
                    {displayName}
                    {isLocal && <span className="text-gray-400 text-xs">(You)</span>}
                </span>
            </div>

            {!isLocal && onVolumeChange && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="relative">
                        <button
                            onClick={() => setShowVolumeControl(!showVolumeControl)}
                            className="p-1.5 bg-black/80 hover:bg-black/90 rounded-lg transition-colors"
                            title="Настройки громкости"
                        >
                            {volume > 0 ? (
                                <Volume2 className="w-4 h-4 text-white" />
                            ) : (
                                <VolumeX className="w-4 h-4 text-red-400" />
                            )}
                        </button>
                        {showVolumeControl && (
                            <div className="absolute top-full right-0 mt-2 bg-card border border-border rounded-lg p-3 shadow-xl z-50 min-w-[120px]">
                                <div className="flex items-center gap-2 mb-2">
                                    <Volume2 className="w-4 h-4" />
                                    <span className="text-sm font-medium">Громкость</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={volume}
                                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                                    className="w-full"
                                />
                                <div className="text-xs text-muted-foreground text-center mt-1">
                                    {Math.round(volume * 100)}%
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!isLocal && <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />}

            <VideoTileBorder isSpeaking={isSpeaking} isHandRaised={isHandRaised} />
        </div>
    );
};
