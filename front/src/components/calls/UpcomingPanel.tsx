import React from 'react';
import { Button, ScrollArea, Box, Flex, Heading, Text } from '@nicorp/nui';
import { Clock, Video, X } from 'lucide-react';

export default function UpcomingPanel({ open, onClose, items, onStart }: {
  open: boolean;
  onClose: () => void;
  items: { id: string; title: string; date: Date; color?: string }[];
  onStart: (id: string) => void;
}) {
  return (
    <Box className={`absolute top-0 right-0 h-full w-80 bg-background border-l border-border transition-transform duration-300 ease-in-out z-20 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
      <Flex className="p-6 h-full flex-col">
        <Flex className="items-center justify-between mb-4">
          <Heading level={4} className="flex items-center gap-2 text-lg font-semibold">
            <Clock className="w-5 h-5" />
            Upcoming Meetings
          </Heading>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </Flex>
        <ScrollArea className="flex-1">
          <Box className="space-y-3">
            {items.length === 0 ? (
              <Text className="text-sm text-muted-foreground">No upcoming meetings</Text>
            ) : (
              items.map((meeting) => (
                <Flex key={meeting.id} className="items-center gap-3 p-2 rounded hover:bg-muted">
                  <Box className="w-3 h-3 rounded-full" style={{ backgroundColor: meeting.color || 'rgba(59, 130, 246, 0.8)' }} />
                  <Box className="flex-1 min-w-0">
                    <Text className="text-sm font-medium truncate">{meeting.title}</Text>
                    <Text className="text-xs text-muted-foreground">
                      {meeting.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </Box>
                  <Button size="sm" variant="ghost" onClick={() => onStart(meeting.id)}>
                    <Video className="w-4 h-4" />
                  </Button>
                </Flex>
              ))
            )}
          </Box>
        </ScrollArea>
      </Flex>
    </Box>
  );
}


