import React from 'react';
import '@uiw/react-markdown-preview/markdown.css';
import MDEditor from '@uiw/react-md-editor';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, className = '' }) => {
  return (
    <div className={`markdown-preview ${className}`}>
      <MDEditor.Markdown 
        source={content} 
        style={{ 
          backgroundColor: 'transparent',
          color: 'var(--text-primary)'
        }}
      />
    </div>
  );
};

export default MarkdownPreview;
