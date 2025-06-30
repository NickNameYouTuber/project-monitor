import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { WhiteboardElementData, ConnectionPointPosition } from '../../types/whiteboard';

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
}

const WhiteboardElement: React.FC<WhiteboardElementProps> = ({
  element,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  createArrow,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(element.content || '');
  const [showConnectionPoints, setShowConnectionPoints] = useState(false);
  const [isCreatingArrow, setIsCreatingArrow] = useState(false);
  const [arrowStartPoint, setArrowStartPoint] = useState<{
    position: ConnectionPointPosition;
    elementId: string;
  } | null>(null);

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
    if (element.type !== 'arrow') {
      setShowConnectionPoints(true);
    }
  };

  // Начало перетаскивания
  const handleDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    originalPositionRef.current = { ...element.position };
  };

  // Начало ресайза
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
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
      if (!isCreatingArrow) {
        setIsCreatingArrow(true);
        setArrowStartPoint({ position, elementId: element.id });
      } else if (arrowStartPoint && arrowStartPoint.elementId !== element.id) {
        createArrow(arrowStartPoint.elementId, arrowStartPoint.position, element.id, position);
        setIsCreatingArrow(false);
        setArrowStartPoint(null);
        setShowConnectionPoints(false);
      }
    },
    [isCreatingArrow, arrowStartPoint, element.id, createArrow]
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
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      if (!isCreatingArrow) {
        setShowConnectionPoints(false);
      }
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, isCreatingArrow, onUpdate]);

  // Автофокус на textarea при входе в режим редактирования
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

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

      {/* Точки соединения */}
      {(showConnectionPoints || isCreatingArrow) &&
        element.type !== 'arrow' &&
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
    </div>
  );
};

export default WhiteboardElement;
