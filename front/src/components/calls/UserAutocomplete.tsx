import React, { useState, useEffect } from 'react';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
  Popover, PopoverContent, PopoverTrigger, Button, Badge, Avatar, AvatarFallback, cn,
  Box, Flex, Text, Label
} from '@nicorp/nui';
import { Check, ChevronsUpDown, X, UserPlus } from 'lucide-react';
import { UserDto } from '../../api/users';
import { getProjectUsers } from '../../api/project-users';
import { listMembers } from '../../api/organization-members';

interface UserAutocompleteProps {
  selectedUsers: UserDto[];
  onUsersChange: (users: UserDto[]) => void;
  excludeUserIds?: string[];
  label?: string;
  projectId?: string;
  organizationId?: string; // NEW: Filter by organization members
}

export default function UserAutocomplete({
  selectedUsers,
  onUsersChange,
  excludeUserIds = [],
  label = 'Участники',
  projectId,
  organizationId
}: UserAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const loadUsers = async () => {
      setIsLoading(true);
      try {
        let allUsers: UserDto[] = [];

        if (projectId) {
          // Load project users
          allUsers = await getProjectUsers(projectId);
        } else if (organizationId) {
          // Load organization members - PRIVACY FIX
          const members = await listMembers(organizationId);
          allUsers = members.map(m => ({
            id: m.user?.id || m.user_id,
            username: m.user?.username || '',
            displayName: m.user?.display_name
          }));
        } else {
          // No organization context - show empty (no access to all users)
          console.warn('UserAutocomplete: No organizationId provided, cannot load users');
          allUsers = [];
        }

        setUsers(allUsers.filter(u => !excludeUserIds.includes(u.id)));
      } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, [open, projectId, organizationId]);

  const handleSelect = (user: UserDto) => {
    const isSelected = selectedUsers.some(u => u.id === user.id);

    if (isSelected) {
      // Убрать пользователя
      onUsersChange(selectedUsers.filter(u => u.id !== user.id));
    } else {
      // Добавить пользователя
      onUsersChange([...selectedUsers, user]);
    }
  };

  const handleRemove = (userId: string) => {
    onUsersChange(selectedUsers.filter(u => u.id !== userId));
  };

  const getUserInitials = (user: UserDto) => {
    const name = user.displayName || user.username;
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Box className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}

      {/* Список выбранных участников */}
      {selectedUsers.length > 0 && (
        <Flex className="flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
          {selectedUsers.map(user => (
            <Badge key={user.id} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px]">{getUserInitials(user)}</AvatarFallback>
              </Avatar>
              <Text as="span" className="text-sm">{user.displayName || user.username}</Text>
              <button
                onClick={() => handleRemove(user.id)}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </Flex>
      )}

      {/* Popover для выбора */}
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <UserPlus className="h-4 w-4" />
              {selectedUsers.length === 0
                ? 'Select users...'
                : `${selectedUsers.length} user(s) selected`
              }
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Поиск пользователей..." />
            <CommandList className="max-h-[200px] overflow-y-auto">
              {isLoading ? (
                <Box className="p-4 text-sm text-center text-muted-foreground">
                  Загрузка...
                </Box>
              ) : (
                <>
                  <CommandEmpty>Пользователи не найдены</CommandEmpty>
                  <CommandGroup>
                    {users.map((user) => {
                      const isSelected = selectedUsers.some(u => u.id === user.id);

                      return (
                        <CommandItem
                          key={user.id}
                          value={user.username}
                          onSelect={() => handleSelect(user)}
                        >
                          <Flex className="items-center gap-2 flex-1">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">{getUserInitials(user)}</AvatarFallback>
                            </Avatar>
                            <Box className="flex-1">
                              <Text className="text-sm font-medium">{user.displayName || user.username}</Text>
                              {user.displayName && (
                                <Text className="text-xs text-muted-foreground">@{user.username}</Text>
                              )}
                            </Box>
                            <Check
                              className={cn(
                                "h-4 w-4",
                                isSelected ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </Flex>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </Box>
  );
}

