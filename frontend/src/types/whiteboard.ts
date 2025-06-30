// Типы для интерактивной доски (Miro)

export type WhiteboardElementType = 'text' | 'sticky' | 'shape' | 'arrow' | 'image';
export type ShapeType = 'rectangle' | 'circle' | 'diamond';

// Основная структура данных доски
export interface WhiteboardData {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  elements: WhiteboardElementData[];
  created_at: string;
  updated_at: string;
  created_by: string;
  background_color?: string;
  background_image?: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
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
  
  // Для стрелок
  startElementId?: string;
  endElementId?: string;
  startPoint?: Position;
  endPoint?: Position;
  
  // Для фигур
  shapeType?: ShapeType;
  
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
