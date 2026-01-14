import React, { useState } from 'react';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
    Button, Badge, Avatar, AvatarFallback
} from '@nicorp/nui';
import UserAutocomplete from './UserAutocomplete';
import { UserDto } from '../../api/users';
import { apiClient } from '../../api/client';
import { getCall, getByRoomId, CallParticipant } from '../../api/calls';

interface InviteParticipantsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    callId: string;
    excludeUserIds?: string[];
}

export const InviteParticipantsDialog: React.FC<InviteParticipantsDialogProps> = ({ isOpen, onClose, callId, excludeUserIds = [] }) => {
    const [selectedUsers, setSelectedUsers] = useState<UserDto[]>([]);
    const [existingParticipants, setExistingParticipants] = useState<CallParticipant[]>([]);
    const [isInviting, setIsInviting] = useState(false);

    React.useEffect(() => {
        if (isOpen && callId) {
            const loadCall = async () => {
                try {
                    // Try by RoomID first as it's the primary identifier in calls
                    let call = await getByRoomId(callId).catch(() => null);
                    if (!call) {
                        call = await getCall(callId).catch(() => null);
                    }

                    if (call && call.participants) {
                        setExistingParticipants(call.participants);
                    }
                } catch (e) {
                    console.error("Failed to load call details", e);
                }
            };
            loadCall();
        }
    }, [isOpen, callId]);

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

            onClose();
            setSelectedUsers([]);
            // Refresh logic could go here
        } catch (error) {
            console.error('Failed to invite participants', error);
        } finally {
            setIsInviting(false);
        }
    };

    const allExcludedIds = [...excludeUserIds, ...existingParticipants.map(p => p.user.id)];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Пригласить участников</DialogTitle>
                    <DialogDescription>
                        Выберите пользователей, которых вы хотите добавить к этому звонку.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <UserAutocomplete
                        selectedUsers={selectedUsers}
                        onUsersChange={setSelectedUsers}
                        excludeUserIds={allExcludedIds}
                        label="Поиск пользователей"
                    />

                    {existingParticipants.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">Уже приглашены</h4>
                            <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto">
                                {existingParticipants.map(p => (
                                    <Badge key={p.id} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-2 opacity-70">
                                        <Avatar className="h-4 w-4">
                                            <AvatarFallback className="text-[9px]">{p.user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs">{p.user.displayName || p.user.username}</span>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
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
