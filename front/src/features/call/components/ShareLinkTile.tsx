import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InviteParticipantsDialog } from '@/components/calls/InviteParticipantsDialog';

interface ShareLinkTileProps {
    callId: string;
}

export const ShareLinkTile: React.FC<ShareLinkTileProps> = ({ callId }) => {
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

    return (
        <>
            <div className="relative w-full h-full bg-card rounded-lg overflow-hidden shadow-sm border border-border flex flex-col items-center justify-center p-6 text-center">
                <div className="max-w-xs space-y-4">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                        <UserPlus className="w-8 h-8 text-muted-foreground" />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold">
                            Вы один в этом звонке
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Пригласите коллег, чтобы начать обсуждение
                        </p>
                    </div>

                    <Button
                        onClick={() => setIsInviteDialogOpen(true)}
                        className="w-full"
                        size="lg"
                    >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Пригласить участников
                    </Button>
                </div>
            </div>

            <InviteParticipantsDialog
                isOpen={isInviteDialogOpen}
                onClose={() => setIsInviteDialogOpen(false)}
                callId={callId}
            />
        </>
    );
};

