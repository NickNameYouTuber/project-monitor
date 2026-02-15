import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn, Box, Heading, Text, Button } from '@nicorp/nui';
import { LucideIcon, PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon = PackageOpen,
  title,
  description,
  action,
  secondaryAction,
  children,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-16 px-6',
        className
      )}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={cn(
          'rounded-2xl bg-muted/50 border border-border/50 flex items-center justify-center',
          compact ? 'w-12 h-12 mb-3' : 'w-16 h-16 mb-5'
        )}
      >
        <Icon className={cn(
          'text-muted-foreground',
          compact ? 'w-6 h-6' : 'w-8 h-8'
        )} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Heading level={3} className={cn(
          'font-semibold',
          compact ? 'text-base' : 'text-lg'
        )}>
          {title}
        </Heading>
        {description && (
          <Text variant="muted" className={cn(
            'mt-1.5 max-w-sm mx-auto',
            compact ? 'text-xs' : 'text-sm'
          )}>
            {description}
          </Text>
        )}
      </motion.div>

      {(action || secondaryAction || children) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.35 }}
          className="mt-5 flex items-center gap-3"
        >
          {action && (
            <Button onClick={action.onClick} size="sm">
              {action.icon && <action.icon className="w-4 h-4 mr-2" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick} size="sm">
              {secondaryAction.label}
            </Button>
          )}
          {children}
        </motion.div>
      )}
    </motion.div>
  );
}
