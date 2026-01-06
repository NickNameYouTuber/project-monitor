import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, ArrowLeft } from 'lucide-react';
// import { NIIDLoginButton } from '../../niid/components/NIIDLoginButton';
// import { NIIDClient } from '../../niid/sdk/core/NIIDClient';


interface PreCallSetupProps {
    onJoin: (settings: { cameraEnabled: boolean; microphoneEnabled: boolean; name: string }) => void;
    defaultName?: string;
}

export const PreCallSetup: React.FC<PreCallSetupProps> = ({ onJoin, defaultName = '' }) => {
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
    const [name, setName] = useState(defaultName);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        let mounted = true;

        const initPreview = async () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }

            if (!cameraEnabled && !microphoneEnabled) {
                if (videoRef.current) videoRef.current.srcObject = null;
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: cameraEnabled,
                    audio: microphoneEnabled
                });

                if (mounted) {
                    streamRef.current = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } else {
                    stream.getTracks().forEach(t => t.stop());
                }

            } catch (err) {
                console.error("Error accessing media", err);
            }
        }

        initPreview();
        return () => {
            mounted = false;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        }
    }, [cameraEnabled, microphoneEnabled]);

    // NIID Auth check removed

    const handleJoin = () => {
        if (name.trim()) {
            onJoin({ cameraEnabled, microphoneEnabled, name });
        }
    };

    const handleGoBack = () => {
        window.location.href = '/';
    };

    return (
        <div className="h-screen w-full relative overflow-hidden bg-background">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a0f0a] via-[#2d1812] to-[#0a0503]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(139,69,19,0.15),transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(101,67,33,0.1),transparent_50%)]" />
            </div>

            <div className="relative z-10 h-full flex flex-col p-4 md:p-6 lg:p-8">
                <button
                    onClick={handleGoBack}
                    className="absolute top-4 left-4 md:top-8 md:left-8 text-white/70 hover:text-white transition-colors flex items-center gap-2 z-20"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm">Назад</span>
                </button>

                <div className="flex-1 flex items-center justify-center">
                    <div className="w-full max-w-6xl">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12">
                            <div className="flex flex-col justify-center space-y-4 md:space-y-6 order-2 lg:order-1">
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-semibold text-white mb-2">Подготовка к встрече</h2>
                                    <p className="text-white/60 text-xs md:text-sm">Проверьте настройки перед подключением</p>
                                </div>

                                <div className="space-y-2 md:space-y-3">
                                    <label className="block text-sm font-medium text-white/90">Ваше имя</label>
                                    <input
                                        className="w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg px-3 md:px-4 py-2.5 md:py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all text-sm md:text-base"
                                        placeholder="Введите ваше имя"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && name.trim() && handleJoin()}
                                        autoFocus
                                    />
                                </div>

                                <div className="flex gap-3 md:gap-4">
                                    <button
                                        onClick={() => setCameraEnabled(!cameraEnabled)}
                                        className={`flex-1 flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 md:py-3 rounded-lg font-medium transition-all min-h-[44px] ${cameraEnabled
                                            ? 'bg-white/10 hover:bg-white/15 text-white border border-white/20'
                                            : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
                                            }`}
                                    >
                                        {cameraEnabled ? (
                                            <Video className="w-4 h-4 md:w-5 md:h-5" />
                                        ) : (
                                            <VideoOff className="w-4 h-4 md:w-5 md:h-5" />
                                        )}
                                        <span className="text-sm md:text-base">Камера</span>
                                    </button>

                                    <button
                                        onClick={() => setMicrophoneEnabled(!microphoneEnabled)}
                                        className={`flex-1 flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 md:py-3 rounded-lg font-medium transition-all min-h-[44px] ${microphoneEnabled
                                            ? 'bg-white/10 hover:bg-white/15 text-white border border-white/20'
                                            : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
                                            }`}
                                    >
                                        {microphoneEnabled ? (
                                            <Mic className="w-4 h-4 md:w-5 md:h-5" />
                                        ) : (
                                            <MicOff className="w-4 h-4 md:w-5 md:h-5" />
                                        )}
                                        <span className="text-sm md:text-base">Микрофон</span>
                                    </button>
                                </div>

                                <button
                                    onClick={handleJoin}
                                    disabled={!name.trim()}
                                    className="w-full bg-white text-gray-900 py-2.5 md:py-3 rounded-lg font-semibold hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all disabled:hover:bg-white min-h-[44px] text-sm md:text-base"
                                >
                                    Подключиться
                                </button>

                                <div className="pt-2">
                                    {/* NIID Login removed for migration */}
                                </div>
                            </div>

                            <div className="order-1 lg:order-2">
                                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl md:rounded-2xl overflow-hidden aspect-video relative">
                                    {cameraEnabled ? (
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            muted
                                            playsInline
                                            className="w-full h-full object-cover -scale-x-100"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-white/0">
                                            <div className="w-16 h-16 md:w-24 md:h-24 bg-white/10 rounded-full flex items-center justify-center border-2 border-white/20">
                                                <span className="text-2xl md:text-4xl text-white font-semibold">
                                                    {name?.[0]?.toUpperCase() || '?'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 bg-black/60 backdrop-blur-sm text-white px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-xs font-medium">
                                        Предпросмотр
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
