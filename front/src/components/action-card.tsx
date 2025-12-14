import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActionCardProps {
  message: string;
  link: string;
  linkText: string;
  type?: 'success' | 'info' | 'warning';
}

export function ActionCard({ message, link, linkText, type = 'success' }: ActionCardProps) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (link) {
      navigate(link);
    }
  };

  return (
    <Card className="mt-2 bg-card border-border">
      <CardContent className="p-3 flex flex-col gap-2">
        <span className="text-sm text-foreground">{message}</span>
        <Button
          size="sm"
          variant="outline"
          onClick={handleClick}
          className="flex items-center gap-1 w-full sm:w-auto self-start"
        >
          <ExternalLink className="w-3 h-3" />
          {linkText}
        </Button>
      </CardContent>
    </Card>
  );
}
