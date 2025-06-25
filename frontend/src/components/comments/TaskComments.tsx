import React, { useState } from 'react';
import type { Comment } from '../../utils/api/comments';
import MarkdownEditor from './MarkdownEditor';
import MarkdownPreview from './MarkdownPreview';
import { useAppContext } from '../../utils/AppContext';

interface TaskCommentsProps {
  taskId: string;
  comments: Comment[];
  onAddComment: (content: string) => Promise<void>;
  onUpdateComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

const TaskComments: React.FC<TaskCommentsProps> = ({
  taskId,
  comments,
  onAddComment,
  onUpdateComment,
  onDeleteComment
}) => {
  const { currentUser } = useAppContext();
  const [showEditor, setShowEditor] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddComment = async (content: string) => {
    if (!content.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onAddComment(content);
      setShowEditor(false);
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateComment = async (commentId: string, content: string) => {
    if (!content.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onUpdateComment(commentId, content);
      setEditingComment(null);
    } catch (error) {
      console.error('Failed to update comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      await onDeleteComment(commentId);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="comments-container mt-6">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-bold text-text-secondary">Comments ({comments.length})
          <span className="text-xs ml-2 text-text-muted">Task #{taskId.substring(0, 6)}</span>
        </h4>
        {!showEditor && (
          <button
            onClick={() => setShowEditor(true)}
            className="text-sm text-primary hover:text-primary-hover flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Comment
          </button>
        )}
      </div>

      {showEditor && (
        <div className="mb-6">
          <MarkdownEditor
            onSave={handleAddComment}
            onCancel={() => setShowEditor(false)}
            placeholder="Write your comment here... (supports Markdown)"
          />
          {isSubmitting && <div className="text-center text-text-muted mt-2">Submitting...</div>}
        </div>
      )}

      {comments.length === 0 && !showEditor ? (
        <div className="text-center py-6 text-text-muted bg-bg-secondary rounded-lg border border-border-primary">
          No comments yet. Be the first to add one!
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`comment bg-bg-secondary rounded-lg overflow-hidden border ${
                currentUser?.id === comment.user_id ? 'border-primary/30' : 'border-border-primary'
              }`}
            >
              <div className="comment-header flex justify-between items-center px-4 py-2 bg-bg-secondary/50 border-b border-border-primary">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white mr-2">
                    {comment.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-text-primary">
                      {comment.username}
                      {currentUser?.id === comment.user_id && (
                        <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted">{formatDate(comment.created_at)}</div>
                  </div>
                </div>
                
                {currentUser?.id === comment.user_id && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingComment(comment.id)}
                      className="text-text-muted hover:text-primary p-1 rounded transition-colors"
                      disabled={editingComment === comment.id}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-text-muted hover:text-state-error p-1 rounded transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              
              <div className="comment-body p-4">
                {editingComment === comment.id ? (
                  <MarkdownEditor
                    initialValue={comment.content}
                    onSave={(content) => handleUpdateComment(comment.id, content)}
                    onCancel={() => setEditingComment(null)}
                  />
                ) : (
                  <MarkdownPreview content={comment.content} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskComments;
