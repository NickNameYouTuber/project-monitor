import React from 'react';
import { Hand } from 'lucide-react';

interface VideoTileBorderProps {
  isSpeaking: boolean;
  isHandRaised: boolean;
}

/**
 * Изолированный компонент для отображения обводки и индикаторов.
 * Рендерится поверх VideoTile через Portal-like подход.
 * Не влияет на рендеринг видео.
 */
const VideoTileBorder: React.FC<VideoTileBorderProps> = ({ isSpeaking, isHandRaised }) => {
  return (
    <>
      {/* Обводка - абсолютное позиционирование поверх всего */}
      <div 
        className={`absolute inset-0 pointer-events-none rounded-lg transition-all duration-200 ${
          isHandRaised
            ? 'border-4 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.6)]'
            : isSpeaking 
              ? 'border-4 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]' 
              : ''
        }`}
        style={{ zIndex: 10 }}
      />
      
      {/* Иконка поднятой руки */}
      {isHandRaised && (
        <div 
          className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-yellow-500 p-2 rounded-full shadow-lg animate-pulse pointer-events-none"
          style={{ zIndex: 11 }}
        >
          <Hand className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
      )}
    </>
  );
};

export default React.memo(VideoTileBorder);

