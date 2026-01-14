import React, { useState, useEffect } from 'react';
import { CallResponse, CallParticipant, getCallParticipants } from '../../api/calls';
import { X, Video, Calendar, Clock, Users, Tag, Copy, Check } from 'lucide-react';
import { Button, Avatar, AvatarFallback, Box, Flex, Heading, Text, VStack } from '@nicorp/nui';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface CallDetailsPanelProps {
  call: CallResponse | null;
  open: boolean;
  onClose: () => void;
  onJoinCall: (roomId: string) => void;
}

const CallDetailsPanel: React.FC<CallDetailsPanelProps> = ({ call, open, onClose, onJoinCall }) => {
  const [copied, setCopied] = useState(false);
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  useEffect(() => {
    if (!call || !open) return;

    const loadParticipants = async () => {
      setLoadingParticipants(true);
      try {
        if (call.participants && call.participants.length > 0) {
          setParticipants(call.participants);
        } else {
          const data = await getCallParticipants(call.id);
          setParticipants(data);
        }
      } catch (error) {
        console.error('Ошибка загрузки участников:', error);
      } finally {
        setLoadingParticipants(false);
      }
    };

    loadParticipants();
  }, [call?.id, open]);

  if (!call) return null;

  const getStatusColor = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'SCHEDULED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'ACTIVE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 animate-pulse';
      case 'COMPLETED':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'SCHEDULED':
        return 'Запланирован';
      case 'ACTIVE':
        return 'Идет сейчас';
      case 'COMPLETED':
        return 'Завершен';
      case 'CANCELLED':
        return 'Отменен';
      default:
        return status || 'Неизвестно';
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'Не указано';
    try {
      const date = new Date(dateStr);
      return format(date, "d MMMM yyyy 'в' HH:mm", { locale: ru });
    } catch {
      return 'Неверная дата';
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'Не указано';
    if (minutes < 60) return `${minutes} минут`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} ч ${mins > 0 ? `${mins} мин` : ''}`;
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/call/${call.room_id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isJoinable = call.status?.toUpperCase() === 'SCHEDULED' || call.status?.toUpperCase() === 'ACTIVE';

  return (
    <>
      {/* Overlay */}
      <Box
        className={`fixed inset-0 bg-black/20 transition-opacity z-40 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={onClose}
      />

      {/* Panel */}
      <Flex
        className={`fixed top-0 right-0 h-full w-96 bg-background border-l border-border shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex-col ${open ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* Header */}
        <Flex className="items-center justify-between p-4 border-b border-border">
          <Heading level={3} className="text-lg font-semibold">Детали звонка</Heading>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </Flex>

        {/* Content */}
        <Box className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Title */}
          <Box>
            <Heading level={4} className="text-xl font-bold mb-2">{call.title || 'Без названия'}</Heading>
            <Text as="span" className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(call.status)}`}>
              {getStatusText(call.status)}
            </Text>
          </Box>

          {/* Description */}
          {call.description && (
            <Box>
              <Heading level={5} className="text-sm font-medium text-muted-foreground mb-1">Описание</Heading>
              <Text className="text-sm">{call.description}</Text>
            </Box>
          )}

          {/* Date & Time */}
          <VStack className="space-y-3">
            <Flex className="items-start gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
              <Box className="flex-1">
                <Text className="text-sm font-medium text-muted-foreground">Дата и время</Text>
                <Text className="text-sm">{formatDateTime(call.scheduled_time || call.start_at)}</Text>
              </Box>
            </Flex>

            <Flex className="items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
              <Box className="flex-1">
                <Text className="text-sm font-medium text-muted-foreground">Длительность</Text>
                <Text className="text-sm">{formatDuration(call.duration_minutes)}</Text>
              </Box>
            </Flex>
          </VStack>

          {/* Room ID */}
          <Flex className="items-start gap-3">
            <Tag className="w-5 h-5 text-muted-foreground mt-0.5" />
            <Box className="flex-1">
              <Text className="text-sm font-medium text-muted-foreground mb-1">ID комнаты</Text>
              <Flex className="items-center gap-2">
                <Box as="code" className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">{call.room_id}</Box>
                <button
                  onClick={copyRoomLink}
                  className="p-1.5 hover:bg-accent rounded transition"
                  title="Скопировать ссылку"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </Flex>
            </Box>
          </Flex>

          {/* Task ID */}
          {call.task_id && (
            <Flex className="items-start gap-3">
              <Tag className="w-5 h-5 text-muted-foreground mt-0.5" />
              <Box className="flex-1">
                <Text className="text-sm font-medium text-muted-foreground">Связанная задача</Text>
                <Box as="code" className="text-xs bg-muted px-2 py-1 rounded inline-block">{call.task_id}</Box>
              </Box>
            </Flex>
          )}

          {/* Project ID */}
          {call.project_id && (
            <Flex className="items-start gap-3">
              <Tag className="w-5 h-5 text-muted-foreground mt-0.5" />
              <Box className="flex-1">
                <Text className="text-sm font-medium text-muted-foreground">Проект</Text>
                <Box as="code" className="text-xs bg-muted px-2 py-1 rounded inline-block">{call.project_id}</Box>
              </Box>
            </Flex>
          )}

          {/* Participants */}
          <Flex className="items-start gap-3">
            <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
            <Box className="flex-1">
              <Text className="text-sm font-medium text-muted-foreground mb-2">Участники</Text>
              {loadingParticipants ? (
                <Text className="text-xs text-muted-foreground">Загрузка...</Text>
              ) : participants.length === 0 ? (
                <Text className="text-xs text-muted-foreground">Нет участников</Text>
              ) : (
                <VStack className="space-y-2">
                  {participants.map(p => (
                    <Flex key={p.id} className="items-center gap-2 text-sm">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">
                          {p.user.displayName?.[0] || p.user.username[0]}
                        </AvatarFallback>
                      </Avatar>
                      <Text as="span">{p.user.displayName || p.user.username}</Text>
                      {p.role === 'ORGANIZER' && (
                        <Text as="span" className="text-xs text-muted-foreground">(организатор)</Text>
                      )}
                    </Flex>
                  ))}
                </VStack>
              )}
            </Box>
          </Flex>

          {/* Created At */}
          {call.created_at && (
            <Text className="text-xs text-muted-foreground pt-4 border-t border-border">
              Создано: {formatDateTime(call.created_at)}
            </Text>
          )}
        </Box>

        {/* Footer Actions */}
        <Box className="p-4 border-t border-border space-y-2">
          {isJoinable && (
            <Button
              onClick={() => {
                onJoinCall(call.room_id);
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2"
              size="lg"
            >
              <Video className="w-5 h-5" />
              Присоединиться к звонку
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full"
          >
            Закрыть
          </Button>
        </Box>
      </Flex >
    </>
  );
};

export default CallDetailsPanel;

