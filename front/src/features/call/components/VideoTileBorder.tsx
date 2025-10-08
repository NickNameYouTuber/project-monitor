import React from 'react';
import { Hand } from 'lucide-react';

interface VideoTileBorderProps {
  isSpeaking?: boolean;
  isHandRaised?: boolean;
}

const VideoTileBorder: React.FC<VideoTileBorderProps> = ({ isSpeaking = false, isHandRaised = false }) => {
  // Рисуем оверлей-рамку поверх видеоплитки без влияния на layout и события мыши
  const ringClass = isHandRaised
    ? 'ring-4 ring-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.6)]'
    : isSpeaking
      ? 'ring-4 ring-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]'
      : 'ring-0';

  return (
    <>
      {/* Рамка */}
      <div className={`pointer-events-none absolute inset-0 rounded-lg ${ringClass}`} />

      {/* Иконка поднятой руки */}
      {isHandRaised && (
        <div className="pointer-events-none absolute top-2 left-2 sm:top-3 sm:left-3 bg-yellow-500 p-2 rounded-full shadow-lg animate-pulse">
          <Hand className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
      )}
    </>
  );
};

export default React.memo(VideoTileBorder);


