import React from 'react';
import type { Project } from '../App';
import { Box, Flex, Heading, Text } from '@nicorp/nui';
import WhiteboardPageComponent from './whiteboard/WhiteboardPage';

interface WhiteboardPageProps {
  project: Project | null;
}

export function WhiteboardPage({ project }: WhiteboardPageProps) {
  return (
    <Flex className="h-full flex-col">
      <Box className="border-b border-border p-6 flex-shrink-0">
        <Box>
          <Heading level={1} className="text-2xl font-semibold">Whiteboard</Heading>
          <Text className="text-muted-foreground">Collaborative drawing and diagramming</Text>
        </Box>
      </Box>

      <Box className="flex-1 relative overflow-hidden min-h-0">
        <WhiteboardPageComponent projectId={project?.id || null} />
      </Box>
    </Flex>
  );
}
