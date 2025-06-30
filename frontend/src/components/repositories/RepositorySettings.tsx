import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface Repository {
  id: string;
  name: string;
  description: string | null;
  url: string;
  visibility: 'public' | 'private';
  owner: {
    id: string;
    username: string;
    first_name: string;
    last_name: string | null;
    avatar_url: string | null;
  };
  created_at: string;
  updated_at: string;
}

interface RepositorySettingsProps {
  repository: Repository;
}

const RepositorySettings: React.FC<RepositorySettingsProps> = ({ repository }) => {
  const navigate = useNavigate();
  const [name, setName] = useState(repository.name);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSaveName = async () => {
    if (!name || name.trim() === '') {
      setError('Repository name cannot be empty');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      
      await api.patch(`/repositories/${repository.id}`, {
        name: name.trim()
      });
      
      setSuccess('Repository name updated successfully');
      setIsEditing(false);
      
      // Таймер для скрытия сообщения об успехе
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error updating repository:', err);
      setError('Failed to update repository name. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRepository = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      
      await api.delete(`/repositories/${repository.id}`);
      
      navigate('/repositories', { replace: true });
    } catch (err) {
      console.error('Error deleting repository:', err);
      setError('Failed to delete repository. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Repository Settings</h2>
      
      {error && (
        <div className="bg-[var(--state-error-light)] border border-[var(--state-error)] text-[var(--state-error)] px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-[var(--state-success-light)] border border-[var(--state-success)] text-[var(--state-success)] px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      <div className="border border-[var(--border-primary)] rounded-lg p-4">
        <h3 className="text-lg font-medium mb-3 text-[var(--text-primary)]">Repository Name</h3>
        
        {isEditing ? (
          <div className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-primary)] focus:border-[var(--color-primary)] focus:outline-none rounded"
              placeholder="Repository name"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleSaveName}
                disabled={isSaving}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setName(repository.name);
                }}
                className="px-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-primary)] rounded hover:bg-[var(--bg-primary)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <p className="text-[var(--text-primary)]">{repository.name}</p>
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-primary)] rounded hover:bg-[var(--bg-primary)] transition-colors text-sm"
            >
              Edit
            </button>
          </div>
        )}
      </div>
      
      <div className="border border-[var(--state-error)] rounded-lg p-4 bg-[var(--state-error-light)]">
        <h3 className="text-lg font-medium mb-3 text-[var(--state-error)]">Danger Zone</h3>
        
        <p className="text-[var(--text-secondary)] mb-4">
          Once you delete a repository, there is no going back. Please be certain.
        </p>
        
        {showConfirmation ? (
          <div className="space-y-4">
            <p className="font-medium text-[var(--state-error)]">
              Are you sure you want to delete this repository? This action cannot be undone.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={handleDeleteRepository}
                disabled={isDeleting}
                className="px-4 py-2 bg-[var(--state-error)] text-white rounded hover:bg-[var(--state-error-hover)] transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Yes, delete this repository'}
              </button>
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-primary)] rounded hover:bg-[var(--bg-primary)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirmation(true)}
            className="px-4 py-2 bg-[var(--state-error)] text-white rounded hover:bg-[var(--state-error-hover)] transition-colors"
          >
            Delete Repository
          </button>
        )}
      </div>
    </div>
  );
};

export default RepositorySettings;
