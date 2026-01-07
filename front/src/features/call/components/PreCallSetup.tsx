import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, ArrowLeft } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';
import { Switch } from '../../../components/ui/switch';
import { cn } from '../../../components/ui/utils';

interface PreCallSetupProps {
    onJoin: (settings: { cameraEnabled: boolean; microphoneEnabled: boolean; name: string }) => void;
    defaultName?: string;
}

export const PreCallSetup: React.FC<PreCallSetupProps> = ({ onJoin, defaultName = 'User' }) => {
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
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

    const handleJoin = () => {
        onJoin({ cameraEnabled, microphoneEnabled, name: defaultName });
    };

    const handleGoBack = () => {
        // Try to go back in history first, if it fails or if it's an external link, go to base
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = '/';
        }
    };

    return (
        <div className="h-screen w-full bg-background flex flex-col overflow-y-auto">
            <div className="p-4 md:p-6 sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
                <Button variant="ghost" onClick={handleGoBack} className="gap-2 pl-0 hover:pl-2 transition-all">
                    <ArrowLeft className="w-4 h-4" />
                    Назад
                </Button>
            </div>

            <div className="flex-1 flex flex-col items-center p-4 pb-10">
                <div className="w-full max-w-5xl">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                        {/* Preview Area */}
                        <div className="order-1 lg:order-2 w-full">
                            <div className="aspect-video bg-muted rounded-2xl overflow-hidden relative shadow-lg ring-1 ring-white/10">
                                {cameraEnabled ? (
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                        className="w-full h-full object-cover -scale-x-100"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-card">
                                        <Avatar className="w-24 h-24 md:w-32 md:h-32 mb-4">
                                            <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                                                {defaultName[0]?.toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <p className="text-muted-foreground font-medium">Камера выключена</p>
                                    </div>
                                )}

                                <div className="absolute top-4 right-4 flex gap-2">
                                    {!microphoneEnabled && (
                                        <div className="bg-destructive text-destructive-foreground p-2 rounded-full shadow-md animate-in fade-in zoom-in duration-200">
                                            <MicOff className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>

                                <div className="absolute bottom-4 left-4 right-4 text-center">
                                    <span className="inline-block px-3 py-1 bg-background/60 backdrop-blur text-sm font-medium rounded-full shadow-sm border border-white/10">
                                        {defaultName}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Controls Area */}
                        <div className="flex flex-col justify-center space-y-8 order-2 lg:order-1">
                            <div className="space-y-2 text-center lg:text-left">
                                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Всё готово?</h1>
                                <p className="text-muted-foreground text-lg">
                                    Проверьте настройки перед подключением.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <Card className="border-none shadow-none bg-muted/40">
                                    <CardContent className="p-4 space-y-4">
                                        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-background transition-colors bg-background/50">
                                            <div className="flex items-center gap-4">
                                                <div className={cn("p-3 rounded-full transition-colors", microphoneEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                                                    {microphoneEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-semibold">Микрофон</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {microphoneEnabled ? "Включен" : "Выключен"}
                                                    </div>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={microphoneEnabled}
                                                onCheckedChange={setMicrophoneEnabled}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-background transition-colors bg-background/50">
                                            <div className="flex items-center gap-4">
                                                <div className={cn("p-3 rounded-full transition-colors", cameraEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                                                    {cameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-semibold">Камера</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {cameraEnabled ? "Включена" : "Выключена"}
                                                    </div>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={cameraEnabled}
                                                onCheckedChange={setCameraEnabled}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="pt-2">
                                <Button
                                    size="lg"
                                    className="w-full text-lg h-12 shadow-lg hover:shadow-xl transition-all"
                                    onClick={handleJoin}
                                >
                                    Присоединиться
                                </Button>
                            </div>
                        </div>
                    </div>
                </div >
            </div >
        </div >
    );
};
