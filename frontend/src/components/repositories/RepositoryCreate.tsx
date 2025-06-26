import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../utils/AppContext';
import { RepositoryCreate as RepositoryCreateType } from '../../utils/api/repositories';
import { VisibilityType } from '../../utils/api/repositories';
import PageHeader from '../common/PageHeader';

const RepositoryCreate: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, api } = useAppContext();
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
  }, [api.projects, currentUser?.token]);

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
  }, [api.repositories, currentUser?.token, formData, navigate]);

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Create Repository"
        backButton={{ text: 'Back to Repositories', link: '/repositories' }}
      />
      
      <div className="bg-bg-secondary rounded-lg shadow p-6 max-w-2xl mx-auto">
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
            <p>{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-text-primary font-medium mb-2">
              Repository Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full p-2 border border-border rounded focus:ring-2 focus:ring-primary focus:border-primary bg-bg-primary text-text-primary"
              placeholder="my-awesome-repo"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="description" className="block text-text-primary font-medium mb-2">
              Description (optional)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full p-2 border border-border rounded focus:ring-2 focus:ring-primary focus:border-primary bg-bg-primary text-text-primary"
              placeholder="Short description of your repository"
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="visibility" className="block text-text-primary font-medium mb-2">
              Visibility
            </label>
            <select
              id="visibility"
              name="visibility"
              value={formData.visibility}
              onChange={handleInputChange}
              className="w-full p-2 border border-border rounded focus:ring-2 focus:ring-primary focus:border-primary bg-bg-primary text-text-primary"
            >
              <option value={VisibilityType.PRIVATE}>Private - Only you and people you specify</option>
              <option value={VisibilityType.INTERNAL}>Internal - All authenticated users</option>
              <option value={VisibilityType.PUBLIC}>Public - Everyone can see</option>
            </select>
          </div>
          
          <div className="mb-6">
            <label htmlFor="project_id" className="block text-text-primary font-medium mb-2">
              Link to Project (optional)
            </label>
            <select
              id="project_id"
              name="project_id"
              value={formData.project_id || ''}
              onChange={handleInputChange}
              className="w-full p-2 border border-border rounded focus:ring-2 focus:ring-primary focus:border-primary bg-bg-primary text-text-primary"
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
              <p className="mt-1 text-sm text-text-tertiary">Loading projects...</p>
            )}
          </div>
          
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/repositories')}
              className="px-4 py-2 border border-border rounded text-text-primary hover:bg-bg-tertiary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Repository'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RepositoryCreate;
