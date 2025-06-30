import React from 'react';
import type { WhiteboardElementType, WhiteboardElementData } from '../../types/whiteboard';

interface WhiteboardToolbarProps {
  currentTool: string;
  setCurrentTool: (tool: string) => void;
  addElement: (type: WhiteboardElementType) => void;
  scale: number;
  setScale: (scale: number) => void;
  saveWhiteboard: () => void;
  selectedElement?: WhiteboardElementData | null;
  onElementUpdate?: (updates: Partial<WhiteboardElementData>) => void;
}

const WhiteboardToolbar: React.FC<WhiteboardToolbarProps> = ({
  currentTool,
  setCurrentTool,
  addElement,
  scale,
  setScale,
  saveWhiteboard,
  selectedElement,
  onElementUpdate
}) => {
  const tools = [
    { id: 'select', icon: '🖱️', label: 'Выбрать' },
    { id: 'pan', icon: '✋', label: 'Перемещение' },
    { id: 'arrow', icon: '➡️', label: 'Стрелка' }
  ];

  const elements = [
    { id: 'sticky' as WhiteboardElementType, icon: '📝', label: 'Стикер' },
    { id: 'text' as WhiteboardElementType, icon: 'T', label: 'Текст' },
    { id: 'shape' as WhiteboardElementType, icon: '⬜', label: 'Фигура' },
    { id: 'image' as WhiteboardElementType, icon: '🖼️', label: 'Картинка' }
  ];

  const handleZoomIn = () => {
    setScale(Math.min(3, scale + 0.1));
  };

  const handleZoomOut = () => {
    setScale(Math.max(0.1, scale - 0.1));
  };

  const handleZoomReset = () => {
    setScale(1);
  };

  const handleSave = () => {
    saveWhiteboard();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      addElement('image');
      // В полноценной реализации здесь нужно добавить загрузку изображения на сервер
    };
    reader.readAsDataURL(file);
  };

  // Функция для отображения параметров выбранного элемента
  const renderElementProperties = () => {
    if (!selectedElement || !onElementUpdate) return null;
    
    const colorOptions = ['#FFEB3B', '#4CAF50', '#2196F3', '#9C27B0', '#F44336', '#FF9800', '#FFFFFF', '#E0E0E0'];
    
    // Общие свойства для всех элементов
    const commonProps = (
      <div className="flex items-center space-x-2 mr-4">
        <span className="text-sm">Цвет:</span>
        <div className="flex space-x-1">
          {colorOptions.map(color => (
            <button 
              key={color}
              className="w-5 h-5 rounded-full border border-border-primary hover:opacity-80"
              style={{ backgroundColor: color }}
              onClick={() => onElementUpdate({ color })}
            />
          ))}
        </div>
      </div>
    );
    
    // Специфичные свойства в зависимости от типа элемента
    switch(selectedElement.type) {
      case 'text':
      case 'sticky':
        return (
          <div className="flex items-center space-x-4">
            {commonProps}
            <div className="flex items-center space-x-2">
              <span className="text-sm">Размер текста:</span>
              <select
                className="bg-bg-secondary border border-border-primary rounded px-2 py-1"
                value={selectedElement.fontSize || '14px'}
                onChange={(e) => onElementUpdate({ fontSize: e.target.value })}
              >
                <option value="12px">12px</option>
                <option value="14px">14px</option>
                <option value="16px">16px</option>
                <option value="18px">18px</option>
                <option value="20px">20px</option>
              </select>
            </div>
          </div>
        );
        
      case 'shape':
        return (
          <div className="flex items-center space-x-4">
            {commonProps}
            <div className="flex items-center space-x-2">
              <span className="text-sm">Тип фигуры:</span>
              <select
                className="bg-bg-secondary border border-border-primary rounded px-2 py-1"
                value={selectedElement.shapeType || 'rectangle'}
                onChange={(e) => onElementUpdate({ shapeType: e.target.value as 'rectangle' | 'circle' | 'diamond' })}
              >
                <option value="rectangle">Прямоугольник</option>
                <option value="circle">Круг</option>
                <option value="diamond">Ромб</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm">Граница:</span>
              <select
                className="bg-bg-secondary border border-border-primary rounded px-2 py-1"
                value={selectedElement.borderWidth || '1px'}
                onChange={(e) => onElementUpdate({ borderWidth: e.target.value })}
              >
                <option value="1px">Тонкая</option>
                <option value="2px">Средняя</option>
                <option value="3px">Толстая</option>
              </select>
            </div>
          </div>
        );
        
      case 'arrow':
        return (
          <div className="flex items-center space-x-4">
            {commonProps}
            <div className="flex items-center space-x-2">
              <span className="text-sm">Толщина:</span>
              <select
                className="bg-bg-secondary border border-border-primary rounded px-2 py-1"
                value={selectedElement.strokeWidth || '2px'}
                onChange={(e) => onElementUpdate({ strokeWidth: e.target.value })}
              >
                <option value="1px">Тонкая</option>
                <option value="2px">Средняя</option>
                <option value="3px">Толстая</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm">Стиль:</span>
              <select
                className="bg-bg-secondary border border-border-primary rounded px-2 py-1"
                value={selectedElement.arrowStyle || 'straight'}
                onChange={(e) => onElementUpdate({ arrowStyle: e.target.value as 'straight' | 'curved' })}
              >
                <option value="straight">Прямая</option>
                <option value="curved">Изогнутая</option>
              </select>
            </div>
          </div>
        );
        
      default:
        return commonProps;
    }
  };

  return (
    <div className="flex flex-col w-full">
      {/* Основная панель инструментов */}
      <div className="bg-bg-card shadow-md p-2 flex items-center space-x-4 flex-wrap">
        <div className="flex items-center space-x-1">
          {tools.map((tool) => (
            <button
              key={tool.id}
              className={`p-2 rounded ${
                currentTool === tool.id
                  ? 'bg-primary text-white'
                  : 'bg-bg-secondary hover:bg-bg-hover'
              }`}
              onClick={() => {
                // Просто переключаем инструмент без создания новых объектов
                setCurrentTool(tool.id);
              }}
              title={tool.label}
            >
              <span className="text-lg">{tool.icon}</span>
            </button>
          ))}
        </div>

        <div className="h-8 w-px bg-border-primary mx-2" />

        <div className="flex items-center space-x-1">
          {elements.map((el) => (
            <button
              key={el.id}
              className="p-2 rounded bg-bg-secondary hover:bg-bg-hover"
              onClick={() => {
                if (el.id === 'image') {
                  document.getElementById('image-upload')?.click();
                } else {
                  addElement(el.id);
                }
              }}
              title={el.label}
            >
              <span className="text-lg">{el.icon}</span>
            </button>
          ))}
          <input
            type="file"
            id="image-upload"
            className="hidden"
            accept="image/*"
            onChange={handleImageUpload}
          />
        </div>

        <div className="h-8 w-px bg-border-primary mx-2" />

        <div className="flex items-center space-x-1">
          <button
            className="p-2 rounded bg-bg-secondary hover:bg-bg-hover"
            onClick={handleZoomOut}
            title="Уменьшить"
          >
            <span className="text-lg">➖</span>
          </button>
          <button
            className="p-2 rounded bg-bg-secondary hover:bg-bg-hover min-w-[60px] text-center"
            onClick={handleZoomReset}
            title="Сбросить масштаб"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            className="p-2 rounded bg-bg-secondary hover:bg-bg-hover"
            onClick={handleZoomIn}
            title="Увеличить"
          >
            <span className="text-lg">➕</span>
          </button>
        </div>

        <div className="h-8 w-px bg-border-primary mx-2" />

        <button
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover"
          onClick={handleSave}
        >
          Сохранить
        </button>
      </div>
      
      {/* Панель параметров выбранного элемента */}
      {selectedElement && (
        <div className="bg-bg-secondary p-2 border-t border-border-primary flex items-center">
          <span className="font-medium mr-4">
            {selectedElement.type === 'text' ? 'Текст' : 
             selectedElement.type === 'sticky' ? 'Стикер' : 
             selectedElement.type === 'shape' ? 'Фигура' : 
             selectedElement.type === 'arrow' ? 'Стрелка' : 
             selectedElement.type === 'image' ? 'Изображение' : 'Элемент'}:
          </span>
          {renderElementProperties()}
        </div>
      )}
    </div>
  );
};

export default WhiteboardToolbar;
