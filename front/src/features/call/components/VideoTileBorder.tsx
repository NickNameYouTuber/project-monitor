import React from 'react';

interface VideoTileBorderProps {
  isSpeaking: boolean;
  isHandRaised: boolean;
}

/**
 * Отдельный компонент для обводки плитки видео.
 * Перерисовывается независимо от VideoTile, чтобы избежать моргания видео.
 */
const VideoTileBorder: React.FC<VideoTileBorderProps> = ({ isSpeaking, isHandRaised }) => {
  return (
    <div 
      className={`absolute inset-0 pointer-events-none transition-all duration-200 rounded-lg ${
        isHandRaised
          ? 'border-4 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.6)]'
          : isSpeaking 
            ? 'border-4 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]' 
            : 'border border-border'
      }`}
    />
  );
};

export default React.memo(VideoTileBorder);

