import React, { useState, useEffect } from 'react';
import { Settings, X, Mic, Video } from 'lucide-react';
import { useLocalParticipant } from '@livekit/components-react';
import { Track } from 'livekit-client';

interface DeviceSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DeviceSettings: React.FC<DeviceSettingsProps> = ({ isOpen, onClose }) => {
    const { localParticipant } = useLocalParticipant();
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>('');
    const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>('');

    useEffect(() => {
        const loadDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioInputs = devices.filter(d => d.kind === 'audioinput');
                const videoInputs = devices.filter(d => d.kind === 'videoinput');
                
                setAudioDevices(audioInputs);
                setVideoDevices(videoInputs);
                
                if (audioInputs.length > 0 && !selectedAudioDeviceId) {
                    setSelectedAudioDeviceId(audioInputs[0].deviceId);
                }
                if (videoInputs.length > 0 && !selectedVideoDeviceId) {
                    setSelectedVideoDeviceId(videoInputs[0].deviceId);
                }
            } catch (err) {
                console.error('Error loading devices', err);
            }
        };

        if (isOpen) {
            loadDevices();
            navigator.mediaDevices.addEventListener('devicechange', loadDevices);
            return () => {
                navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
            };
        }
    }, [isOpen, selectedAudioDeviceId, selectedVideoDeviceId]);

    const handleAudioDeviceChange = async (deviceId: string) => {
        setSelectedAudioDeviceId(deviceId);
        try {
            const wasEnabled = localParticipant.isMicrophoneEnabled;
            if (wasEnabled) {
                await localParticipant.setMicrophoneEnabled(false);
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: { exact: deviceId } },
                video: false
            });
            
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                for (const publication of localParticipant.audioTrackPublications.values()) {
                    if (publication.track) {
                        await localParticipant.unpublishTrack(publication.track);
                    }
                }
                
                await localParticipant.publishTrack(audioTrack, {
                    source: Track.Source.Microphone
                });
            }
            
            stream.getTracks().forEach(track => {
                if (track !== audioTrack) track.stop();
            });
        } catch (err) {
            console.error('Error changing audio device', err);
        }
    };

    const handleVideoDeviceChange = async (deviceId: string) => {
        setSelectedVideoDeviceId(deviceId);
        try {
            const wasEnabled = localParticipant.isCameraEnabled;
            if (wasEnabled) {
                await localParticipant.setCameraEnabled(false);
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: deviceId } },
                audio: false
            });
            
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                for (const publication of localParticipant.videoTrackPublications.values()) {
                    if (publication.source === Track.Source.Camera && publication.track) {
                        await localParticipant.unpublishTrack(publication.track);
                    }
                }
                
                await localParticipant.publishTrack(videoTrack, {
                    source: Track.Source.Camera
                });
            }
            
            stream.getTracks().forEach(track => {
                if (track !== videoTrack) track.stop();
            });
        } catch (err) {
            console.error('Error changing video device', err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-card rounded-2xl shadow-xl max-w-md w-full border border-border" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        <h2 className="text-lg font-semibold">Настройки устройств</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-secondary rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-6">
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium mb-2">
                            <Mic className="w-4 h-4" />
                            Микрофон
                        </label>
                        <select
                            value={selectedAudioDeviceId}
                            onChange={(e) => handleAudioDeviceChange(e.target.value)}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            {audioDevices.map((device) => (
                                <option key={device.deviceId} value={device.deviceId}>
                                    {device.label || `Микрофон ${audioDevices.indexOf(device) + 1}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium mb-2">
                            <Video className="w-4 h-4" />
                            Камера
                        </label>
                        <select
                            value={selectedVideoDeviceId}
                            onChange={(e) => handleVideoDeviceChange(e.target.value)}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            {videoDevices.map((device) => (
                                <option key={device.deviceId} value={device.deviceId}>
                                    {device.label || `Камера ${videoDevices.indexOf(device) + 1}`}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};

