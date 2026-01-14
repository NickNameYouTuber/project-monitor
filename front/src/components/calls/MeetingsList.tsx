import React, { useMemo, useRef } from 'react';
import { Video, Calendar, Clock, MoreVertical, Copy, Trash2, Mic, Users, ArrowRight } from 'lucide-react';
import {
  Button, Badge, Avatar, AvatarFallback, cn,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
  Box, Flex, Heading, Text
} from '@nicorp/nui';

interface MeetingsListProps {
  items: {
    id: string;
    title: string;
    date: Date;
    duration: number;
    color?: string;
    roomId?: string;
    status?: string;
    description?: string;
    participants?: string[];
  }[];
  activeTab?: 'calendar' | 'list';
  onTabChange?: (tab: 'calendar' | 'list') => void;
  onJoinCall?: (roomId: string) => void;
  isLoading?: boolean;
  onCopyLink?: (roomId: string) => void;
}

export default function MeetingsList({ items, activeTab = 'list', onTabChange, onJoinCall, isLoading, onCopyLink }: MeetingsListProps) {

  // Вычисляем актуальный статус на основе времени
  const getActualStatus = (meeting: any) => {
    const now = new Date();
    const apiStatus = meeting.status?.toLowerCase();

    // Если API говорит completed/cancelled/active - верим ему
    if (apiStatus === 'completed' || apiStatus === 'cancelled' || apiStatus === 'active' || apiStatus === 'in-progress') {
      return apiStatus;
    }

    // Если scheduled, но время прошло - это "завершенный"
    if (apiStatus === 'scheduled' && meeting.date < now) {
      return 'completed';
    }

    return apiStatus || 'scheduled';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'in-progress':
        return <Badge className="bg-blue-500 hover:bg-blue-600 border-0">Live</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="border-green-500 text-green-500">Scheduled</Badge>;
      case 'completed':
        return <Badge variant="secondary">Finished</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="opacity-70">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCopyLink = (roomId: string) => {
    const link = `${window.location.origin}/call/${roomId}`;
    navigator.clipboard.writeText(link);
    if (onCopyLink) onCopyLink(roomId);
  };

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      // Active first
      const aStatus = getActualStatus(a);
      const bStatus = getActualStatus(b);
      if ((aStatus === 'active' || aStatus === 'in-progress') && (bStatus !== 'active' && bStatus !== 'in-progress')) return -1;
      if ((bStatus === 'active' || bStatus === 'in-progress') && (aStatus !== 'active' && aStatus !== 'in-progress')) return 1;

      // Then by date
      return b.date.getTime() - a.date.getTime();
    })
  }, [items]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!items.length) {
    return (
      <Flex className="flex-col items-center justify-center py-12 text-center h-full">
        <Flex className="w-16 h-16 bg-muted rounded-full items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-muted-foreground" />
        </Flex>
        <Heading level={4} className="text-xl font-semibold mb-2">No meetings found</Heading>
        <Text className="text-muted-foreground max-w-sm">
          Check back later or create a new meeting to get started.
        </Text>
      </Flex>
    )
  }

  return (
    <Box className="h-full overflow-y-auto p-6">
      <Box className="max-w-5xl mx-auto space-y-1">
        {sortedItems.map((meeting) => {
          const status = getActualStatus(meeting);
          const isJoinable = meeting.roomId && status !== 'completed' && status !== 'cancelled';
          const isLive = status === 'active' || status === 'in-progress';

          return (
            <Box
              key={meeting.id}
              className={cn(
                "group flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
                isLive
                  ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
                  : "bg-card hover:bg-muted/50 border-border"
              )}
            >
              <Flex className="items-center gap-4 flex-1 min-w-0">
                {/* Date Box */}
                <Flex className={cn(
                  "flex-col items-center justify-center w-14 h-14 rounded-lg bg-muted/50 border border-border flex-shrink-0",
                  isLive && "bg-blue-100/50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700"
                )}>
                  <Text className="text-xs font-semibold text-muted-foreground uppercase">{meeting.date.toLocaleDateString('en-US', { month: 'short' })}</Text>
                  <Text className="text-lg font-bold">{meeting.date.getDate()}</Text>
                </Flex>

                {/* Info */}
                <Flex className="flex-col min-w-0">
                  <Flex className="items-center gap-2 mb-1">
                    <Heading level={5} className="font-semibold text-base truncate">{meeting.title}</Heading>
                    {getStatusBadge(status)}
                  </Flex>
                  <Flex className="items-center gap-4 text-sm text-muted-foreground">
                    <Flex className="items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <Text as="span">
                        {meeting.date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        <Text as="span" className="mx-1">•</Text>
                        {meeting.duration} min
                      </Text>
                    </Flex>
                    {meeting.participants && meeting.participants.length > 0 && (
                      <Flex className="items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <Text as="span">{meeting.participants.length} invited</Text>
                      </Flex>
                    )}
                  </Flex>
                </Flex>
              </Flex>

              {/* Actions */}
              <Flex className="items-center gap-2 pl-4">
                {isJoinable && onJoinCall && (
                  <Button
                    onClick={() => onJoinCall(meeting.roomId!)}
                    size="sm"
                    className={cn(
                      "gap-2 shadow-sm",
                      isLive ? "bg-blue-600 hover:bg-blue-700 text-white" : ""
                    )}
                  >
                    {isLive ? (
                      <>Join Live <ArrowRight className="w-3 h-3" /></>
                    ) : (
                      "Start"
                    )}
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {meeting.roomId && (
                      <DropdownMenuItem onClick={() => handleCopyLink(meeting.roomId!)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Link
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Meeting
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Flex>
            </Box>
          );
        })}
      </Box>
    </Box >
  );
}


