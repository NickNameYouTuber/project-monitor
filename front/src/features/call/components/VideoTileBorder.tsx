import React from 'react';
import { Hand } from 'lucide-react';
import { cn } from '@nicorp/nui';

interface VideoTileBorderProps {
    isSpeaking: boolean;
    isHandRaised: boolean;
}

export const VideoTileBorder: React.FC<VideoTileBorderProps> = ({ isSpeaking, isHandRaised }) => {
    return (
        <>
            <div
                className={cn(
                    "absolute inset-0 pointer-events-none rounded-lg transition-all duration-200 z-10",
                    isHandRaised && "border-4 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.6)]",
                    !isHandRaised && isSpeaking && "border-4 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]"
                )}
            />

            {isHandRaised && (
                <div
                    className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-yellow-500 p-2 rounded-full shadow-lg animate-pulse pointer-events-none z-20"
                >
                    <Hand className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
            )}
        </>
    );
};
