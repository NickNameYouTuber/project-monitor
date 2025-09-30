import React from 'react';
import { Button } from '../ui/button';
import { Plus } from 'lucide-react';

export default function CallsHeader({ onOpenNew }: { onOpenNew: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h1>Calls & Meetings</h1>
        <p className="text-muted-foreground">Schedule and manage your team meetings</p>
      </div>
      <Button onClick={onOpenNew}>
        <Plus className="w-4 h-4 mr-2" />
        New Meeting
      </Button>
    </div>
  );
}


