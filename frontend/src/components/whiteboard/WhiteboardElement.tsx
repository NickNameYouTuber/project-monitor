import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import './WhiteboardElement.css';

// Используем определения типов напрямую, если модуль не найден
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
  type: string;
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

import './WhiteboardElement.css';

interface ArrowStartPoint {
  position: ConnectionPointPosition;
  elementId: string;
}

interface WhiteboardElementProps {
  element: WhiteboardElementData;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<WhiteboardElementData>) => void;
  onDelete: () => void;
  createArrow: (
    startElementId: string,
    startConnectionPoint: ConnectionPointPosition,
    endElementId: string,
    endConnectionPoint: ConnectionPointPosition
  ) => void;
  startArrowCreation: (elementId: string, connectionPoint: ConnectionPointPosition) => void;
  cancelArrowCreation: () => void;
  isCreatingArrow: boolean;
  arrowStartPoint: ArrowStartPoint | null;
  arrowStartElementId: string | null;
  currentTool: string;
}

const WhiteboardElement: React.FC<WhiteboardElementProps> = ({
  element,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  createArrow,
  startArrowCreation,
  cancelArrowCreation,
  isCreatingArrow,
  arrowStartPoint,
  arrowStartElementId,
  currentTool,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(element.content || '');
  // Теперь используем пропсы вместо локального состояния
  // Локальная переменная для визуализации только внутри элемента
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const originalPositionRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ width: 0, height: 0 });
  const elementRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Вычисляем точки соединения для элемента
  const connectionPoints = useMemo(() => {
    const { width, height } = element.size;
    return [
      { position: 'top' as ConnectionPointPosition, coordinates: { x: width / 2, y: 0 } },
      { position: 'top-right' as ConnectionPointPosition, coordinates: { x: width, y: 0 } },
      { position: 'right' as ConnectionPointPosition, coordinates: { x: width, y: height / 2 } },
      { position: 'bottom-right' as ConnectionPointPosition, coordinates: { x: width, y: height } },
      { position: 'bottom' as ConnectionPointPosition, coordinates: { x: width / 2, y: height } },
      { position: 'bottom-left' as ConnectionPointPosition, coordinates: { x: 0, y: height } },
      { position: 'left' as ConnectionPointPosition, coordinates: { x: 0, y: height / 2 } },
      { position: 'top-left' as ConnectionPointPosition, coordinates: { x: 0, y: 0 } },
    ];
  }, [element.size.width, element.size.height]);

  // Выбор элемента
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    // Не показываем точки соединения при простом выборе элемента
  };

  // Начало перетаскивания
  const handleDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Если выбран инструмент стрелка, игнорируем перетаскивание
    if (currentTool === 'arrow') {
      console.log('Перетаскивание заблокировано в режиме стрелки');
      return;
    }
    
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    originalPositionRef.current = { ...element.position };
  };

  // Начало ресайза
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Если выбран инструмент стрелка, игнорируем изменение размера
    if (currentTool === 'arrow') {
      console.log('Изменение размера заблокировано в режиме стрелки');
      return;
    }
    
    setIsResizing(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    resizeStartRef.current = { ...element.size };
  };

  // Двойной клик для включения режима редактирования
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (element.type === 'text' || element.type === 'sticky') {
      e.stopPropagation();
      setIsEditing(true);
      setEditContent(element.content || '');
    }
  };

  // Обновление текста при редактировании
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(e.target.value);
  };

  // Завершение редактирования
  const finishEditing = () => {
    setIsEditing(false);
    onUpdate({ content: editContent });
  };

  const handleBlur = () => {
    finishEditing();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      finishEditing();
    }
  };

  // Клик по точке соединения
  const handleConnectionPointClick = useCallback(
    (position: ConnectionPointPosition) => {
      if (currentTool === 'arrow') {
        if (!isCreatingArrow) {
          // Если не в процессе создания стрелки - начинаем создание
          startArrowCreation(element.id, position);
        } else if (arrowStartPoint && arrowStartPoint.elementId !== element.id) {
          // Если в процессе создания и кликнули на другой элемент - создаем стрелку
          createArrow(
            arrowStartPoint.elementId, 
            arrowStartPoint.position, 
            element.id, 
            position
          );
        } else if (arrowStartPoint && arrowStartElementId && arrowStartElementId === element.id && arrowStartPoint.position === position) {
          // Если кликнули на ту же точку начала - отменяем создание
          cancelArrowCreation();
        }
      }
    },
    [currentTool, isCreatingArrow, arrowStartPoint, arrowStartElementId, element.id, startArrowCreation, createArrow, cancelArrowCreation]
  );

  // Обработчики mousemove и mouseup для перетаскивания и ресайза
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        onUpdate({
          position: { x: originalPositionRef.current.x + dx, y: originalPositionRef.current.y + dy },
        });
      } else if (isResizing) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        onUpdate({
          size: {
            width: Math.max(50, resizeStartRef.current.width + dx),
            height: Math.max(50, resizeStartRef.current.height + dy),
          },
        });
      } 
      
      // Отслеживаем позицию мыши для локальной визуализации в элементе
      if (isCreatingArrow && arrowStartElementId && arrowStartElementId === element.id) {
        const rect = elementRef.current?.getBoundingClientRect();
        if (rect) {
          setMousePosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          });
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing || (isCreatingArrow && arrowStartElementId === element.id)) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined; // Добавлена явная функция очистки
  }, [isDragging, isResizing, isCreatingArrow, arrowStartElementId, element.id, onUpdate]);

  // Автофокус на textarea при входе в режим редактирования
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // Эффект для отмены создания стрелки при смене инструмента или снятии выделения
  useEffect(() => {
    if (isCreatingArrow && arrowStartElementId === element.id && currentTool !== 'arrow') {
      cancelArrowCreation();
    }
  }, [currentTool, isCreatingArrow, arrowStartElementId, element.id, cancelArrowCreation]);

  // Рендер содержимого элемента
  const renderElementContent = () => {
    if (isEditing && (element.type === 'text' || element.type === 'sticky')) {
      return (
        <textarea
          ref={textareaRef}
          className="w-full h-full resize-none border-0 outline-none bg-transparent p-2"
          value={editContent}
          onChange={handleContentChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      );
    }

    switch (element.type) {
      case 'text':
        return <div className="p-2 whitespace-pre-wrap text-text-primary">{element.content}</div>;
      case 'sticky':
        return <div className="p-2 whitespace-pre-wrap text-text-primary font-medium">{element.content}</div>;
      case 'shape':
        if (element.shapeType === 'rectangle') {
          return <div className="w-full h-full" />;
        }
        if (element.shapeType === 'circle') {
          return <div className="w-full h-full rounded-full" />;
        }
        if (element.shapeType === 'diamond') {
          return (
            <div
              className="w-full h-full"
              style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
            />
          );
        }
        return null;
      case 'image':
        return <img src={element.imageUrl} alt="Uploaded" className="w-full h-full object-contain" />;
      default:
        return null;
    }
  };

  // Стили для обёртки элемента
  const getElementStyle = () => {
    const base: React.CSSProperties = {
      left: element.position.x,
      top: element.position.y,
      width: element.size.width,
      height: element.size.height,
      backgroundColor: element.type === 'text' ? 'transparent' : element.color,
      zIndex: element.zIndex ?? 1,
      transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    };
    if (element.type === 'sticky') {
      return {
        ...base,
        boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
      };
    }
    return base;
  };

  return (
    <div
      ref={elementRef}
      className={`absolute cursor-move border ${
        isSelected ? 'border-primary border-2' : element.type === 'text' ? 'border-transparent' : 'border-border-primary'
      } ${element.type === 'sticky' ? 'bg-yellow-200' : ''}`}
      style={getElementStyle()}
      onClick={handleClick}
      onMouseDown={handleDragStart}
      onDoubleClick={handleDoubleClick}
    >
      {renderElementContent()}

      {isSelected && (
        <>
          {/* Угловые маркеры */}
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-primary" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-primary" />
          <div
            className="absolute -bottom-1 -right-1 w-2 h-2 bg-primary cursor-nwse-resize"
            onMouseDown={handleResizeStart}
          />

          {/* Кнопка удаления */}
          <div className="absolute -top-8 right-0 bg-bg-card p-1 rounded flex shadow-md">
            <button
              className="text-xs bg-state-error text-white px-2 py-1 rounded hover:bg-red-600"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              Удалить
            </button>
          </div>
        </>
      )}

      {/* Точки соединения - показываем на всех элементах при режиме стрелки */}
      {currentTool === 'arrow' && element.type !== 'arrow' &&
        connectionPoints.map((point) => (
          <div
            key={point.position}
            className={`absolute w-3 h-3 rounded-full cursor-pointer ${
              isCreatingArrow &&
              arrowStartPoint &&
              arrowStartPoint.elementId === element.id &&
              arrowStartPoint.position === point.position
                ? 'bg-state-success'
                : 'bg-primary hover:bg-state-info'
            }`}
            style={{
              left: point.coordinates.x - 6,
              top: point.coordinates.y - 6,
              zIndex: 1000,
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleConnectionPointClick(point.position);
            }}
          />
        ))}
        
      {/* Визуализация создаваемой стрелки */}
      {isCreatingArrow && arrowStartElementId === element.id && arrowStartPoint && mousePosition && (
        <svg 
          className="absolute top-0 left-0 w-full h-full pointer-events-none" 
          style={{ zIndex: 1000 }}
        >
          {connectionPoints.map(point => {
            if (arrowStartPoint && point.position === arrowStartPoint.position) {
              const startX = point.coordinates.x;
              const startY = point.coordinates.y;
              return (
                <line 
                  key="creating-arrow"
                  x1={startX} 
                  y1={startY} 
                  x2={mousePosition.x} 
                  y2={mousePosition.y}
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
  );
};

export default WhiteboardElement;
