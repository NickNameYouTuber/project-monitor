import React from 'react';
import type { WhiteboardConnection, Position } from '../../types/whiteboard';

interface WhiteboardConnectionProps {
  connection: WhiteboardConnection;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<WhiteboardConnection>) => void;
  onDelete: () => void;
}

const WhiteboardConnection: React.FC<WhiteboardConnectionProps> = ({
  connection,
  isSelected,
  onSelect,
  // onUpdate будет использоваться для обновления свойств соединения
  // в будущем, когда добавим редактирование текста метки и стиля линии
  onDelete
}) => {
  const startPoint = connection.startPoint || { x: 0, y: 0 };
  const endPoint = connection.endPoint || { x: 0, y: 0 };
  
  // Рассчитываем середину линии для добавления метки
  const midPoint: Position = {
    x: startPoint.x + (endPoint.x - startPoint.x) / 2,
    y: startPoint.y + (endPoint.y - startPoint.y) / 2
  };
  
  // Рассчитываем угол для стрелки
  const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
  
  // Рассчитываем параметры SVG-линии
  const pathData = `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`;
  
  // Рассчитываем точки для стрелки
  const arrowLength = 15;
  // const arrowWidth = 8; // будет использоваться в будущем при реализации настраиваемых стрелок
  const arrowPath = connection.type === 'arrow'
    ? `M ${endPoint.x} ${endPoint.y} 
       L ${endPoint.x - arrowLength * Math.cos(angle - Math.PI / 6)} 
         ${endPoint.y - arrowLength * Math.sin(angle - Math.PI / 6)} 
       L ${endPoint.x - arrowLength * Math.cos(angle + Math.PI / 6)} 
         ${endPoint.y - arrowLength * Math.sin(angle + Math.PI / 6)} 
       Z`
    : '';
  
  return (
    <g onClick={(e) => {
      e.stopPropagation();
      onSelect();
    }}>
      <path
        d={pathData}
        stroke={connection.color || '#333333'}
        strokeWidth={isSelected ? 3 : 2}
        fill="none"
      />
      
      {connection.type === 'arrow' && (
        <path
          d={arrowPath}
          fill={connection.color || '#333333'}
          stroke={connection.color || '#333333'}
        />
      )}
      
      {connection.label && (
        <g transform={`translate(${midPoint.x}, ${midPoint.y})`}>
          <rect
            x={-40}
            y={-15}
            width={80}
            height={30}
            rx={5}
            ry={5}
            fill="white"
            stroke={connection.color || '#333333'}
            strokeWidth={1}
          />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#333333"
            fontSize={12}
          >
            {connection.label}
          </text>
        </g>
      )}
      
      {isSelected && (
        <>
          <circle
            cx={startPoint.x}
            cy={startPoint.y}
            r={6}
            fill="white"
            stroke="#2563EB"
            strokeWidth={2}
            className="cursor-move"
            onMouseDown={(e) => {
              e.stopPropagation();
              // Добавить логику перемещения начальной точки
            }}
          />
          
          <circle
            cx={endPoint.x}
            cy={endPoint.y}
            r={6}
            fill="white"
            stroke="#2563EB"
            strokeWidth={2}
            className="cursor-move"
            onMouseDown={(e) => {
              e.stopPropagation();
              // Добавить логику перемещения конечной точки
            }}
          />
          
          <foreignObject
            x={midPoint.x + 10}
            y={midPoint.y - 15}
            width={30}
            height={30}
          >
            <button
              className="bg-state-error text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              ×
            </button>
          </foreignObject>
        </>
      )}
    </g>
  );
};

export default WhiteboardConnection;
