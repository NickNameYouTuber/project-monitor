export enum ToolType {
  SELECT = 'SELECT',
  RECTANGLE = 'RECTANGLE',
  CIRCLE = 'CIRCLE',
  STICKY = 'STICKY',
  TEXT = 'TEXT',
  PENCIL = 'PENCIL',
  HAND = 'HAND', // For panning
  ARROW = 'ARROW',
  COMMENT = 'COMMENT',
  SECTION = 'SECTION',
}

export enum ShapeType {
  RECTANGLE = 'RECTANGLE',
  CIRCLE = 'CIRCLE',
  STICKY = 'STICKY',
  TEXT = 'TEXT',
  PATH = 'PATH',
  ARROW = 'ARROW',
  SECTION = 'SECTION',
}

export interface Point {
  x: number;
  y: number;
}

export interface BaseShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  rotation: number;
  fill: string;
  stroke: string;
  taskId?: string; // Linked project task ID
}

export interface RectangleShape extends BaseShape {
  type: ShapeType.RECTANGLE;
  width: number;
  height: number;
}

export interface CircleShape extends BaseShape {
  type: ShapeType.CIRCLE;
  radius: number;
}

export interface StickyShape extends BaseShape {
  type: ShapeType.STICKY;
  width: number;
  height: number;
  text: string;
}

export interface TextShape extends BaseShape {
  type: ShapeType.TEXT;
  text: string;
  fontSize: number;
}

export interface SectionShape extends BaseShape {
  type: ShapeType.SECTION;
  width: number;
  height: number;
  label: string;
  taskIds?: string[];
}

export interface PathShape extends BaseShape {
  type: ShapeType.PATH;
  points: Point[];
  strokeWidth: number;
}

export type ArrowHead = 'none' | 'arrow' | 'circle';

export interface ArrowShape extends BaseShape {
  type: ShapeType.ARROW;
  start: Point;
  end: Point;
  // Connection info
  startShapeId?: string;
  startAnchorIndex?: number;
  endShapeId?: string;
  endAnchorIndex?: number;
  // Style info
  startHead: ArrowHead;
  endHead: ArrowHead;
  strokeWidth?: number;
}

export type Shape = RectangleShape | CircleShape | StickyShape | TextShape | PathShape | ArrowShape | SectionShape;

export interface CommentMessage {
  id: string;
  text: string;
  createdAt: number;
  author: string;
}

export interface Comment {
  id: string;
  x: number;
  y: number;
  messages: CommentMessage[];
  isOpen: boolean;
}

export const COLORS = [
  '#ffffff', // White
  '#f5f5f5', // Light Gray
  '#fff9b1', // Yellow (Sticky)
  '#d5f692', // Green (Sticky)
  '#c6ebfb', // Blue (Sticky)
  '#fdf2d0', // Orange (Sticky)
  '#ffaca1', // Red
  '#e2e8f0', // Slate
  '#1e293b', // Dark Slate
];

export const STROKE_COLORS = [
  '#000000',
  '#ef4444',
  '#3b82f6',
  '#22c55e',
  'transparent'
];