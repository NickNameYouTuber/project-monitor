import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';

interface MeetingFiltersProps {
  statusFilter: 'all' | 'scheduled' | 'active' | 'completed' | 'cancelled';
  onStatusFilterChange: (filter: 'all' | 'scheduled' | 'active' | 'completed' | 'cancelled') => void;
}

export default function MeetingFilters({ statusFilter, onStatusFilterChange }: MeetingFiltersProps) {
  return (
    <div className="flex items-center gap-4 px-6 py-3 border-b border-border bg-background">
      <span className="text-sm font-medium text-muted-foreground">Фильтр:</span>
      <ToggleGroup 
        type="single" 
        value={statusFilter} 
        onValueChange={(value) => value && onStatusFilterChange(value as any)}
        className="rounded-lg p-1 bg-muted/50"
      >
        <ToggleGroupItem 
          value="all" 
          aria-label="Все звонки" 
          className="px-4 py-1.5 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm"
        >
          Все
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="scheduled" 
          aria-label="Запланированные" 
          className="px-4 py-1.5 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm"
        >
          Предстоящие
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="active" 
          aria-label="Активные" 
          className="px-4 py-1.5 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm"
        >
          Идут сейчас
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="completed" 
          aria-label="Завершенные" 
          className="px-4 py-1.5 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm"
        >
          Завершенные
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="cancelled" 
          aria-label="Отмененные" 
          className="px-4 py-1.5 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm"
        >
          Отмененные
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

