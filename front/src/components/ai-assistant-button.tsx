import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button, cn } from '@nicorp/nui';
import { useAISidebar } from '../contexts/AISidebarContext';

interface AIAssistantButtonProps {
  className?: string;
  variant?: "default" | "ghost" | "outline" | "secondary";
  hasUnreadMessages?: boolean;
}

export function AIAssistantButton({ className, variant = "outline", hasUnreadMessages }: AIAssistantButtonProps) {
  const { toggleSidebar, isOpen } = useAISidebar();

  return (
    <Button
      variant={isOpen ? "secondary" : variant}
      size="sm"
      className={cn(
        "w-full justify-start gap-2 relative transition-all duration-300",
        isOpen && "bg-primary/10 text-primary hover:bg-primary/20",
        className
      )}
      onClick={toggleSidebar}
    >
      <div className={cn(
        "bg-primary text-primary-foreground p-0.5 rounded-sm transition-transform duration-500",
        isOpen && "rotate-180"
      )}>
        <Sparkles className="w-3.5 h-3.5" />
      </div>
      <span>AI Assistant</span>
      {hasUnreadMessages && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      )}
    </Button>
  );
}
