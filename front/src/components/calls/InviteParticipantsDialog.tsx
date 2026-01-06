import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import UserAutocomplete from '@/components/calls/UserAutocomplete';
import { UserDto } from '@/api/users';
import { useParams } from 'react-router-dom';
import { apiClient } from '@/api/client';

interface InviteParticipantsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    callId: string;
    excludeUserIds?: string[];
}

export const InviteParticipantsDialog: React.FC<InviteParticipantsDialogProps> = ({ isOpen, onClose, callId, excludeUserIds = [] }) => {
    const [selectedUsers, setSelectedUsers] = useState<UserDto[]>([]);
    const [isInviting, setIsInviting] = useState(false);

    const handleInvite = async () => {
        if (selectedUsers.length === 0) return;

        setIsInviting(true);
        try {
            // Add each user to the call
            await Promise.all(selectedUsers.map(user =>
                apiClient.post(`/calls/${callId}/participants`, {
                    userId: user.id,
                    role: 'PARTICIPANT'
                })
            ));

            // Optionally, we could notify them via WebSocket here if needed, 
            // but usually the backend handles notifications when a participant is added.

            onClose();
            setSelectedUsers([]);
        } catch (error) {
            console.error('Failed to invite participants', error);
            // You might want to show a toast error here
        } finally {
            setIsInviting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Пригласить участников</DialogTitle>
                    <DialogDescription>
                        Выберите пользователей, которых вы хотите добавить к этому звонку.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <UserAutocomplete
                        selectedUsers={selectedUsers}
                        onUsersChange={setSelectedUsers}
                        excludeUserIds={excludeUserIds}
                        label="Поиск пользователей"
                    />
                </div>

                <DialogFooter className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>
                        Отмена
                    </Button>
                    <Button
                        onClick={handleInvite}
                        disabled={selectedUsers.length === 0 || isInviting}
                    >
                        {isInviting ? 'Приглашение...' : 'Пригласить'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
