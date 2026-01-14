import React from 'react';
import { Button, ScrollArea } from '@nicorp/nui';
import { Clock, Video, X } from 'lucide-react';

export default function UpcomingPanel({ open, onClose, items, onStart }: {
  open: boolean;
  onClose: () => void;
  items: { id: string; title: string; date: Date; color?: string }[];
  onStart: (id: string) => void;
}) {
  return (
    <div className={`absolute top-0 right-0 h-full w-80 bg-background border-l border-border transition-transform duration-300 ease-in-out z-20 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Upcoming Meetings
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-3">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming meetings</p>
            ) : (
              items.map((meeting) => (
                <div key={meeting.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: meeting.color || 'rgba(59, 130, 246, 0.8)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{meeting.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {meeting.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => onStart(meeting.id)}>
                    <Video className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}


