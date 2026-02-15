import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Home } from 'lucide-react';
import { Box, Button, Flex, Heading, Text } from '@nicorp/nui';
import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Flex className="items-center justify-center min-h-[80vh] p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-7xl font-bold text-muted-foreground/20 mb-4 select-none"
        >
          404
        </motion.div>
        <Box className="w-16 h-16 rounded-2xl bg-muted/50 border border-border/50 flex items-center justify-center mx-auto mb-5">
          <MapPin className="w-8 h-8 text-muted-foreground" />
        </Box>
        <Heading level={2} className="text-xl font-semibold mb-2">
          Page not found
        </Heading>
        <Text variant="muted" className="text-sm mb-6">
          The page you're looking for doesn't exist or has been moved.
        </Text>
        <Flex className="items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/organizations')}
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </Flex>
      </motion.div>
    </Flex>
  );
}
