import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../../utils/AppContext';
import {WhiteboardElement} from './index';
import {WhiteboardToolbar} from './index';
import type { 
  WhiteboardElementType, 
  WhiteboardElementData,
  Position,
  ConnectionPointPosition 
} from '../../types/whiteboard';

const WhiteboardCanvas: React.FC<{ projectId?: string }> = ({ projectId }) => {
  const { currentUser } = useAppContext();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [elements, setElements] = useState<WhiteboardElementData[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [currentTool, setCurrentTool] = useState<string>('select');
  const [error, setError] = useState<string | null>(null);

  // Загрузка данных доски из API
  useEffect(() => {
    if (!projectId || !currentUser?.token) return;

    const fetchWhiteboardData = async () => {
      setIsLoading(true);
      try {
        // Здесь будет запрос к API для получения данных доски
        // const data = await api.whiteboards.get(projectId, currentUser.token);
        // setElements(data.elements);
        
        // Пока используем тестовые данные
        setElements([
          {
            id: '1',
            type: 'sticky',
            content: 'Это стикер с заметкой',
            position: { x: 100, y: 100 },
            size: { width: 200, height: 150 },
            color: '#FFEB3B',
            zIndex: 1,
          },
          {
            id: '2',
            type: 'text',
            content: 'Текстовый блок с информацией',
            position: { x: 400, y: 150 },
            size: { width: 250, height: 100 },
            color: '#FFFFFF',
            zIndex: 2,
          },
          {
            id: '3',
            type: 'shape',
            shapeType: 'rectangle',
            position: { x: 300, y: 350 },
            size: { width: 150, height: 100 },
            color: '#E1F5FE',
            zIndex: 3,
          }
        ]);
      } catch (err) {
        console.error('Ошибка при загрузке данных доски:', err);
        setError('Не удалось загрузить доску');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWhiteboardData();
  }, [projectId, currentUser?.token]);

  // Обработка масштабирования (зум)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newScale = Math.max(0.1, Math.min(scale + delta, 3));
      setScale(newScale);
    }
  }, [scale]);

  // Обработка начала перетаскивания холста
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (currentTool === 'pan' || e.button === 1) { // Middle mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [currentTool]);

  // Обработка перетаскивания холста
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPosition({
        x: position.x + dx,
        y: position.y + dy
      });
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, dragStart, position]);

  // Обработка окончания перетаскивания
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Добавление нового элемента на доску
  const addElement = useCallback((type: WhiteboardElementType) => {
    const newElement: WhiteboardElementData = {
      id: `element-${Date.now()}`,
      type,
      position: {
        x: Math.abs(position.x) + window.innerWidth / 2 - 100,
        y: Math.abs(position.y) + window.innerHeight / 2 - 100
      },
      content: type === 'text' || type === 'sticky' ? 'Новый элемент' : '',
      size: { 
        width: type === 'sticky' ? 200 : 150, 
        height: type === 'sticky' ? 150 : 100
      },
      color: type === 'sticky' ? '#FFEB3B' : type === 'shape' ? '#E1F5FE' : '#FFFFFF',
      zIndex: Math.max(...elements.map(el => el.zIndex || 0), 0) + 1,
      ...(type === 'shape' && { shapeType: 'rectangle' })
    };
    
    setElements([...elements, newElement]);
    setSelectedElementId(newElement.id);
  }, [elements, position]);

  // Обновление элемента
  const updateElement = useCallback((id: string, updates: Partial<WhiteboardElementData>) => {
    setElements(prevElements =>
      prevElements.map(el => (el.id === id ? { ...el, ...updates } : el))
    );
    // Здесь должен быть вызов API для сохранения изменений
  }, [elements]);

  // Создание новой стрелки с соединениями
  const createArrowWithConnections = useCallback((startElementId: string, startConnectionPoint: ConnectionPointPosition, 
                                   endElementId: string, endConnectionPoint: ConnectionPointPosition) => {
    const newArrow: WhiteboardElementData = {
      id: `arrow-${Date.now()}`,
      type: 'arrow',
      position: { x: 0, y: 0 }, // Позиция будет рассчитываться динамически
      size: { width: 100, height: 1 }, // Размер будет рассчитываться динамически
      startElementId,
      endElementId,
      startConnection: {
        elementId: startElementId,
        connectionPoint: startConnectionPoint
      },
      endConnection: {
        elementId: endElementId,
        connectionPoint: endConnectionPoint
      },
      color: '#000000',
      strokeWidth: '2px',
      arrowStyle: 'straight'
    };
    
    setElements(prevElements => [...prevElements, newArrow]);
    // Здесь должен быть вызов API для сохранения новой стрелки
  }, [elements]);

  // Удаление элемента
  const deleteElement = useCallback((id: string) => {
    setElements(elements.filter(el => el.id !== id));
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  }, [elements, selectedElementId]);

  // Сохранение состояния доски
  const saveWhiteboard = useCallback(async () => {
    if (!projectId || !currentUser?.token) return;
    
    try {
      // Здесь будет запрос к API для сохранения состояния доски
      // await api.whiteboards.save(projectId, { elements }, currentUser.token);
      console.log('Доска сохранена');
    } catch (err) {
      console.error('Ошибка при сохранении доски:', err);
      setError('Не удалось сохранить доску');
    }
  }, [elements, projectId, currentUser?.token]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel as unknown as EventListener, { passive: false });
    }
    
    return () => {
      if (canvas) {
        canvas.removeEventListener('wheel', handleWheel as unknown as EventListener);
      }
    };
  }, [handleWheel]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-state-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <WhiteboardToolbar 
        currentTool={currentTool}
        setCurrentTool={setCurrentTool}
        addElement={addElement}
        scale={scale}
        setScale={setScale}
        saveWhiteboard={saveWhiteboard}
      />
      <div 
        ref={canvasRef}
        className="flex-1 overflow-hidden bg-bg-secondary relative cursor-grab"
        style={{ 
          backgroundColor: "#f9f9f9"
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="absolute origin-top-left"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            width: '100%',
            height: '100%'
          }}
        >
          {elements.map(element => (
            <WhiteboardElement
              key={element.id}
              element={element}
              isSelected={selectedElementId === element.id}
              onSelect={() => setSelectedElementId(element.id)}
              onUpdate={(updates: Partial<WhiteboardElementData>) => updateElement(element.id, updates)}
              onDelete={() => deleteElement(element.id)}
              createArrow={createArrowWithConnections}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default WhiteboardCanvas;
