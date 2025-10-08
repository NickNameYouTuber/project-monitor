import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Video } from 'lucide-react';

interface MeetingsListProps {
  items: { id: string; title: string; date: Date; duration: number; color?: string; roomId?: string; status?: string }[];
  activeTab?: 'calendar' | 'list';
  onTabChange?: (tab: 'calendar' | 'list') => void;
  onJoinCall?: (roomId: string) => void;
}

export default function MeetingsList({ items, activeTab = 'list', onTabChange, onJoinCall }: MeetingsListProps) {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header с табами */}
      {onTabChange && (
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-none bg-transparent p-0">
              <button
                onClick={() => onTabChange('calendar')}
                className={`inline-flex items-center justify-center px-3 py-2 text-sm font-medium transition-all rounded-none border-b-2 ${
                  activeTab === 'calendar'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => onTabChange('list')}
                className={`inline-flex items-center justify-center px-3 py-2 text-sm font-medium transition-all rounded-none border-b-2 ${
                  activeTab === 'list'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Список встреч */}
      <div className="flex-1 overflow-y-auto p-6">
        {!items.length ? (
          <div className="text-center text-muted-foreground py-12">No meetings scheduled</div>
        ) : (
          <div className="space-y-4">
            {items.map((meeting) => (
              <Card key={meeting.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: meeting.color }} />
                      {meeting.title}
                    </CardTitle>
                    {meeting.roomId && meeting.status !== 'completed' && meeting.status !== 'cancelled' && onJoinCall && (
                      <Button
                        size="sm"
                        onClick={() => onJoinCall(meeting.roomId!)}
                        className="flex items-center gap-2"
                      >
                        <Video className="w-4 h-4" />
                        Join Call
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {meeting.date.toLocaleString()} — {meeting.duration} min
                  {meeting.status && (
                    <span className="ml-2 px-2 py-0.5 rounded text-xs bg-muted">
                      {meeting.status}
                    </span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


