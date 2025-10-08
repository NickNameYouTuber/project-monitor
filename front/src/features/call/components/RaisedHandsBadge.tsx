import React from 'react';
import { Hand } from 'lucide-react';
import { Participant } from '../types/call.types';

interface RaisedHandsBadgeProps {
  participants: Map<string, Participant>;
  raisedHands: Set<string>;
}

const RaisedHandsBadge: React.FC<RaisedHandsBadgeProps> = ({ participants, raisedHands }) => {
  // Получаем участников с поднятыми руками
  const participantsWithRaisedHands = Array.from(participants.values()).filter(
    (p) => raisedHands.has(p.socketId)
  );
  
  // Добавляем локального пользователя если он поднял руку
  const hasLocalRaisedHand = raisedHands.has('local');
  if (hasLocalRaisedHand) {
    participantsWithRaisedHands.unshift({
      socketId: 'local',
      userId: 'local',
      username: 'Вы',
      mediaState: { camera: false, microphone: false, screen: false }
    });
  }

  if (participantsWithRaisedHands.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-20 left-4 bg-yellow-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg shadow-lg border-2 border-yellow-400 z-20 animate-pulse">
      <div className="flex items-center gap-2">
        <Hand className="w-5 h-5" />
        <div className="text-sm font-medium">
          {participantsWithRaisedHands.length === 1 ? (
            <span>{participantsWithRaisedHands[0].username} поднял руку</span>
          ) : (
            <span>{participantsWithRaisedHands.length} участников подняли руку</span>
          )}
        </div>
      </div>
      {participantsWithRaisedHands.length > 1 && (
        <div className="mt-1 text-xs opacity-90">
          {participantsWithRaisedHands.map((p) => p.username).join(', ')}
        </div>
      )}
    </div>
  );
};

export default React.memo(RaisedHandsBadge);

