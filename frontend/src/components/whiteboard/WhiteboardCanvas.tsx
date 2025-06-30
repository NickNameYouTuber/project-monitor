import React, { useState, useCallback, useRef, useEffect } from 'react';
import WhiteboardElement from './WhiteboardElement';
import WhiteboardToolbar from './WhiteboardToolbar';
import './WhiteboardCanvas.css';
import type { WhiteboardElementType, ConnectionPointPosition, Position, WhiteboardElementData } from '../../types/whiteboard';

interface WhiteboardCanvasProps {
  projectId?: string;
}

const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({ projectId }) => {
  // const { whiteboard_id } = useParams(); // Временно не используется
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

  const updateElement = useCallback((id: string, updates: Partial<{ [K in keyof WhiteboardElementData]: WhiteboardElementData[K] }>) => {
    setElements(prevElements =>
      prevElements.map(el => (el.id === id ? { ...el, ...updates } : el))
    );
    // Здесь должен быть вызов API для сохранения изменений
  }, []);

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
        selectedElement={selectedElementId ? elements.find(el => el.id === selectedElementId) || null : null}
        onElementUpdate={(updates) => {
          if (selectedElementId) {
            const typedUpdates = updates as Partial<{ [K in keyof WhiteboardElementData]: WhiteboardElementData[K] }>;
            updateElement(selectedElementId, typedUpdates);
          }
        }}
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
        {/* Отображение стрелок */}
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 1000 }}>
          {elements
            .filter(element => element.type === 'arrow' && element.startElementId && element.endElementId)
            .map(arrow => {
              // Находим связанные элементы
              const startElement = elements.find(el => el.id === arrow.startElementId);
              const endElement = elements.find(el => el.id === arrow.endElementId);
              
              if (!startElement || !endElement || !arrow.startConnection || !arrow.endConnection) {
                return null;
              }
              
              // Вычисляем координаты точек подключения
              const getConnectionPoint = (element: WhiteboardElementData, connectionPosition: ConnectionPointPosition) => {
                const { position, size } = element;
                
                switch(connectionPosition) {
                  case 'top': return { x: position.x + size.width / 2, y: position.y };
                  case 'top-right': return { x: position.x + size.width, y: position.y };
                  case 'right': return { x: position.x + size.width, y: position.y + size.height / 2 };
                  case 'bottom-right': return { x: position.x + size.width, y: position.y + size.height };
                  case 'bottom': return { x: position.x + size.width / 2, y: position.y + size.height };
                  case 'bottom-left': return { x: position.x, y: position.y + size.height };
                  case 'left': return { x: position.x, y: position.y + size.height / 2 };
                  case 'top-left': return { x: position.x, y: position.y };
                  default: return { x: position.x, y: position.y };
                }
              };

              const startPoint = getConnectionPoint(startElement, arrow.startConnection.connectionPoint);
              const endPoint = getConnectionPoint(endElement, arrow.endConnection.connectionPoint);
              
              // Добавляем стрелку на конец линии
              const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
              
              return (
                <g key={arrow.id} className={selectedElementId === arrow.id ? 'selected-arrow' : ''}>
                  <line 
                    x1={startPoint.x}
                    y1={startPoint.y}
                    x2={endPoint.x}
                    y2={endPoint.y}
                    stroke={arrow.color || '#333333'}
                    strokeWidth={arrow.strokeWidth || '2'}
                    markerEnd="url(#arrowhead)"
                    onClick={() => setSelectedElementId(arrow.id)}
                    style={{ cursor: 'pointer' }}
                    pointerEvents="stroke"
                  />
                  
                  <polygon 
                    points={`0,-3 0,3 9,0`}
                    transform={`translate(${endPoint.x}, ${endPoint.y}) rotate(${angle * 180 / Math.PI})`}
                    fill={arrow.color || '#333333'}
                  />
                </g>
              );
            })}
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" />
              </marker>
            </defs>
        </svg>
        
        {elements.map(element => {
          // Не отображаем элементы стрелок как WhiteboardElement
          if (element.type === 'arrow') return null;
          
          return (
            <WhiteboardElement
              key={element.id}
              element={element}
              isSelected={element.id === selectedElementId}
              onSelect={() => setSelectedElementId(element.id)}
              onUpdate={(updates) => {
                const typedUpdates = updates as Partial<{ [K in keyof WhiteboardElementData]: WhiteboardElementData[K] }>;
                updateElement(element.id, typedUpdates);
              }}
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
          );
        })}
        
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
                    x2={creatingArrowState.mousePosition?.x || 0} 
                    y2={creatingArrowState.mousePosition?.y || 0}
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
