import React from 'react';
import { Button } from './ui/button';
import { Sparkles } from 'lucide-react';
import { cn } from './ui/utils';

interface AIAssistantButtonProps {
  onClick: () => void;
  hasUnreadMessages?: boolean;
}

export function AIAssistantButton({ onClick, hasUnreadMessages = false }: AIAssistantButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full justify-start gap-2 relative"
      onClick={onClick}
    >
      <Sparkles className="w-4 h-4" />
      <span>AI Assistant</span>
      {hasUnreadMessages && (
        <span className={cn(
          "absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"
        )} />
      )}
    </Button>
  );
}
