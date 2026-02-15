import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Box, Button, Flex, Heading, Text } from '@nicorp/nui';
import { motion } from 'framer-motion';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <Flex className="items-center justify-center min-h-[400px] p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md"
          >
            <Box className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </Box>
            <Heading level={2} className="text-xl font-semibold mb-2">
              Something went wrong
            </Heading>
            <Text variant="muted" className="text-sm mb-5">
              {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
            </Text>
            <Flex className="items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => this.setState({ hasError: false })}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button
                size="sm"
                onClick={() => window.location.href = '/organizations'}
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Flex>
          </motion.div>
        </Flex>
      );
    }

    return this.props.children;
  }
}
