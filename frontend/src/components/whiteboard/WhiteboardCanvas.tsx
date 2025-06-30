import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import WhiteboardElement from './WhiteboardElement';
import WhiteboardToolbar from './WhiteboardToolbar';
import './WhiteboardCanvas.css';

// Временное определение типов напрямую в качестве замены импорта
type WhiteboardElementType = string;
type ConnectionPointPosition = 'top' | 'right' | 'bottom' | 'left' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface ArrowConnection {
  elementId: string;
  connectionPoint: ConnectionPointPosition;
}

interface WhiteboardElementData {
  id: string;
  type: WhiteboardElementType;
  position: Position;
  size: Size;
  content?: string;
  color?: string;
  startElementId?: string;
  endElementId?: string;
  startConnection?: ArrowConnection;
  endConnection?: ArrowConnection;
  strokeWidth?: string;
  arrowStyle?: string;
  shapeType?: string;
  zIndex?: number;
  rotation?: number;
  imageUrl?: string;
}

interface WhiteboardCanvasProps {
  projectId?: string;
}

const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({ projectId }) => {
  const { whiteboard_id } = useParams();
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [elements, setElements] = useState<WhiteboardElementData[]>([]);
  const [currentTool, setCurrentTool] = useState<string>('select');
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [creatingArrowState, setCreatingArrowState] = useState<{
    isCreating: boolean;
    startElementId: string | null;
    startConnectionPoint: ConnectionPointPosition | null;
    mousePosition: { x: number, y: number } | null;
  }>({ isCreating: false, startElementId: null, startConnectionPoint: null, mousePosition: null });

  const canvasRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newScale = Math.max(0.1, Math.min(scale + delta, 3));
      setScale(newScale);
    }
  }, [scale]);

  const startArrowCreation = useCallback((elementId: string, connectionPoint: ConnectionPointPosition) => {
    console.log('Начало создания стрелки от', elementId, connectionPoint);
    setCreatingArrowState({
      isCreating: true,
      startElementId: elementId,
      startConnectionPoint: connectionPoint,
      mousePosition: null
    });
  }, []);

  // Эта функция объединена с createArrow и больше не используется напрямую

  const cancelArrowCreation = useCallback(() => {
    console.log('Отмена создания стрелки');
    setCreatingArrowState({ isCreating: false, startElementId: null, startConnectionPoint: null, mousePosition: null });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (currentTool === 'pan' || e.button === 1) { // Middle mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }

    // Если мы в процессе создания стрелки и кликнули не на точку соединения, отменяем
    if (currentTool === 'arrow' && creatingArrowState.isCreating) {
      // Отмена будет обработана в компоненте WhiteboardElement
    }
  }, [currentTool, creatingArrowState.isCreating]);

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

    // Отслеживаем позицию мыши для стрелки
    if (currentTool === 'arrow' && creatingArrowState.isCreating) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setCreatingArrowState(prev => ({
          ...prev,
          mousePosition: {
            x: (e.clientX - rect.left - position.x) / scale,
            y: (e.clientY - rect.top - position.y) / scale
          }
        }));
      }
    }
  }, [isDragging, dragStart, position, scale, currentTool, creatingArrowState.isCreating]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const addElement = useCallback((type: WhiteboardElementType) => {
    // Не создаем новую стрелку, когда тип "arrow", так как стрелки создаются только через точки соединения
    if (type === 'arrow') {
      // Просто активируем инструмент стрелка без создания объекта
      setCurrentTool('arrow');
      return;
    }

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

  const updateElement = useCallback((id: string, updates: Partial<WhiteboardElementData>) => {
    setElements(prevElements =>
      prevElements.map(el => (el.id === id ? { ...el, ...updates } : el))
    );
    // Здесь должен быть вызов API для сохранения изменений
  }, [elements]);

  const createArrow = useCallback((startElementId: string, startConnectionPoint: ConnectionPointPosition, 
                             endElementId: string, endConnectionPoint: ConnectionPointPosition) => {
    // Проверка, что соединяются два разных элемента
    if (startElementId === endElementId) {
      console.log('Нельзя создать стрелку, соединяющую элемент с самим собой');
      return;
    }

    const newArrow: WhiteboardElementData = {
      id: `arrow-${Date.now()}`,
      type: 'arrow',
      position: { x: 0, y: 0 }, // Позиция стрелки значения не имеет, т.к. рисуется по соединениям
      size: { width: 0, height: 0 }, // Размеры тоже не важны, они определяются соединениями
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
      arrowStyle: 'straight' // Можно добавить разные стили стрелок в будущем
    };

    // Добавляем стрелку в список элементов
    setElements(prevElements => [...prevElements, newArrow]);
    console.log(`Создана стрелка между элементами ${startElementId} и ${endElementId}`);

    // Сбрасываем состояние создания стрелки
    cancelArrowCreation();
  }, [cancelArrowCreation]);

  const deleteElement = useCallback((id: string) => {
    setElements(prevElements => prevElements.filter(el => el.id !== id));
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  }, [selectedElementId]);

  const saveWhiteboard = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      // Здесь должен быть вызов API для сохранения данных на сервере
      console.log('Сохранение данных на сервере...');

      // Имитация задержки сетевого запроса
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Данные успешно сохранены');
    } catch (err) {
      setError('Ошибка при сохранении данных');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, elements]);

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
        selectedElement={elements.find(el => el.id === selectedElementId)}
        onElementUpdate={(updates) => selectedElementId && updateElement(selectedElementId, updates)}
      />

      <div 
        ref={canvasRef}
        className="flex-1 overflow-hidden bg-bg-secondary relative cursor-grab"
        style={{
          transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
          transformOrigin: '0 0'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {elements.map(element => (
          <WhiteboardElement
            key={element.id}
            element={element}
            isSelected={element.id === selectedElementId}
            onSelect={() => setSelectedElementId(element.id)}
            onUpdate={(updates) => updateElement(element.id, updates)}
            onDelete={() => deleteElement(element.id)}
            createArrow={createArrow}
            startArrowCreation={startArrowCreation}
            cancelArrowCreation={cancelArrowCreation}
            isCreatingArrow={creatingArrowState.isCreating}
            arrowStartPoint={creatingArrowState.startConnectionPoint ? 
              { elementId: creatingArrowState.startElementId!, position: creatingArrowState.startConnectionPoint } : null}
            arrowStartElementId={creatingArrowState.startElementId}
            currentTool={currentTool}
          />
        ))}
        
        {/* Визуализация перетаскиваемой стрелки поверх всего холста */}
        {creatingArrowState.isCreating && creatingArrowState.mousePosition !== null && (
          <svg 
            className="absolute top-0 left-0 w-full h-full pointer-events-none" 
            style={{ zIndex: 2000 }}
          >
            {elements.map(el => {
              if (el.id === creatingArrowState.startElementId && creatingArrowState.startConnectionPoint) {
                // Находим координаты точки соединения начального элемента
                const getConnectionPointCoordinates = () => {
                  const { width, height } = el.size;
                  switch (creatingArrowState.startConnectionPoint) {
                    case 'top': return { x: width / 2, y: 0 };
                    case 'top-right': return { x: width, y: 0 };
                    case 'right': return { x: width, y: height / 2 };
                    case 'bottom-right': return { x: width, y: height };
                    case 'bottom': return { x: width / 2, y: height };
                    case 'bottom-left': return { x: 0, y: height };
                    case 'left': return { x: 0, y: height / 2 };
                    case 'top-left': return { x: 0, y: 0 };
                    default: return { x: 0, y: 0 };
                  }
                };
                
                const startCoords = getConnectionPointCoordinates();
                const startX = el.position.x + startCoords.x;
                const startY = el.position.y + startCoords.y;
                
                return (
                  <line 
                    key="creating-arrow"
                    x1={startX} 
                    y1={startY} 
                    x2={creatingArrowState.mousePosition.x} 
                    y2={creatingArrowState.mousePosition.y}
                    stroke="#007bff" 
                    strokeWidth="2" 
                    strokeDasharray="5,5" 
                  />
                );
              }
              return null;
            })}
          </svg>
        )}
      </div>

      {isLoading && <div className="loading-overlay">Загрузка...</div>}
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default WhiteboardCanvas;
