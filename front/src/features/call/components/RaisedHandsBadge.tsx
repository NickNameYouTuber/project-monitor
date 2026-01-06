import React from 'react';
import { Hand } from 'lucide-react';
import { Participant } from 'livekit-client';

interface RaisedHandsBadgeProps {
    participants: Participant[];
    raisedHands: Set<string>;
}

export const RaisedHandsBadge: React.FC<RaisedHandsBadgeProps> = ({ participants, raisedHands }) => {
    const participantsWithRaisedHands = participants.filter(
        (p) => raisedHands.has(p.identity)
    );

    if (participantsWithRaisedHands.length === 0) {
        return null;
    }

    return (
        <div className="fixed bottom-16 md:bottom-20 left-2 md:left-4 bg-yellow-500/90 backdrop-blur-sm text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg shadow-lg border-2 border-yellow-400 z-50 animate-pulse">
            <div className="flex items-center gap-2">
                <Hand className="w-4 h-4 md:w-5 md:h-5" />
                <div className="text-xs md:text-sm font-medium">
                    {participantsWithRaisedHands.length === 1 ? (
                        <span>{participantsWithRaisedHands[0].name || participantsWithRaisedHands[0].identity} raised hand</span>
                    ) : (
                        <span>{participantsWithRaisedHands.length} participants raised hand</span>
                    )}
                </div>
            </div>
        </div>
    );
};
