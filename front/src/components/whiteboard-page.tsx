import React from 'react';
import type { Project } from '../App';
import { Box, Flex } from '@nicorp/nui';
import WhiteboardPageComponent from './whiteboard/WhiteboardPage';
import { useParams } from 'react-router-dom';

interface WhiteboardPageProps {
  project: Project | null;
}

export function WhiteboardPage({ project }: WhiteboardPageProps) {
  const params = useParams<{ projectId?: string }>();
  const projectIdFromUrl = params.projectId || null;
  const projectId = project?.id || projectIdFromUrl;

  return (
    <Flex className="flex-1 min-h-0 flex-col">
      <Box className="flex-1 min-h-0 relative overflow-hidden">
        <WhiteboardPageComponent key={projectId || 'no-project'} projectId={projectId} />
      </Box>
    </Flex>
  );
}
