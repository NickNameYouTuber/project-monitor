// Типы для интерактивной доски

export type WhiteboardElementType = 'text' | 'sticky' | 'shape' | 'arrow' | 'image' | 'group';
export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'hexagon';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

// Точки соединения стрелок
export type ConnectionPointPosition = 'top' | 'top-right' | 'right' | 'bottom-right' | 'bottom' | 'bottom-left' | 'left' | 'top-left';

export interface ConnectionPoint {
  position: ConnectionPointPosition;
  coordinates: Position;
}

export interface ArrowConnection {
  elementId: string;
  connectionPoint: ConnectionPointPosition;
}

// Основная структура данных доски

export interface ArrowConnection {
  elementId: string;
  connectionPoint: ConnectionPointPosition;
}

export interface WhiteboardElementData {
  id: string;
  type: WhiteboardElementType;
  position: Position;
  size: Size;
  content?: string;
  color?: string;
  zIndex?: number;
  rotation?: number;
  
  // Для текста и стикеров
  fontSize?: string;
  
  // Для стрелок
  startElementId?: string;
  endElementId?: string;
  startPoint?: Position;
  endPoint?: Position;
  startConnection?: ArrowConnection;
  endConnection?: ArrowConnection;
  strokeWidth?: string;
  arrowStyle?: 'straight' | 'curved';
  
  // Для фигур
  shapeType?: ShapeType;
  borderWidth?: string;
  
  // Для изображений
  imageUrl?: string;
  
  // Для групп
  groupId?: string;
}

export interface WhiteboardConnection {
  id: string;
  startElementId: string;
  endElementId: string;
  type: 'arrow' | 'line';
  startPoint?: Position;
  endPoint?: Position;
  label?: string;
  color?: string;
}

export interface WhiteboardData {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  elements: WhiteboardElementData[];
  connections?: WhiteboardConnection[];
  viewPosition: Position;
  viewScale: number;
  createdAt: string;
  updatedAt: string;
}
