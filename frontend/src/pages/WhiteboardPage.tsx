import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../utils/AppContext';
import WhiteboardCanvas from '../components/whiteboard/WhiteboardCanvas';

const WhiteboardPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentUser } = useAppContext();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [projectName, setProjectName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Загрузка информации о проекте
  useEffect(() => {
    const fetchProjectData = async () => {
      if (!projectId || !currentUser?.token) {
        setError('Отсутствует ID проекта или токен пользователя');
        setIsLoading(false);
        return;
      }
      
      try {
        // Получаем информацию о проекте для отображения заголовка
        const response = await fetch(`/api/projects/${projectId}`, {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Не удалось загрузить данные проекта');
        }
        
        const data = await response.json();
        setProjectName(data.name);
      } catch (err) {
        console.error('Ошибка при загрузке данных проекта:', err);
        setError('Не удалось загрузить информацию о проекте');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProjectData();
  }, [projectId, currentUser?.token]);

  // Обработчик для возврата к деталям проекта
  const handleBackClick = () => {
    navigate(`/projects/${projectId}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-bg-primary">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg-primary">
        <div className="text-state-error mb-4">{error}</div>
        <button 
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md"
          onClick={handleBackClick}
        >
          Вернуться к проектам
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* Заголовок */}
      <div className="bg-bg-card border-b border-border-primary p-4 flex justify-between items-center">
        <div className="flex items-center">
          <button
            onClick={handleBackClick}
            className="flex items-center mr-4 text-text-primary hover:text-primary transition-colors"
          >
            <span className="material-icons-outlined mr-1">arrow_back</span>
            <span>К проекту</span>
          </button>
          
          <h1 className="text-xl font-semibold text-text-primary">
            Интерактивная доска: {projectName}
          </h1>
        </div>
      </div>
      
      {/* Основное содержимое */}
      <div className="flex-1 overflow-hidden">
        <WhiteboardCanvas projectId={projectId} />
      </div>
    </div>
  );
};

export default WhiteboardPage;
