import React from 'react';
import { Search } from 'lucide-react';
import { Button } from '../ui/button';

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  onToggleUpcoming: () => void;
  upcomingCount: number;
  className?: string; // Added prop
}

export default function SearchBar({ value, onChange, onToggleUpcoming, upcomingCount, className }: SearchBarProps) {
  return (
    <div className={`flex items-center gap-4 w-full ${className || ''}`}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          placeholder="Search meetings..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10"
        />
      </div>
      <Button variant="outline" size="sm" onClick={onToggleUpcoming} className="flex items-center gap-2">
        Upcoming ({upcomingCount})
      </Button>
    </div>
  );
}


