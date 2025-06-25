import React, { useState } from 'react';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import MDEditor from '@uiw/react-md-editor';

interface MarkdownEditorProps {
  initialValue?: string;
  onSave: (content: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  height?: number;
  showButtons?: boolean;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  initialValue = '',
  onSave,
  onCancel,
  placeholder = 'Write your comment here...',
  height = 200,
  showButtons = true
}) => {
  const [value, setValue] = useState<string | undefined>(initialValue);

  const handleSave = () => {
    if (value && value.trim()) {
      onSave(value);
    }
  };

  return (
    <div className="markdown-editor-container">
      <MDEditor
        value={value}
        onChange={setValue}
        height={height}
        preview="edit"
        textareaProps={{
          placeholder
        }}
        className="border border-border-primary rounded-lg mb-3"
      />
      
      {showButtons && (
        <div className="flex justify-end space-x-3 mt-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-bg-secondary text-text-secondary hover:bg-bg-hover transition"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!value?.trim()}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      )}
      
      <div className="text-xs text-text-muted mt-2">
        <p>Supports Markdown formatting:</p>
        <div className="flex flex-wrap gap-2 mt-1">
          <span className="inline-block px-2 py-1 bg-bg-secondary rounded border border-border-primary" title="Bold">**Bold**</span>
          <span className="inline-block px-2 py-1 bg-bg-secondary rounded border border-border-primary" title="Italic">*Italic*</span>
          <span className="inline-block px-2 py-1 bg-bg-secondary rounded border border-border-primary" title="Lists">1. List</span>
          <span className="inline-block px-2 py-1 bg-bg-secondary rounded border border-border-primary" title="Link">[Link](url)</span>
          <span className="inline-block px-2 py-1 bg-bg-secondary rounded border border-border-primary" title="Quote">&gt; Quote</span>
          <span className="inline-block px-2 py-1 bg-bg-secondary rounded border border-border-primary" title="Code">\`Code\`</span>
        </div>
      </div>
    </div>
  );
};

export default MarkdownEditor;
