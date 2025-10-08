import React, { useState, useRef, useEffect } from 'react';
import VideoTile from './VideoTile';
import VideoTileBorder from './VideoTileBorder';
import { Participant } from '../../types/call.types';
import { useAuth } from '../hooks/useAuth';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteVideoStreams: Map<string, MediaStream>;
  remoteAudioStreams: Map<string, MediaStream>;
  isCameraEnabled: boolean;
  isMicEnabled: boolean;
  participants: Map<string, Participant>;
  speakingParticipants: Set<string>;
  raisedHands: Set<string>;
  isScreenSharing?: boolean; // Новый проп для определения режима
}

const VideoGrid: React.FC<VideoGridProps> = ({ 
  localStream,
  remoteVideoStreams, 
  remoteAudioStreams,
  isCameraEnabled,
  isMicEnabled,
  participants,
  speakingParticipants,
  raisedHands,
  isScreenSharing = false
}) => {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  const uniqueParticipants = new Map<string, { socketId: string; username: string; mediaState: Participant['mediaState']; isGuest: boolean }>();
  
  participants.forEach((participant) => {
    if (participant.userId !== user?.id && !uniqueParticipants.has(participant.socketId)) {
      uniqueParticipants.set(participant.socketId, {
        socketId: participant.socketId,
        username: participant.username,
        mediaState: participant.mediaState,
        isGuest: participant.userId.startsWith('guest-')
      });
    }
  });

  // console.log('VideoGrid рендер:', {
  //   remoteVideoStreamsSize: remoteVideoStreams.size,
  //   remoteAudioStreamsSize: remoteAudioStreams.size,
  //   participantsSize: participants.size,
  //   uniqueParticipantsSize: uniqueParticipants.size,
  //   participantSocketIds: Array.from(participants.keys()),
  //   participantsData: Array.from(participants.values()).map(p => ({ socketId: p.socketId, userId: p.userId, username: p.username })),
  //   uniqueSocketIds: Array.from(uniqueParticipants.keys()),
  //   currentUserId: user?.id,
  //   isScreenSharing
  // });
  
  const totalParticipants = 1 + uniqueParticipants.size;

  // Минимальные размеры плитки
  const MIN_TILE_WIDTH = 300;
  const MIN_TILE_HEIGHT = MIN_TILE_WIDTH * (2 / 3); // Соотношение 4:3
  const TILE_GAP = 12;

  // Обновляем размер контейнера
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Вычисляем параметры сетки
  const calculateGridLayout = () => {
    if (containerSize.width === 0 || containerSize.height === 0) {
      return { cols: 1, rows: 1, tilesPerPage: 1, totalPages: 1, tileWidth: 0, tileHeight: 0 };
    }

    const availableWidth = containerSize.width - TILE_GAP * 2;
    const availableHeight = containerSize.height - TILE_GAP * 2;

    // Максимальное количество колонок и строк исходя из минимального размера
    const maxCols = Math.floor((availableWidth + TILE_GAP) / (MIN_TILE_WIDTH + TILE_GAP));
    const maxRows = Math.floor((availableHeight + TILE_GAP) / (MIN_TILE_HEIGHT + TILE_GAP));

    const tilesPerPage = maxCols * maxRows;
    const totalPages = Math.ceil(totalParticipants / tilesPerPage);

    // Определяем количество участников на текущей странице
    const participantsOnPage = Math.min(totalParticipants, tilesPerPage);

    // Находим оптимальную раскладку для текущей страницы
    let bestCols = 1;
    let bestRows = 1;
    let bestTileWidth = 0;
    let bestTileHeight = 0;

    // Перебираем возможные варианты раскладки
    for (let cols = 1; cols <= Math.min(maxCols, participantsOnPage); cols++) {
      const rows = Math.ceil(participantsOnPage / cols);
      
      if (rows > maxRows) continue;

      // Вычисляем размер плиток для этой раскладки
      // Пробуем заполнить по ширине
      let tileWidth = (availableWidth - (cols - 1) * TILE_GAP) / cols;
      let tileHeight = tileWidth * (2 / 3);

      // Проверяем влезает ли по высоте
      const totalHeight = rows * tileHeight + (rows - 1) * TILE_GAP;
      if (totalHeight > availableHeight) {
        // Пересчитываем по высоте
        tileHeight = (availableHeight - (rows - 1) * TILE_GAP) / rows;
        tileWidth = tileHeight * (3 / 2);
      }

      // Проверяем что влезает по ширине после пересчета
      const totalWidth = cols * tileWidth + (cols - 1) * TILE_GAP;
      if (totalWidth > availableWidth) {
        continue;
      }

      // Выбираем раскладку с максимальным размером плиток
      const tileArea = tileWidth * tileHeight;
      const bestArea = bestTileWidth * bestTileHeight;
      if (tileArea > bestArea) {
        bestCols = cols;
        bestRows = rows;
        bestTileWidth = tileWidth;
        bestTileHeight = tileHeight;
      }
    }

    return { 
      cols: bestCols, 
      rows: bestRows, 
      tilesPerPage, 
      totalPages, 
      tileWidth: bestTileWidth, 
      tileHeight: bestTileHeight 
    };
  };

  const gridLayout = calculateGridLayout();

  // Проверяем возможность прокрутки для горизонтального режима
  const checkScroll = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  useEffect(() => {
    if (isScreenSharing) {
      checkScroll();
      const container = containerRef.current;
      if (container) {
        container.addEventListener('scroll', checkScroll);
        window.addEventListener('resize', checkScroll);
        return () => {
          container.removeEventListener('scroll', checkScroll);
          window.removeEventListener('resize', checkScroll);
        };
      }
    }
  }, [totalParticipants, isScreenSharing]);

  // Навигация для горизонтального режима
  const handleScrollLeft = () => {
    if (containerRef.current) {
      const tileWidth = containerRef.current.clientHeight * (3 / 2);
      containerRef.current.scrollBy({ left: -tileWidth * 2, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (containerRef.current) {
      const tileWidth = containerRef.current.clientHeight * (3 / 2);
      containerRef.current.scrollBy({ left: tileWidth * 2, behavior: 'smooth' });
    }
  };

  // Навигация для режима сетки
  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(gridLayout.totalPages - 1, prev + 1));
  };

  // Сброс страницы если вышли за границы
  useEffect(() => {
    if (currentPage >= gridLayout.totalPages) {
      setCurrentPage(Math.max(0, gridLayout.totalPages - 1));
    }
  }, [gridLayout.totalPages, currentPage]);

  // Все участники (локальный + удаленные)
  const allParticipants = [
    {
      isLocal: true,
      videoStream: localStream,
      audioStream: null,
      isCameraEnabled,
      isMicEnabled,
      username: 'Вы',
      isGuest: false,
      socketId: 'local'
    },
    ...Array.from(uniqueParticipants.entries()).map(([socketId, participantData]) => ({
      isLocal: false,
      videoStream: remoteVideoStreams.get(participantData.socketId) || null,
      audioStream: remoteAudioStreams.get(participantData.socketId) || null,
      isCameraEnabled: participantData.mediaState.camera,
      isMicEnabled: participantData.mediaState.microphone,
      username: participantData.username,
      isGuest: participantData.isGuest,
      socketId
    }))
  ].sort((a, b) => {
    // Сортировка: участники с поднятой рукой выше
    const aHasRaisedHand = raisedHands.has(a.socketId);
    const bHasRaisedHand = raisedHands.has(b.socketId);
    
    if (aHasRaisedHand && !bHasRaisedHand) return -1;
    if (!aHasRaisedHand && bHasRaisedHand) return 1;
    
    // Локальный пользователь всегда первый (если нет поднятых рук)
    if (a.isLocal) return -1;
    if (b.isLocal) return 1;
    
    return 0;
  });

  // Получаем участников для текущей страницы
  const startIndex = currentPage * gridLayout.tilesPerPage;
  const endIndex = startIndex + gridLayout.tilesPerPage;
  const currentPageParticipants = allParticipants.slice(startIndex, endIndex);

  // РЕЖИМ 1: Горизонтальная полоса (когда есть screen share)
  if (isScreenSharing) {
    return (
      <div className="relative h-full w-full bg-background flex items-center">
        <div 
          ref={containerRef}
          className="flex gap-3 p-4 overflow-x-auto overflow-y-hidden h-full w-full scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {allParticipants.map((participant, index) => (
            <div 
              key={participant.socketId}
              className="flex-shrink-0 h-full relative"
              style={{ aspectRatio: '4/3' }}
            >
              <VideoTile
                videoStream={participant.videoStream}
                audioStream={participant.audioStream}
                isLocal={participant.isLocal}
                isCameraEnabled={participant.isCameraEnabled}
                isMicEnabled={participant.isMicEnabled}
                username={participant.isLocal ? undefined : participant.username}
                isGuest={participant.isGuest}
                isSpeaking={false}
                isHandRaised={false}
              />
              <VideoTileBorder 
                isSpeaking={speakingParticipants.has(participant.socketId)}
                isHandRaised={raisedHands.has(participant.socketId)}
              />
            </div>
          ))}
        </div>

        {canScrollLeft && (
          <button
            onClick={handleScrollLeft}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/80 hover:bg-black/90 text-white p-2 rounded-full transition z-10"
            aria-label="Прокрутить влево"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {canScrollRight && (
          <button
            onClick={handleScrollRight}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/80 hover:bg-black/90 text-white p-2 rounded-full transition z-10"
            aria-label="Прокрутить вправо"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    );
  }

  // РЕЖИМ 2: Адаптивная сетка (когда нет screen share)
  // Разбиваем участников по строкам
  const rows: typeof currentPageParticipants[] = [];
  for (let i = 0; i < currentPageParticipants.length; i += gridLayout.cols) {
    rows.push(currentPageParticipants.slice(i, i + gridLayout.cols));
  }

  return (
    <div ref={containerRef} className="relative h-full w-full bg-[#0a0a0a] overflow-hidden">
      <div className="flex flex-col items-center justify-center h-full w-full p-3 gap-3">
        {rows.map((row, rowIndex) => (
          <div 
            key={rowIndex} 
            className="flex items-center justify-center gap-3"
            style={{
              width: '100%',
            }}
          >
            {row.map((participant) => (
              <div 
                key={participant.socketId}
                className="flex-shrink-0 relative"
                style={{
                  width: `${gridLayout.tileWidth}px`,
                  height: `${gridLayout.tileHeight}px`
                }}
              >
                <VideoTile
                  videoStream={participant.videoStream}
                  audioStream={participant.audioStream}
                  isLocal={participant.isLocal}
                  isCameraEnabled={participant.isCameraEnabled}
                  isMicEnabled={participant.isMicEnabled}
                  username={participant.isLocal ? undefined : participant.username}
                  isGuest={participant.isGuest}
                  isSpeaking={false}
                  isHandRaised={false}
                />
                <VideoTileBorder 
                  isSpeaking={speakingParticipants.has(participant.socketId)}
                  isHandRaised={raisedHands.has(participant.socketId)}
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Навигация между страницами */}
      {gridLayout.totalPages > 1 && (
        <>
          {currentPage > 0 && (
            <button
              onClick={handlePrevPage}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/80 hover:bg-black/90 text-white p-3 rounded-full transition z-10"
              aria-label="Предыдущая страница"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {currentPage < gridLayout.totalPages - 1 && (
            <button
              onClick={handleNextPage}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/80 hover:bg-black/90 text-white p-3 rounded-full transition z-10"
              aria-label="Следующая страница"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Индикатор страниц */}
          <div className="absolute bottom-4 right-4 bg-black/80 px-3 py-1 rounded-lg">
            <span className="text-white text-sm">
              Страница {currentPage + 1} / {gridLayout.totalPages}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

// Мемоизация для предотвращения лишних рендеров
// speakingParticipants не влияет на структуру, только на VideoTileBorder внутри VideoTile
export default React.memo(VideoGrid, (prev, next) => {
  return (
    prev.localStream === next.localStream &&
    prev.remoteVideoStreams === next.remoteVideoStreams &&
    prev.remoteAudioStreams === next.remoteAudioStreams &&
    prev.isCameraEnabled === next.isCameraEnabled &&
    prev.isMicEnabled === next.isMicEnabled &&
    prev.participants === next.participants &&
    prev.isScreenSharing === next.isScreenSharing
    // speakingParticipants и raisedHands передаются в VideoTile, 
    // но VideoTile мемоизирован и не ререндерится, только VideoTileBorder обновляется
  );
});

