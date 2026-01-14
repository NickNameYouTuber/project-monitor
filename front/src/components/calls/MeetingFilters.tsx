import React from 'react';
import { ToggleGroup, ToggleGroupItem, cn } from '@nicorp/nui';

export interface MeetingFiltersProps {
  statusFilter: 'all' | 'scheduled' | 'active' | 'completed' | 'cancelled';
  onStatusFilterChange: (status: 'all' | 'scheduled' | 'active' | 'completed' | 'cancelled') => void;
  className?: string;
}

export default function MeetingFilters({ statusFilter, onStatusFilterChange, className }: MeetingFiltersProps) {
  const statuses = [
    { value: "all", label: "Все", ariaLabel: "Все звонки" },
    { value: "scheduled", label: "Предстоящие", ariaLabel: "Запланированные" },
    { value: "active", label: "Идут сейчас", ariaLabel: "Активные" },
    { value: "completed", label: "Завершенные", ariaLabel: "Завершенные" },
    { value: "cancelled", label: "Отмененные", ariaLabel: "Отмененные" },
  ];

  return (
    <div className={cn("flex items-center gap-4 py-1 bg-background", className)}>
      <span className="text-sm font-medium text-muted-foreground mr-2">Фильтр:</span>
      <ToggleGroup
        type="single"
        value={statusFilter}
        onValueChange={(val: string) => val && onStatusFilterChange(val as any)}
        className="rounded-lg p-1 bg-muted/50"
      >
        {statuses.map((status) => (
          <ToggleGroupItem
            key={status.value}
            value={status.value}
            aria-label={status.ariaLabel}
            className="px-3 py-1.5 text-xs sm:text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm"
          >
            {status.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
