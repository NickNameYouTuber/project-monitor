import React from 'react';
import { Box } from '@nicorp/nui';

export default function UpcomingOverlay({ open, onClick }: { open: boolean; onClick: () => void }) {
  if (!open) return null;
  return (
    <Box className="absolute inset-0 bg-black/20 z-10" onClick={onClick} />
  );
}


