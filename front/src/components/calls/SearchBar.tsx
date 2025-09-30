import React from 'react';
import { Search } from 'lucide-react';
import { Button } from '../ui/button';

export default function SearchBar({ value, onChange, onToggleUpcoming, upcomingCount }: {
  value: string;
  onChange: (v: string) => void;
  onToggleUpcoming: () => void;
  upcomingCount: number;
}) {
  return (
    <div className="flex items-center gap-4 w-full">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          placeholder="Search meetings..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10 w-full h-10 rounded border bg-background"
        />
      </div>
      <Button variant="outline" size="sm" onClick={onToggleUpcoming} className="flex items-center gap-2">
        Upcoming ({upcomingCount})
      </Button>
    </div>
  );
}


