import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn, Box, Flex, Heading, Text } from '@nicorp/nui';
import { Breadcrumbs } from './breadcrumbs';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  showBreadcrumbs?: boolean;
  compact?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  children,
  className,
  showBreadcrumbs = true,
  compact = false,
}: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        'border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10',
        compact ? 'px-6 py-3' : 'px-6 py-5',
        className
      )}
    >
      {showBreadcrumbs && (
        <Box className="mb-2">
          <Breadcrumbs />
        </Box>
      )}
      <Flex className="items-start justify-between gap-4">
        <Box className="min-w-0 flex-1">
          <Heading level={1} className={cn(
            'font-semibold tracking-tight',
            compact ? 'text-xl' : 'text-2xl'
          )}>
            {title}
          </Heading>
          {subtitle && (
            <Text variant="muted" className="mt-1 text-sm">
              {subtitle}
            </Text>
          )}
        </Box>
        {actions && (
          <Flex className="items-center gap-2 flex-shrink-0">
            {actions}
          </Flex>
        )}
      </Flex>
      {children && (
        <Box className="mt-4">
          {children}
        </Box>
      )}
    </motion.div>
  );
}
