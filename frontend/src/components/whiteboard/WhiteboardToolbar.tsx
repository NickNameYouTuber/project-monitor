import React from 'react';
import type { WhiteboardElementType } from '../../types/whiteboard';

interface WhiteboardToolbarProps {
  currentTool: string;
  setCurrentTool: (tool: string) => void;
  addElement: (type: WhiteboardElementType) => void;
  scale: number;
  setScale: (scale: number) => void;
  saveWhiteboard: () => void;
}

const WhiteboardToolbar: React.FC<WhiteboardToolbarProps> = ({
  currentTool,
  setCurrentTool,
  addElement,
  scale,
  setScale,
  saveWhiteboard,
}) => {
  const tools = [
    { id: 'select', icon: '🖱️', label: 'Выбрать' },
    { id: 'pan', icon: '✋', label: 'Перемещение' }
  ];

  const elements = [
    { id: 'sticky' as WhiteboardElementType, icon: '📝', label: 'Стикер' },
    { id: 'text' as WhiteboardElementType, icon: 'T', label: 'Текст' },
    { id: 'shape' as WhiteboardElementType, icon: '⬜', label: 'Фигура' },
    { id: 'arrow' as WhiteboardElementType, icon: '➡️', label: 'Стрелка' },
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

  return (
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
            onClick={() => setCurrentTool(tool.id)}
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
  );
};

export default WhiteboardToolbar;
