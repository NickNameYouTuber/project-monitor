import React from 'react';
import type { Project } from '../App';
import WhiteboardPageComponent from './whiteboard/WhiteboardPage';

interface WhiteboardPageProps {
  project: Project | null;
}

export function WhiteboardPage({ project }: WhiteboardPageProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold">Whiteboard</h1>
          <p className="text-muted-foreground">Collaborative drawing and diagramming</p>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden min-h-0">
        <WhiteboardPageComponent projectId={project?.id || null} />
      </div>
    </div>
  );
}
