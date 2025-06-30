import React, { useState, useRef, useEffect } from 'react';
import type { WhiteboardElementData } from '../../types/whiteboard';

interface WhiteboardElementProps {
  element: WhiteboardElementData;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<WhiteboardElementData>) => void;
  onDelete: () => void;
}

const WhiteboardElement: React.FC<WhiteboardElementProps> = ({
  element,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(element.content || '');
  const dragStartRef = useRef({ x: 0, y: 0 });
  const originalPositionRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ width: 0, height: 0 });
  const elementRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Обработка клика для выбора элемента
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  };

  // Обработка начала перетаскивания
  const handleDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    originalPositionRef.current = { ...element.position };
  };

  // Обработка начала изменения размера
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    resizeStartRef.current = { ...element.size };
  };

  // Обработка двойного клика для редактирования
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (element.type === 'text' || element.type === 'sticky') {
      e.stopPropagation();
      setIsEditing(true);
      setEditContent(element.content || '');
    }
  };

  // Обработка изменения содержимого
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(e.target.value);
  };

  // Сохранение изменений после редактирования
  const handleBlur = () => {
    setIsEditing(false);
    onUpdate({ content: editContent });
  };

  // Обработка нажатия клавиш при редактировании
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey === false) {
      e.preventDefault();
      setIsEditing(false);
      onUpdate({ content: editContent });
    }
  };

  // Настройка обработчиков перемещения и изменения размера
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;

        onUpdate({
          position: {
            x: originalPositionRef.current.x + dx,
            y: originalPositionRef.current.y + dy
          }
        });
      } else if (isResizing) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;

        onUpdate({
          size: {
            width: Math.max(50, resizeStartRef.current.width + dx),
            height: Math.max(50, resizeStartRef.current.height + dy)
          }
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, onUpdate]);

  // Фокус на textarea при входе в режим редактирования
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // Отрисовка разных типов элементов
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
          style={{ backgroundColor: 'transparent' }}
        />
      );
    }

    switch (element.type) {
      case 'text':
        return (
          <div className="p-2 whitespace-pre-wrap text-text-primary">
            {element.content}
          </div>
        );
      case 'sticky':
        return (
          <div className="p-2 whitespace-pre-wrap text-text-primary font-medium">
            {element.content}
          </div>
        );
      case 'shape':
        if (element.shapeType === 'rectangle') {
          return <div className="w-full h-full" />;
        } else if (element.shapeType === 'circle') {
          return <div className="w-full h-full rounded-full" />;
        } else if (element.shapeType === 'diamond') {
          return (
            <div
              className="w-full h-full"
              style={{
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
              }}
            />
          );
        }
        return null;
      case 'image':
        return (
          <img
            src={element.imageUrl}
            alt="Uploaded"
            className="w-full h-full object-contain"
          />
        );
      default:
        return null;
    }
  };

  // Расчет стилей для элемента
  const getElementStyle = () => {
    const baseStyle = {
      left: `${element.position.x}px`,
      top: `${element.position.y}px`,
      width: `${element.size.width}px`,
      height: `${element.size.height}px`,
      backgroundColor: element.color,
      zIndex: element.zIndex || 1,
      transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    };

    if (element.type === 'sticky') {
      return {
        ...baseStyle,
        boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
      };
    } else if (element.type === 'text') {
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
      };
    }

    return baseStyle;
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
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-primary" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-primary" />
          <div
            className="absolute -bottom-1 -right-1 w-2 h-2 bg-primary cursor-nwse-resize"
            onMouseDown={handleResizeStart}
          />

          <div 
            className="absolute -top-8 right-0 bg-bg-card p-1 rounded flex shadow-md"
          >
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
    </div>
  );
};

export default WhiteboardElement;
