import React from 'react';
import { Box, Input } from '@nicorp/nui';
import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

export default function SearchBar({ value, onChange, className }: SearchBarProps) {
  return (
    <Box className={`relative ${className || ''}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
      <Input
        placeholder="Search meetings..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10"
      />
    </Box>
  );
}
