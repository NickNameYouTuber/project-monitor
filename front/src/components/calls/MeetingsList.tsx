import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export default function MeetingsList({ items }: { items: { id: string; title: string; date: Date; duration: number; color?: string }[] }) {
  if (!items.length) {
    return <div className="text-center text-muted-foreground py-12">No meetings scheduled</div>;
  }
  return (
    <div className="space-y-4">
      {items.map((meeting) => (
        <Card key={meeting.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: meeting.color }} />
              {meeting.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {meeting.date.toLocaleString()} — {meeting.duration} min
          </CardContent>
        </Card>
      ))}
    </div>
  );
}


