import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../utils/AppContext';
import { api } from '../../utils/api';
import type { RepositoryCreate as RepositoryCreateType } from '../../utils/api/repositories';
import { VisibilityType } from '../../utils/api/repositories';

const RepositoryCreate: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Начальное состояние формы
  const [formData, setFormData] = useState<RepositoryCreateType>({
    name: '',
    description: '',
    visibility: VisibilityType.PRIVATE,
    project_id: undefined
  });

  // Проекты для привязки
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  // Загрузка проектов для выбора
  React.useEffect(() => {
    const fetchProjects = async () => {
      if (!currentUser?.token) return;
      
      setIsLoadingProjects(true);
      try {
        const data = await api.projects.getAll(currentUser.token);
        setProjects(data);
      } catch (err) {
        console.error('Error loading projects:', err);
      } finally {
        setIsLoadingProjects(false);
      }
    };
    
    fetchProjects();
  }, [currentUser?.token]);

  // Обработчик изменения полей формы
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Отправка формы
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser?.token) {
      setError('Authentication required');
      return;
    }
    
    if (!formData.name.trim()) {
      setError('Repository name is required');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Создаем объект с непустыми полями
      const repoData = {
        name: formData.name.trim(),
        ...(formData.description ? { description: formData.description.trim() } : {}),
        ...(formData.visibility ? { visibility: formData.visibility } : {}),
        ...(formData.project_id ? { project_id: formData.project_id } : {}),
      };
      
      const newRepo = await api.repositories.create(repoData, currentUser.token);
      navigate(`/repositories/${newRepo.id}`);
    } catch (err: any) {
      console.error('Error creating repository:', err);
      setError(err.message || 'Failed to create repository');
      setIsSubmitting(false);
    }
  }, [currentUser?.token, formData, navigate]);

  return (
    <div className="bg-[var(--bg-primary)] rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-[var(--text-primary)]">Create New Repository</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Repository Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-[var(--border-primary)] rounded-md bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            placeholder="e.g., my-new-project"
            required
          />
          {error && <p className="text-[var(--state-error)] text-sm mt-1">{error}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-[var(--border-primary)] rounded-md bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            placeholder="A brief description of your repository"
            rows={3}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Visibility *</label>
          <div className="flex items-center space-x-6 mt-2">
            <div className="flex items-center">
              <input
                type="radio"
                id="private"
                name="visibility"
                value={VisibilityType.PRIVATE}
                checked={formData.visibility === VisibilityType.PRIVATE}
                onChange={handleInputChange}
                className="text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <label htmlFor="private" className="ml-2 text-sm text-[var(--text-secondary)]">Private</label>
            </div>
            <div className="flex items-center">
              <input
                type="radio"
                id="internal"
                name="visibility"
                value={VisibilityType.INTERNAL}
                checked={formData.visibility === VisibilityType.INTERNAL}
                onChange={handleInputChange}
                className="text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <label htmlFor="internal" className="ml-2 text-sm text-[var(--text-secondary)]">Internal</label>
            </div>
            <div className="flex items-center">
              <input
                type="radio"
                id="public"
                name="visibility"
                value={VisibilityType.PUBLIC}
                checked={formData.visibility === VisibilityType.PUBLIC}
                onChange={handleInputChange}
                className="text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <label htmlFor="public" className="ml-2 text-sm text-[var(--text-secondary)]">Public</label>
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {formData.visibility === VisibilityType.PUBLIC ? 
              'Anyone on the internet can see this repository.' : 
              formData.visibility === VisibilityType.INTERNAL ? 
                'All authenticated users can see this repository.' : 
                'Only you and people you explicitly share access with can see this repository.'}
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Link to Project (optional)</label>
          <select
            id="project_id"
            name="project_id"
            value={formData.project_id || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-[var(--border-primary)] rounded-md bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            disabled={isLoadingProjects}
          >
            <option value="">Not linked to any project</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {isLoadingProjects && (
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">Loading projects...</p>
          )}
        </div>
        
        <div className="flex justify-end space-x-3 pt-3">
          <button
            type="button"
            onClick={() => navigate('/repositories')}
            className="px-4 py-2 border border-[var(--border-primary)] rounded-md text-[var(--text-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-4 py-2 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${isSubmitting ? 'bg-[var(--color-secondary)] cursor-not-allowed' : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]'}`}
          >
            {isSubmitting ? 'Creating...' : 'Create Repository'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RepositoryCreate;
