import React, { useState, useEffect } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Check, ChevronsUpDown, X, UserPlus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { listUsers, UserDto } from '../../api/users';

interface UserAutocompleteProps {
  selectedUsers: UserDto[];
  onUsersChange: (users: UserDto[]) => void;
  excludeUserIds?: string[];
  label?: string;
}

export default function UserAutocomplete({ 
  selectedUsers, 
  onUsersChange, 
  excludeUserIds = [],
  label = 'Участники'
}: UserAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Загрузка пользователей
  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const allUsers = await listUsers(100);
        // Фильтруем исключенных
        setUsers(allUsers.filter(u => !excludeUserIds.includes(u.id)));
      } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (open) {
      loadUsers();
    }
  }, [open, excludeUserIds]);

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
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      
      {/* Список выбранных участников */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
          {selectedUsers.map(user => (
            <Badge key={user.id} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px]">{getUserInitials(user)}</AvatarFallback>
              </Avatar>
              <span className="text-sm">{user.displayName || user.username}</span>
              <button
                onClick={() => handleRemove(user.id)}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Popover для выбора */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              {selectedUsers.length === 0 
                ? 'Добавить участников...' 
                : `Выбрано: ${selectedUsers.length}`
              }
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Поиск пользователей..." />
            <CommandList>
              {isLoading ? (
                <div className="p-4 text-sm text-center text-muted-foreground">
                  Загрузка...
                </div>
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
                          <div className="flex items-center gap-2 flex-1">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">{getUserInitials(user)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="text-sm font-medium">{user.displayName || user.username}</div>
                              {user.displayName && (
                                <div className="text-xs text-muted-foreground">@{user.username}</div>
                              )}
                            </div>
                            <Check
                              className={cn(
                                "h-4 w-4",
                                isSelected ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </div>
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
    </div>
  );
}

