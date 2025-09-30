import React from 'react';

export default function UpcomingOverlay({ open, onClick }: { open: boolean; onClick: () => void }) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 bg-black/20 z-10" onClick={onClick} />
  );
}


