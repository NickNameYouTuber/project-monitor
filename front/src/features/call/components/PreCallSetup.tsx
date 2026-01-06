import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, ArrowLeft, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
        window.location.href = '/';
    };

    return (
        <div className="min-h-screen w-full flex flex-col bg-background">
            {/* Header / Nav */}
            <div className="p-4 md:p-6">
                <Button variant="ghost" onClick={handleGoBack} className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Назад
                </Button>
            </div>

            <div className="flex-1 flex items-center justify-center p-4">
                <Card className="w-full max-w-5xl border-border/50 shadow-xl">
                    <CardContent className="p-6 md:p-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                            {/* Preview Area */}
                            <div className="order-1 lg:order-2">
                                <div className="aspect-video bg-muted rounded-xl overflow-hidden relative shadow-inner border border-border">
                                    {cameraEnabled ? (
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            muted
                                            playsInline
                                            className="w-full h-full object-cover -scale-x-100"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-secondary/30">
                                            <Avatar className="w-24 h-24 md:w-32 md:h-32 mb-4">
                                                <AvatarFallback className="text-4xl">
                                                    {defaultName[0]?.toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <p className="text-muted-foreground font-medium">Камера отключена</p>
                                        </div>
                                    )}

                                    <div className="absolute top-4 right-4 flex gap-2">
                                        {!microphoneEnabled && (
                                            <div className="bg-destructive/90 text-destructive-foreground p-2 rounded-full shadow-sm">
                                                <MicOff className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-md border border-border/50">
                                        <span className="text-sm font-medium">{defaultName} (Вы)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Controls Area */}
                            <div className="flex flex-col justify-center space-y-8 order-2 lg:order-1">
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight mb-2">Готовы присоединиться?</h1>
                                    <p className="text-muted-foreground text-lg">
                                        Настройте камеру и микрофон перед входом во встречу.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${microphoneEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                {microphoneEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <div className="font-medium">Микрофон</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {microphoneEnabled ? 'Включен' : 'Выключен'}
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant={microphoneEnabled ? "default" : "secondary"}
                                            onClick={() => setMicrophoneEnabled(!microphoneEnabled)}
                                        >
                                            {microphoneEnabled ? "Выключить" : "Включить"}
                                        </Button>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${cameraEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                {cameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <div className="font-medium">Камера</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {cameraEnabled ? 'Включена' : 'Выключена'}
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant={cameraEnabled ? "default" : "secondary"}
                                            onClick={() => setCameraEnabled(!cameraEnabled)}
                                        >
                                            {cameraEnabled ? "Выключить" : "Включить"}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4">
                                    <Button
                                        size="lg"
                                        className="w-full text-lg h-14"
                                        onClick={handleJoin}
                                    >
                                        Присоединиться сейчас
                                    </Button>
                                    <p className="text-xs text-center text-muted-foreground">
                                        Вы войдете как <span className="font-medium text-foreground">{defaultName}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
