import React from 'react';
import { Box, Grid } from '@nicorp/nui';

export default function MeetingColorPicker({ colors, value, onChange }: {
  colors: { name: string; value: string }[];
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <Grid className="grid-cols-4 gap-2 mt-2">
      {colors.map((color, index) => (
        <Box
          as="button"
          key={index}
          type="button"
          className={`w-full h-8 rounded border-2 transition-all ${value === color.value
              ? 'border-white ring-2 ring-primary'
              : 'border-transparent hover:border-white/50'
            }`}
          style={{ backgroundColor: color.value }}
          onClick={() => onChange(color.value)}
          title={color.name}
        >
          <span className="sr-only">{color.name}</span>
        </Box>
      ))}
    </Grid>
  );
}


