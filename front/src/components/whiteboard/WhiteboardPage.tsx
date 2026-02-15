import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ToolType,
  Shape,
  ShapeType,
  Point,
  COLORS,
  RectangleShape,
  CircleShape,
  StickyShape,
  PathShape,
  ArrowShape,
  TextShape,
  SectionShape,
  Comment,
  CommentMessage
} from './types';
import { Box, Flex, Text } from '@nicorp/nui';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import AIModal from './components/AIModal';
import { AIGeneratedShape } from './services/geminiService';
import { Send, MessageSquare, Trash2, X } from 'lucide-react';
import { PageHeader } from '../shared/page-header';
import {
  getOrCreateWhiteboard,
  createElement,
  updateElement,
  deleteElement,
  createConnection,
  updateConnection,
  deleteConnection,
  WhiteboardConnectionDto
} from '../../api/whiteboards';
import {
  shapesToElements,
  elementsToShapes,
  arrowsToConnections,
  connectionsToArrows,
  commentsToElements,
  elementsToComments,
} from './utils/whiteboardTransform';
import { useNotifications } from '../../hooks/useNotifications';
import { websocketService } from '../../services/websocketService';
import { useTheme } from '@nicorp/nui';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

type ResizeHandle = 'nw' | 'ne' | 'se' | 'sw' | 'e' | 'w' | 'n' | 's' | 'start' | 'end';

const ANCHOR_OFFSET = 15; // Distance of connection dots from shape

// Helper to get text dimensions approximation
const getTextDimensions = (text: string, fontSize: number) => {
  // If text is empty, measure the placeholder "Type something..." so the box isn't tiny
  const content = text || "Type something...";
  const lines = content.split('\n');
  const lineCount = lines.length || 1;
  const maxLineLength = Math.max(...lines.map(l => l.length));

  // Heuristic: Average char width ~0.6em, Line height ~1.2em
  // Adjusted to fit text tighter (reduced right padding)
  const width = Math.max(40, maxLineLength * fontSize * 0.6 + 12);
  const height = Math.max(fontSize * 1.5, lineCount * fontSize * 1.2 + 8);

  return { width, height };
};

// Helper to get anchor points for a shape
const getAnchors = (shape: Shape): Point[] => {
  if (shape.type === ShapeType.RECTANGLE || shape.type === ShapeType.STICKY || shape.type === ShapeType.SECTION) {
    const s = shape as RectangleShape | StickyShape | SectionShape;
    const { x, y, width, height } = s;
    const o = ANCHOR_OFFSET;
    return [
      { x: x - o, y: y - o }, // 0: TL
      { x: x + width / 2, y: y - o }, // 1: TC
      { x: x + width + o, y: y - o }, // 2: TR
      { x: x + width + o, y: y + height / 2 }, // 3: RC
      { x: x + width + o, y: y + height + o }, // 4: BR
      { x: x + width / 2, y: y + height + o }, // 5: BC
      { x: x - o, y: y + height + o }, // 6: BL
      { x: x - o, y: y + height / 2 }, // 7: LC
    ];
  } else if (shape.type === ShapeType.TEXT) {
    const s = shape as TextShape;
    const { width, height } = getTextDimensions(s.text, s.fontSize);
    const { x, y } = s;
    const o = ANCHOR_OFFSET;
    return [
      { x: x - o, y: y - o },
      { x: x + width / 2, y: y - o },
      { x: x + width + o, y: y - o },
      { x: x + width + o, y: y + height / 2 },
      { x: x + width + o, y: y + height + o },
      { x: x + width / 2, y: y + height + o },
      { x: x - o, y: y + height + o },
      { x: x - o, y: y + height / 2 },
    ];
  } else if (shape.type === ShapeType.CIRCLE) {
    const s = shape as CircleShape;
    const { x, y, radius } = s;
    const anchors: Point[] = [];
    const r = radius + ANCHOR_OFFSET;
    for (let i = 0; i < 8; i++) {
      const angle = (i * 45 - 135) * (Math.PI / 180);
      anchors.push({
        x: x + r * Math.cos(angle),
        y: y + r * Math.sin(angle)
      });
    }
    return anchors;
  }
  return [];
};

interface WhiteboardPageProps {
  projectId: string | null;
}

function WhiteboardPage({ projectId }: WhiteboardPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showError, showSuccess } = useNotifications();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // State
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const lastSavedShapesRef = useRef<Shape[]>([]);
  const lastSavedCommentsRef = useRef<Comment[]>([]);
  const shapeIdToElementIdMap = useRef<Map<string, string>>(new Map());
  const elementIdToShapeIdMap = useRef<Map<string, string>>(new Map());
  const arrowIdToConnectionIdMap = useRef<Map<string, string>>(new Map());
  const connectionIdToArrowIdMap = useRef<Map<string, string>>(new Map());

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tool, setTool] = useState<ToolType>(ToolType.SELECT);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // History State
  const [history, setHistory] = useState<Shape[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Interaction State
  const [interactionState, setInteractionState] = useState<'IDLE' | 'PANNING' | 'DRAGGING' | 'RESIZING' | 'DRAWING' | 'DRAGGING_COMMENT'>('IDLE');
  const [startPoint, setStartPoint] = useState<Point>({ x: 0, y: 0 });
  const [currentShapeId, setCurrentShapeId] = useState<string | null>(null);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);
  const [hoveredShapeId, setHoveredShapeId] = useState<string | null>(null);
  const [snapAnchor, setSnapAnchor] = useState<{ id: string, index: number, x: number, y: number } | null>(null);
  const [draggedCommentId, setDraggedCommentId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  // Ref to track current state in event listeners
  const stateRef = useRef({ scale, offset });
  stateRef.current = { scale, offset };

  // Mobile Detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Native Wheel Listener for proper Zoom blocking
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // Stop browser zoom

      if (e.ctrlKey || e.metaKey) {
        // Zoom Logic
        const { scale: currentScale, offset: currentOffset } = stateRef.current;
        const zoomSpeed = 0.001;
        const newScale = Math.max(0.1, Math.min(5, currentScale - e.deltaY * zoomSpeed));

        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Calculate point on canvas (unscaled)
        const dx = (x - currentOffset.x) / currentScale;
        const dy = (y - currentOffset.y) / currentScale;

        // New offset to keep mouse over same point
        const newOffsetX = x - dx * newScale;
        const newOffsetY = y - dy * newScale;

        setScale(newScale);
        setOffset({ x: newOffsetX, y: newOffsetY });
      } else {
        // Pan Logic
        setOffset(prev => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY
        }));
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  // Force Pan mode on mobile
  useEffect(() => {
    if (isMobile) {
      setTool(ToolType.HAND);
    }
  }, [isMobile]);

  // Coordinate conversion
  const getCanvasCoordinates = (clientX: number, clientY: number): Point => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    return {
      x: (x - offset.x) / scale,
      y: (y - offset.y) / scale,
    };
  };

  const getScreenCoordinates = (x: number, y: number): Point => {
    // NOTE: This assumes drawing relative to container 0,0. 
    // If we needed absolute screen coords we'd add rect.left/top but for internal SVG rendering this is fine.
    return {
      x: x * scale + offset.x,
      y: y * scale + offset.y
    };
  };

  // --- History ---
  const saveHistory = useCallback((newShapes: Shape[]) => {
    const currentHistory = history.slice(0, historyIndex + 1);
    const nextHistory = [...currentHistory, newShapes];
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  }, [history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setShapes(history[newIndex]);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setShapes(history[newIndex]);
    }
  }, [historyIndex, history]);

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (e.key === 'y') {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // --- Helpers ---
  const updateConnectedArrows = (shapes: Shape[], movedShapeId: string) => {
    const movedShape = shapes.find(s => s.id === movedShapeId);
    if (!movedShape) return shapes;
    const anchors = getAnchors(movedShape);
    return shapes.map(s => {
      if (s.type !== ShapeType.ARROW) return s;
      const arrow = s as ArrowShape;
      let newArrow = { ...arrow };
      let changed = false;
      if (arrow.startShapeId === movedShapeId && arrow.startAnchorIndex !== undefined && anchors[arrow.startAnchorIndex]) {
        newArrow.start = anchors[arrow.startAnchorIndex];
        changed = true;
      }
      if (arrow.endShapeId === movedShapeId && arrow.endAnchorIndex !== undefined && anchors[arrow.endAnchorIndex]) {
        newArrow.end = anchors[arrow.endAnchorIndex];
        changed = true;
      }
      return changed ? newArrow : s;
    });
  };

  const scrollToSection = (shape: SectionShape) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportW = rect.width;
    const viewportH = rect.height;
    const padding = 100; // Pixels around the section

    const targetWidth = shape.width + padding * 2;
    const targetHeight = shape.height + padding * 2;

    // Calculate scale to fit
    const scaleX = viewportW / targetWidth;
    const scaleY = viewportH / targetHeight;
    const newScale = Math.min(Math.min(scaleX, scaleY), 1.5); // Cap at 1.5x zoom so we don't zoom in too close on small sections

    // Center of the section in world coordinates
    const centerX = shape.x + shape.width / 2;
    const centerY = shape.y + shape.height / 2;

    // Calculate offset to place that world center at viewport center
    const newOffsetX = (viewportW / 2) - (centerX * newScale);
    const newOffsetY = (viewportH / 2) - (centerY * newScale);

    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
    setIsNavOpen(false);
    setSelectedId(shape.id);
  };

  const loadWhiteboard = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsSaving(true);
      const board = await getOrCreateWhiteboard(projectId);
      setBoardId(board.id);

      const sortedElements = [...board.elements].sort((a, b) => a.z_index - b.z_index);
      const loadedShapes = elementsToShapes(sortedElements);
      const loadedComments = elementsToComments(sortedElements);

      shapeIdToElementIdMap.current.clear();
      elementIdToShapeIdMap.current.clear();

      sortedElements.forEach((el, index) => {
        const shape = loadedShapes[index];
        if (shape) {
          shapeIdToElementIdMap.current.set(shape.id, el.id);
          elementIdToShapeIdMap.current.set(el.id, shape.id);
        }
      });

      const loadedArrows = connectionsToArrows(board.connections, elementIdToShapeIdMap.current);

      arrowIdToConnectionIdMap.current.clear();
      connectionIdToArrowIdMap.current.clear();

      board.connections.forEach((conn, index) => {
        const arrow = loadedArrows.find(a => a.id === conn.id); // connectionsToArrows preserves IDs if possible? Actually it maps conn.id to arrow.id
        // connectionsToArrows implementation uses conn.id as arrow.id. So this mapping is 1:1 initially but critical for updates.
        if (arrow) {
          arrowIdToConnectionIdMap.current.set(arrow.id, conn.id);
          connectionIdToArrowIdMap.current.set(conn.id, arrow.id);
        }
      });

      setShapes([...loadedShapes, ...loadedArrows]);
      setComments(loadedComments);
      lastSavedShapesRef.current = [...loadedShapes, ...loadedArrows];
      lastSavedCommentsRef.current = loadedComments;

      const elementId = searchParams.get('elementId');
      if (elementId) {
        const shapeId = elementIdToShapeIdMap.current.get(elementId);
        if (shapeId) {
          const section = loadedShapes.find(s => s.id === shapeId && s.type === ShapeType.SECTION) as SectionShape | undefined;
          if (section) {
            setTimeout(() => scrollToSection(section), 100);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load whiteboard:', error);
      showError('Не удалось загрузить доску');
    } finally {
      setIsSaving(false);
    }
  }, [projectId, searchParams, showError]);

  const saveWhiteboard = useCallback(async () => {
    if (!boardId || !projectId) return;
    if (isSaving) return;

    const shapesToSave = shapes.filter(s => s.type !== ShapeType.ARROW);
    const arrowsToSave = shapes.filter(s => s.type === ShapeType.ARROW) as ArrowShape[];

    const hasChanges =
      JSON.stringify(shapesToSave) !== JSON.stringify(lastSavedShapesRef.current.filter(s => s.type !== ShapeType.ARROW)) ||
      JSON.stringify(comments) !== JSON.stringify(lastSavedCommentsRef.current);

    if (!hasChanges) return;

    try {
      setIsSaving(true);

      const existingBoard = await getOrCreateWhiteboard(projectId);
      const existingElementIds = new Set(existingBoard.elements.map(e => e.id));
      const existingConnectionIds = new Set(existingBoard.connections.map(c => c.id));

      const elements = shapesToElements(shapesToSave);
      const commentElements = commentsToElements(comments);
      const allElements = [...elements, ...commentElements];

      const currentShapeIds = new Set(shapesToSave.map(s => s.id));
      const currentCommentIds = new Set(comments.map(c => c.id));

      for (const element of allElements) {
        const elementId = shapeIdToElementIdMap.current.get(element.shapeId);
        if (elementId && existingElementIds.has(elementId)) {
          await updateElement(elementId, {
            type: element.type,
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
            rotation: element.rotation,
            z_index: element.z_index,
            text: element.text || undefined,
            fill: element.fill || undefined,
            text_color: element.text_color || undefined,
            font_family: element.font_family || undefined,
            font_size: element.font_size,
            task_id: element.task_id || undefined,
          });
        } else {
          const created = await createElement(boardId, {
            type: element.type,
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
            rotation: element.rotation,
            z_index: element.z_index,
            text: element.text || undefined,
            fill: element.fill || undefined,
            text_color: element.text_color || undefined,
            font_family: element.font_family || undefined,
            font_size: element.font_size,
            task_id: element.task_id || undefined,
          });
          shapeIdToElementIdMap.current.set(element.shapeId, created.id);
          elementIdToShapeIdMap.current.set(created.id, element.shapeId);
        }
      }

      for (const existingElement of existingBoard.elements) {
        const shapeId = elementIdToShapeIdMap.current.get(existingElement.id);
        if (!shapeId || (!currentShapeIds.has(shapeId) && !currentCommentIds.has(shapeId))) {
          await deleteElement(existingElement.id);
          shapeIdToElementIdMap.current.delete(shapeId || '');
          elementIdToShapeIdMap.current.delete(existingElement.id);
        }
      }

      const connections = arrowsToConnections(arrowsToSave, shapeIdToElementIdMap.current);
      const currentConnectionIds = new Set<string>();

      for (const connection of connections) {
        // Here we need to check if we already have a server ID for this arrow.
        // connection.id from arrowsToConnections is the LOCAL Arrow ID.
        const localArrowId = connection.id;
        const serverConnectionId = arrowIdToConnectionIdMap.current.get(localArrowId);

        if (serverConnectionId && existingConnectionIds.has(serverConnectionId)) {
          currentConnectionIds.add(serverConnectionId);
          await updateConnection(serverConnectionId, {
            from_element_id: connection.from_element_id || undefined,
            to_element_id: connection.to_element_id || undefined,
            stroke: connection.stroke || undefined,
            stroke_width: connection.stroke_width || undefined,
            points: connection.points || undefined,
          });
        } else {
          const created = await createConnection(boardId, {
            from_element_id: connection.from_element_id || undefined,
            to_element_id: connection.to_element_id || undefined,
            stroke: connection.stroke || undefined,
            stroke_width: connection.stroke_width || undefined,
            points: connection.points || undefined,
          });
          arrowIdToConnectionIdMap.current.set(localArrowId, created.id);
          connectionIdToArrowIdMap.current.set(created.id, localArrowId);
          currentConnectionIds.add(created.id);
        }
      }

      for (const connectionId of existingConnectionIds) {
        if (!currentConnectionIds.has(connectionId)) {
          await deleteConnection(connectionId);
        }
      }

      lastSavedShapesRef.current = [...shapes];
      lastSavedCommentsRef.current = [...comments];
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save whiteboard:', error);
      showError('Не удалось сохранить доску');
    } finally {
      setIsSaving(false);
    }
  }, [boardId, projectId, shapes, comments, showError]);

  useEffect(() => {
    if (projectId) {
      loadWhiteboard();
    }
  }, [projectId, loadWhiteboard]);

  useEffect(() => {
    if (!projectId || !boardId) return;

    // Подписка на события вайтборда в реальном времени
    (async () => {
      await websocketService.connectRealtime(undefined, projectId, {
        onWhiteboardUpdated: async (whiteboardData: any) => {
          console.log('Realtime: whiteboard updated', whiteboardData);
          if (whiteboardData.projectId === projectId && whiteboardData.id === boardId) {
            const sortedElements = [...whiteboardData.elements].sort((a: any, b: any) => a.z_index - b.z_index);
            const loadedShapes = elementsToShapes(sortedElements);
            const loadedComments = elementsToComments(sortedElements);

            const loadedArrows = connectionsToArrows(whiteboardData.connections, elementIdToShapeIdMap.current);

            arrowIdToConnectionIdMap.current.clear();
            connectionIdToArrowIdMap.current.clear();
            whiteboardData.connections.forEach((conn: any) => {
              // The loadedArrows will have ID = conn.id.
              // We want to map this ID (which is now both local and server) to itself so future lookups work
              arrowIdToConnectionIdMap.current.set(conn.id, conn.id);
              connectionIdToArrowIdMap.current.set(conn.id, conn.id);
            });

            shapeIdToElementIdMap.current.clear();
            elementIdToShapeIdMap.current.clear();

            sortedElements.forEach((el: any, index: number) => {
              const shape = loadedShapes[index];
              if (shape) {
                shapeIdToElementIdMap.current.set(shape.id, el.id);
                elementIdToShapeIdMap.current.set(el.id, shape.id);
              }
            });

            setShapes([...loadedShapes, ...loadedArrows]);
            setComments(loadedComments);
            lastSavedShapesRef.current = [...loadedShapes, ...loadedArrows];
            lastSavedCommentsRef.current = loadedComments;
          }
        },
      });
    })();

    return () => {
      websocketService.disconnectRealtime();
    };
  }, [projectId, boardId]);

  useEffect(() => {
    if (!projectId || !boardId) return;

    saveWhiteboard();
  }, [shapes, comments, projectId, boardId, saveWhiteboard]);

  // --- Handlers ---

  const handlePointerDown = (e: React.PointerEvent) => {
    // Mobile View Only: Allow only panning
    if (isMobile) {
      setInteractionState('PANNING');
      setStartPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    const target = e.target as HTMLElement;
    const isBackground = target.id === 'canvas-bg' || target.id === 'root';
    const anchorData = target.dataset.anchor;

    // Comments Creation
    if (tool === ToolType.COMMENT) {
      if (isBackground || target.tagName === 'svg' || target.tagName === 'rect' || target.tagName === 'div') {
        const newComment: Comment = {
          id: generateId(),
          x: coords.x,
          y: coords.y,
          messages: [],
          isOpen: true
        };
        setComments(prev => [...prev.map(c => ({ ...c, isOpen: false })), newComment]);
        return;
      }
    }

    // Anchor Click -> Arrow
    if (anchorData && tool !== ToolType.COMMENT) {
      const [shapeId, indexStr] = anchorData.split(':');
      const index = parseInt(indexStr, 10);
      const shape = shapes.find(s => s.id === shapeId);
      if (shape) {
        const anchors = getAnchors(shape);
        const startPos = anchors[index];
        const id = generateId();
        const newArrow: ArrowShape = {
          id,
          type: ShapeType.ARROW,
          x: 0, y: 0, rotation: 0,
          fill: 'transparent',
          stroke: isDarkMode ? '#e2e8f0' : '#000000',
          start: startPos,
          end: coords,
          startShapeId: shapeId,
          startAnchorIndex: index,
          startHead: 'none',
          endHead: 'arrow',
          strokeWidth: 2
        };
        setShapes(prev => [...prev, newArrow]);
        setCurrentShapeId(id);
        setInteractionState('DRAWING');
        setTool(ToolType.ARROW);
        setStartPoint(coords);
        e.stopPropagation();
        return;
      }
    }

    if (e.button === 1 || (tool as ToolType) === ToolType.HAND) {
      setInteractionState('PANNING');
      setStartPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    if (tool === ToolType.SELECT && target.dataset.handle) {
      setInteractionState('RESIZING');
      setActiveHandle(target.dataset.handle as ResizeHandle);
      setStartPoint(coords);
      e.stopPropagation();
      return;
    }

    // Shape Creation
    if (tool !== ToolType.SELECT && tool !== ToolType.HAND && tool !== ToolType.COMMENT) {
      const id = generateId();
      setCurrentShapeId(id);
      setStartPoint(coords);
      setInteractionState('DRAWING');

      let newShape: Shape;
      const baseProps = {
        id,
        x: coords.x,
        y: coords.y,
        rotation: 0,
        fill: tool === ToolType.STICKY ? COLORS[2] : '#ffffff',
        stroke: (tool === ToolType.STICKY || tool === ToolType.TEXT) ? 'transparent' : (isDarkMode ? '#e2e8f0' : '#000000'),
      };

      if (tool === ToolType.RECTANGLE) newShape = { ...baseProps, type: ShapeType.RECTANGLE, width: 0, height: 0 } as RectangleShape;
      else if (tool === ToolType.SECTION) newShape = { ...baseProps, type: ShapeType.SECTION, width: 0, height: 0, label: 'Section', fill: 'rgba(0,0,0,0.05)', stroke: '#94a3b8' } as SectionShape;
      else if (tool === ToolType.CIRCLE) newShape = { ...baseProps, type: ShapeType.CIRCLE, radius: 0 } as CircleShape;
      else if (tool === ToolType.STICKY) {
        newShape = { ...baseProps, type: ShapeType.STICKY, width: 200, height: 200, text: '' } as StickyShape;
        setInteractionState('IDLE');
        setTool(ToolType.SELECT);
        saveHistory([...shapes, newShape]);
      } else if (tool === ToolType.TEXT) {
        newShape = { ...baseProps, type: ShapeType.TEXT, text: '', fontSize: 24, fill: isDarkMode ? '#e2e8f0' : '#1e293b' } as TextShape;
        setInteractionState('IDLE');
        setTool(ToolType.SELECT);
        setEditingId(id);
        setSelectedId(id);
        saveHistory([...shapes, newShape]);
      } else if (tool === ToolType.PENCIL) {
        newShape = { ...baseProps, type: ShapeType.PATH, points: [{ x: coords.x, y: coords.y }], strokeWidth: 4, stroke: isDarkMode ? '#e2e8f0' : '#000000', fill: 'transparent' } as PathShape;
      } else if (tool === ToolType.ARROW) {
        newShape = { ...baseProps, type: ShapeType.ARROW, start: { x: coords.x, y: coords.y }, end: { x: coords.x, y: coords.y }, stroke: isDarkMode ? '#e2e8f0' : '#000000', startHead: 'none', endHead: 'arrow', strokeWidth: 2 } as ArrowShape;
      } else return;

      setShapes(prev => [...prev, newShape]);
      return;
    }

    // Selection
    if (tool === ToolType.SELECT) {
      const shapeId = target.dataset.shapeId || target.closest('[data-shape-id]')?.getAttribute('data-shape-id');
      if (shapeId) {
        e.stopPropagation();
        setSelectedId(shapeId);
        setInteractionState('DRAGGING');
        setStartPoint(coords);
        if (editingId && editingId !== shapeId) setEditingId(null);
      } else if (isBackground) {
        setSelectedId(null);
        setEditingId(null);
        // Close comments on bg click
        setComments(prev => prev.map(c => ({ ...c, isOpen: false })));
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const coords = getCanvasCoordinates(e.clientX, e.clientY);

    // Anchor detection for snapping
    if (interactionState === 'DRAWING' && currentShapeId) {
      const currentShape = shapes.find(s => s.id === currentShapeId);
      if (currentShape?.type === ShapeType.ARROW) {
        let foundSnap: { id: string, index: number, x: number, y: number } | null = null;
        for (const s of shapes) {
          if (s.id === currentShapeId || s.type === ShapeType.ARROW || s.type === ShapeType.PATH) continue;
          const anchors = getAnchors(s);
          // Only snap to cardinal points 1, 3, 5, 7 for cleaner UI if desired, but here we allow all for manual drawing
          for (let i = 0; i < anchors.length; i++) {
            const a = anchors[i];
            const dist = Math.hypot(a.x - coords.x, a.y - coords.y);
            if (dist < 30) {
              foundSnap = { id: s.id, index: i, x: a.x, y: a.y };
              break;
            }
          }
          if (foundSnap) break;
        }
        setSnapAnchor(foundSnap);
      }
    }

    if (interactionState === 'PANNING') {
      const dx = e.clientX - startPoint.x;
      const dy = e.clientY - startPoint.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setStartPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    if (interactionState === 'DRAGGING_COMMENT' && draggedCommentId) {
      const dx = (e.clientX - startPoint.x) / scale;
      const dy = (e.clientY - startPoint.y) / scale;
      setComments(prev => prev.map(c => c.id === draggedCommentId ? { ...c, x: c.x + dx, y: c.y + dy } : c));
      setStartPoint({ x: e.clientX, y: e.clientY }); // Update start point in screen coords for next delta
      return;
    }

    if (interactionState === 'RESIZING' && selectedId && activeHandle) {
      setShapes(prev => {
        const nextShapes = prev.map(s => {
          if (s.id !== selectedId) return s;
          if (s.type === ShapeType.RECTANGLE || s.type === ShapeType.STICKY || s.type === ShapeType.SECTION) {
            const shape = s as RectangleShape | StickyShape | SectionShape;
            let { x, y, width, height } = shape;
            if (activeHandle.includes('e')) width = coords.x - x;
            if (activeHandle.includes('s')) height = coords.y - y;
            if (activeHandle.includes('w')) {
              const right = x + width;
              x = coords.x;
              width = right - x;
            }
            if (activeHandle.includes('n')) {
              const bottom = y + height;
              y = coords.y;
              height = bottom - y;
            }
            if (width < 20) width = 20;
            if (height < 20) height = 20;
            return { ...s, x, y, width, height };
          }
          if (s.type === ShapeType.CIRCLE) {
            const shape = s as CircleShape;
            const dx = coords.x - shape.x;
            const dy = coords.y - shape.y;
            return { ...s, radius: Math.sqrt(dx * dx + dy * dy) };
          }
          if (s.type === ShapeType.ARROW) {
            const shape = s as ArrowShape;
            if (activeHandle === 'start') return { ...s, start: coords, startShapeId: undefined, startAnchorIndex: undefined };
            if (activeHandle === 'end') return { ...s, end: coords, endShapeId: undefined, endAnchorIndex: undefined };
          }
          return s;
        });
        return updateConnectedArrows(nextShapes, selectedId);
      });
      return;
    }

    if (interactionState === 'DRAGGING' && selectedId) {
      const dx = coords.x - startPoint.x;
      const dy = coords.y - startPoint.y;
      setShapes(prev => {
        const nextShapes = prev.map(s => {
          if (s.id === selectedId) {
            if (s.type === ShapeType.PATH) return { ...s, points: s.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
            if (s.type === ShapeType.ARROW) return { ...s, start: { x: s.start.x + dx, y: s.start.y + dy }, end: { x: s.end.x + dx, y: s.end.y + dy } };
            return { ...s, x: s.x + dx, y: s.y + dy };
          }
          return s;
        });
        return updateConnectedArrows(nextShapes, selectedId);
      });
      setStartPoint(coords);
    }

    if (interactionState === 'DRAWING' && currentShapeId) {
      setShapes(prev => prev.map(shape => {
        if (shape.id !== currentShapeId) return shape;
        if (shape.type === ShapeType.RECTANGLE) return { ...shape, width: coords.x - shape.x, height: coords.y - shape.y };
        if (shape.type === ShapeType.SECTION) return { ...shape, width: coords.x - shape.x, height: coords.y - shape.y };

        if (shape.type === ShapeType.CIRCLE) {
          const dx = coords.x - shape.x;
          const dy = coords.y - shape.y;
          return { ...shape, radius: Math.sqrt(dx * dx + dy * dy) };
        }
        if (shape.type === ShapeType.PATH) return { ...shape, points: [...shape.points, coords] };
        if (shape.type === ShapeType.ARROW) return { ...shape, end: snapAnchor ? { x: snapAnchor.x, y: snapAnchor.y } : coords };
        return shape;
      }));
    }
  };

  const handlePointerUp = () => {
    const wasInteracting = interactionState === 'DRAGGING' || interactionState === 'RESIZING' || interactionState === 'DRAWING';

    if (interactionState === 'DRAWING' && currentShapeId && tool === ToolType.ARROW) {
      if (snapAnchor) {
        setShapes(prev => {
          const newShapes = prev.map(s => {
            if (s.id === currentShapeId) return { ...s, endShapeId: snapAnchor.id, endAnchorIndex: snapAnchor.index } as ArrowShape;
            return s;
          });
          saveHistory(newShapes);
          return newShapes;
        });
      } else saveHistory(shapes);
    } else if (wasInteracting) {
      saveHistory(shapes);
    }

    if (interactionState === 'RESIZING' && selectedId) {
      const shape = shapes.find(s => s.id === selectedId);
      if (shape && shape.type === ShapeType.ARROW && snapAnchor) {
        setShapes(prev => {
          const newShapes = prev.map(s => {
            if (s.id === selectedId) {
              const arrow = s as ArrowShape;
              if (activeHandle === 'start') return { ...arrow, start: { x: snapAnchor.x, y: snapAnchor.y }, startShapeId: snapAnchor.id, startAnchorIndex: snapAnchor.index };
              if (activeHandle === 'end') return { ...arrow, end: { x: snapAnchor.x, y: snapAnchor.y }, endShapeId: snapAnchor.id, endAnchorIndex: snapAnchor.index };
            }
            return s;
          });
          return newShapes;
        });
      }
    }

    setInteractionState('IDLE');
    setCurrentShapeId(null);
    setActiveHandle(null);
    setSnapAnchor(null);
    setDraggedCommentId(null);
    if (tool === ToolType.RECTANGLE || tool === ToolType.CIRCLE || tool === ToolType.ARROW || tool === ToolType.SECTION) setTool(ToolType.SELECT);
  };

  // --- Comment Logic ---
  const handleAddCommentMessage = (commentId: string, text: string) => {
    if (!text.trim()) return;
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          messages: [...c.messages, { id: generateId(), text, createdAt: Date.now(), author: 'User' }]
        };
      }
      return c;
    }));
  };

  const handleDeleteComment = (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  const handleCommentClick = (e: React.MouseEvent, commentId: string) => {
    e.stopPropagation();
    setComments(prev => prev.map(c => ({ ...c, isOpen: c.id === commentId })));
  };

  const handleCommentPointerDown = (e: React.PointerEvent, commentId: string) => {
    e.stopPropagation();
    setDraggedCommentId(commentId);
    setStartPoint({ x: e.clientX, y: e.clientY });
    setInteractionState('DRAGGING_COMMENT');
  };

  // --- AI Logic ---
  const handleAIGenerated = (title: string, ideas: string[]) => {
    // If using a container, we should generate relative to center of the container
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportX = rect.width / 2;
    const viewportY = rect.height / 2;
    // Note: getCanvasCoordinates takes clientX, clientY. We need to convert internal viewport center to canvas coords.
    // However, getCanvasCoordinates subtracts offset and divides by scale.
    // If we want the center of the viewport in canvas coords:
    const centerX = (viewportX - offset.x) / scale;
    const centerY = (viewportY - offset.y) / scale;

    const center = { x: centerX, y: centerY };

    // Calculate area required
    const COLS = 4;
    const ITEM_WIDTH = 200;
    const ITEM_HEIGHT = 200;
    const GAP = 20;

    const count = ideas.length;
    const rows = Math.ceil(count / COLS);

    const sectionWidth = (COLS * ITEM_WIDTH) + ((COLS - 1) * GAP) + 100; // + padding
    const sectionHeight = (rows * ITEM_HEIGHT) + ((rows - 1) * GAP) + 100; // + padding

    const startX = center.x - sectionWidth / 2;
    const startY = center.y - sectionHeight / 2;

    const section: SectionShape = {
      id: generateId(),
      type: ShapeType.SECTION,
      x: startX,
      y: startY,
      width: sectionWidth,
      height: sectionHeight,
      label: title || "Brainstorming",
      rotation: 0,
      fill: 'rgba(0,0,0,0.05)',
      stroke: '#94a3b8'
    };

    const newShapes: Shape[] = ideas.map((idea, index) => ({
      id: generateId(),
      type: ShapeType.STICKY,
      x: startX + 50 + (index % COLS) * (ITEM_WIDTH + GAP),
      y: startY + 50 + Math.floor(index / COLS) * (ITEM_HEIGHT + GAP),
      width: ITEM_WIDTH,
      height: ITEM_HEIGHT,
      rotation: 0,
      fill: COLORS[(index % 4) + 2],
      stroke: 'transparent',
      text: idea
    }));
    const nextShapes = [...shapes, section, ...newShapes];
    setShapes(nextShapes);
    saveHistory(nextShapes);
  };

  const handleAIDiagram = (title: string, aiShapes: AIGeneratedShape[]) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportX = rect.width / 2;
    const viewportY = rect.height / 2;
    const centerX = (viewportX - offset.x) / scale;
    const centerY = (viewportY - offset.y) / scale;
    const center = { x: centerX, y: centerY };

    const idMap: Record<string, string> = {}; // Map AI IDs to real IDs

    const newShapes: Shape[] = [];
    const arrowDefs: { start: string, end: string }[] = [];

    // 1. Create Nodes (Strictly Stickies)
    aiShapes.forEach((s, i) => {
      if (s.type && s.type.toUpperCase() === 'ARROW') {
        if (s.connectFrom && s.connectTo) {
          arrowDefs.push({ start: s.connectFrom, end: s.connectTo });
        }
      } else {
        const newId = generateId();
        idMap[s.id] = newId;
        const x = center.x + s.x;
        const y = center.y + s.y;

        const base = { id: newId, x, y, rotation: 0, stroke: 'transparent' };

        // Map all node types to STICKY to satisfy user request
        // Cycle colors for visual distinction
        const color = COLORS[2 + (i % 4)];

        newShapes.push({
          ...base,
          type: ShapeType.STICKY,
          width: 200,
          height: 100, // Standard sticky size
          fill: color,
          text: s.text || "Step " + (i + 1),
        } as StickyShape);
      }
    });

    // Calculate Bounding Box for Section
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    newShapes.forEach(s => {
      if (s.type === ShapeType.STICKY) {
        minX = Math.min(minX, s.x);
        minY = Math.min(minY, s.y);
        maxX = Math.max(maxX, s.x + (s as StickyShape).width);
        maxY = Math.max(maxY, s.y + (s as StickyShape).height);
      }
    });

    // Padding
    const padding = 60;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const section: SectionShape = {
      id: generateId(),
      type: ShapeType.SECTION,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      label: title || "Diagram",
      rotation: 0,
      fill: 'rgba(0,0,0,0.05)',
      stroke: '#94a3b8'
    };

    // 2. Create Arrows with Smart Anchors
    arrowDefs.forEach(({ start, end }) => {
      const startId = idMap[start];
      const endId = idMap[end];
      if (startId && endId) {
        const startShape = newShapes.find(s => s.id === startId);
        const endShape = newShapes.find(s => s.id === endId);

        if (startShape && endShape) {
          // Find best anchor pair minimizing distance
          const anchorsA = getAnchors(startShape);
          const anchorsB = getAnchors(endShape);

          let bestDist = Infinity;
          let bestStartAnchor = anchorsA[0];
          let bestEndAnchor = anchorsB[0];
          let bestStartIndex = 0;
          let bestEndIndex = 0;

          // RESTRICT to Cardinal Directions: 1 (Top), 3 (Right), 5 (Bottom), 7 (Left)
          // This fixes the issue where AI picks corners (like Bottom-Right) causing "rotated" appearance
          const validIndices = [1, 3, 5, 7];

          anchorsA.forEach((pA, iA) => {
            if (!validIndices.includes(iA)) return;
            anchorsB.forEach((pB, iB) => {
              if (!validIndices.includes(iB)) return;

              const d = Math.hypot(pA.x - pB.x, pA.y - pB.y);
              if (d < bestDist) {
                bestDist = d;
                bestStartAnchor = pA;
                bestEndAnchor = pB;
                bestStartIndex = iA;
                bestEndIndex = iB;
              }
            });
          });

          newShapes.push({
            id: generateId(),
            type: ShapeType.ARROW,
            x: 0, y: 0, rotation: 0, fill: 'transparent', stroke: isDarkMode ? '#e2e8f0' : '#000000',
            start: bestStartAnchor,
            end: bestEndAnchor,
            startShapeId: startId,
            endShapeId: endId,
            startAnchorIndex: bestStartIndex,
            endAnchorIndex: bestEndIndex,
            startHead: 'none',
            endHead: 'arrow',
            strokeWidth: 2
          } as ArrowShape);
        }
      }
    });

    const nextShapes = [...shapes, section, ...newShapes];
    setShapes(nextShapes);
    saveHistory(nextShapes);
  };

  // --- Handlers for Toolbar & Properties ---

  const handleUpdateShape = (id: string, updates: Partial<Shape>, saveHistoryFlag = false) => {
    setShapes(prev => {
      const nextShapes = prev.map(s => s.id === id ? { ...s, ...updates } as Shape : s);
      if (saveHistoryFlag) saveHistory(nextShapes);
      return nextShapes;
    });
  };

  const handleDeleteShape = (id: string) => {
    const nextShapes = shapes.filter(s => s.id !== id);
    setShapes(nextShapes);
    setSelectedId(null);
    saveHistory(nextShapes);
  };

  const handleDoubleClick = (e: React.MouseEvent, id: string, type: ShapeType) => {
    e.stopPropagation();
    // FIX: Only allow selection/editing via double-click if current tool is SELECT
    if (tool !== ToolType.SELECT) return;

    if (type === ShapeType.TEXT || type === ShapeType.STICKY) {
      setEditingId(id);
      setSelectedId(id);
    }
  };

  const handleSave = async () => {
    if (!boardId || !projectId) {
      showError('Проект не выбран');
      return;
    }
    await saveWhiteboard();
    showSuccess('Доска сохранена');
  };

  const handleLoad = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        if (data.shapes && Array.isArray(data.shapes)) {
          setShapes(data.shapes);
          saveHistory(data.shapes);
          if (boardId && projectId) {
            await saveWhiteboard();
          }
        }
        if (data.comments && Array.isArray(data.comments)) {
          setComments(data.comments);
          if (boardId && projectId) {
            await saveWhiteboard();
          }
        }
        showSuccess('Доска загружена');
      } catch (err) {
        console.error('Failed to load file', err);
        showError('Неверный формат файла');
      }
    };
    reader.readAsText(file);
  };

  const renderAnchors = (shape: Shape) => {
    if (isMobile) return null;
    // Show anchors when selected, hovered, or drawing an arrow
    const isVisible = selectedId === shape.id || hoveredShapeId === shape.id || (interactionState === 'DRAWING' && tool === ToolType.ARROW);

    if (!isVisible) return null;

    // No anchors for paths or arrows
    if (shape.type === ShapeType.PATH || shape.type === ShapeType.ARROW) return null;

    const anchors = getAnchors(shape);
    return (
      <g className="anchors">
        {anchors.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={5}
            fill={isDarkMode ? '#bfdbfe' : '#3b82f6'}
            stroke={isDarkMode ? '#1e3a8a' : '#ffffff'}
            strokeWidth={1}
            className="cursor-crosshair transition-opacity duration-200"
            style={{ opacity: (tool === ToolType.ARROW) ? 0.8 : 0.2 }}
            data-anchor={`${shape.id}:${i}`}
            onPointerEnter={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.setAttribute('r', '7');
            }}
            onPointerLeave={(e) => {
              e.currentTarget.style.opacity = (tool === ToolType.ARROW) ? '0.8' : '0.2';
              e.currentTarget.setAttribute('r', '5');
            }}
          />
        ))}
      </g>
    );
  };

  const renderSelectionOverlay = (shape: Shape) => {
    if (shape.id !== selectedId) return null;

    const handleStyle = {
      width: 10,
      height: 10,
      fill: '#ffffff',
      stroke: '#3b82f6',
      strokeWidth: 1,
      pointerEvents: 'all' as const
    };

    if (shape.type === ShapeType.RECTANGLE || shape.type === ShapeType.STICKY || shape.type === ShapeType.TEXT || shape.type === ShapeType.SECTION) {
      let x, y, width, height;
      if (shape.type === ShapeType.TEXT) {
        const s = shape as TextShape;
        x = s.x;
        y = s.y;
        // Matches heuristic in getTextDimensions roughly, but we should use the same logic if possible
        // or rely on what was rendered. Since we can't easily sync exact DOM size back to React state without resize observer,
        // we use the same heuristic here.
        const dims = getTextDimensions(s.text, s.fontSize);
        width = dims.width;
        height = dims.height;
      } else {
        const s = shape as RectangleShape | StickyShape | SectionShape;
        x = s.x;
        y = s.y;
        width = s.width;
        height = s.height;
      }

      return (
        <g>
          <rect x={x} y={y} width={width} height={height} fill="none" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4" pointerEvents="none" />
          {/* Corners */}
          <rect x={x - 5} y={y - 5} {...handleStyle} style={{ cursor: 'nw-resize' }} data-handle="nw" />
          <rect x={x + width - 5} y={y - 5} {...handleStyle} style={{ cursor: 'ne-resize' }} data-handle="ne" />
          <rect x={x + width - 5} y={y + height - 5} {...handleStyle} style={{ cursor: 'se-resize' }} data-handle="se" />
          <rect x={x - 5} y={y + height - 5} {...handleStyle} style={{ cursor: 'sw-resize' }} data-handle="sw" />

          {/* Sides */}
          <rect x={x + width / 2 - 5} y={y - 5} {...handleStyle} style={{ cursor: 'n-resize' }} data-handle="n" />
          <rect x={x + width / 2 - 5} y={y + height - 5} {...handleStyle} style={{ cursor: 's-resize' }} data-handle="s" />
          <rect x={x - 5} y={y + height / 2 - 5} {...handleStyle} style={{ cursor: 'w-resize' }} data-handle="w" />
          <rect x={x + width - 5} y={y + height / 2 - 5} {...handleStyle} style={{ cursor: 'e-resize' }} data-handle="e" />
        </g>
      );
    }

    if (shape.type === ShapeType.CIRCLE) {
      const s = shape as CircleShape;
      return (
        <g>
          <rect x={s.x - s.radius} y={s.y - s.radius} width={s.radius * 2} height={s.radius * 2} fill="none" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4" pointerEvents="none" />
          <rect x={s.x + s.radius - 5} y={s.y - 5} {...handleStyle} style={{ cursor: 'e-resize' }} data-handle="e" />
          <rect x={s.x - s.radius - 5} y={s.y - 5} {...handleStyle} style={{ cursor: 'w-resize' }} data-handle="w" />
          <rect x={s.x - 5} y={s.y + s.radius - 5} {...handleStyle} style={{ cursor: 's-resize' }} data-handle="s" />
          <rect x={s.x - 5} y={s.y - s.radius - 5} {...handleStyle} style={{ cursor: 'n-resize' }} data-handle="n" />
        </g>
      );
    }

    if (shape.type === ShapeType.ARROW) {
      const s = shape as ArrowShape;
      return (
        <g>
          <circle cx={s.start.x} cy={s.start.y} r={6} fill="#3b82f6" stroke="#fff" strokeWidth={1} style={{ cursor: 'move' }} data-handle="start" pointerEvents="all" />
          <circle cx={s.end.x} cy={s.end.y} r={6} fill="#3b82f6" stroke="#fff" strokeWidth={1} style={{ cursor: 'move' }} data-handle="end" pointerEvents="all" />
        </g>
      );
    }

    return null;
  };

  const renderShape = (shape: Shape) => {
    const isSelected = selectedId === shape.id;
    const isEditing = editingId === shape.id;

    const commonProps = {
      'data-shape-id': shape.id,
      onDoubleClick: (e: React.MouseEvent) => handleDoubleClick(e, shape.id, shape.type),
      style: { pointerEvents: 'all' as const, cursor: tool === ToolType.HAND ? 'grab' : 'default' }
    };

    if (shape.type === ShapeType.RECTANGLE) {
      const s = shape as RectangleShape;
      return (
        <g key={s.id} {...commonProps}>
          <rect x={s.x} y={s.y} width={s.width} height={s.height} fill={s.fill} stroke={s.stroke} strokeWidth={2} rx={4} />
          {renderAnchors(s)}
          {renderSelectionOverlay(s)}
        </g>
      );
    }
    if (shape.type === ShapeType.CIRCLE) {
      const s = shape as CircleShape;
      return (
        <g key={s.id} {...commonProps}>
          <circle cx={s.x} cy={s.y} r={s.radius} fill={s.fill} stroke={s.stroke} strokeWidth={2} />
          {renderAnchors(s)}
          {renderSelectionOverlay(s)}
        </g>
      );
    }
    if (shape.type === ShapeType.PATH) {
      const s = shape as PathShape;
      if (s.points.length < 2) return null;
      const d = `M ${s.points.map(p => `${p.x} ${p.y}`).join(' L ')}`;
      return (
        <g key={s.id} {...commonProps}>
          <path d={d} fill="none" stroke={s.stroke} strokeWidth={s.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          {renderSelectionOverlay(s)}
        </g>
      );
    }
    if (shape.type === ShapeType.ARROW) {
      const s = shape as ArrowShape;
      const markerEnd = s.endHead === 'arrow' ? 'url(#arrowhead-end)' : s.endHead === 'circle' ? 'url(#circle-end)' : undefined;
      const markerStart = s.startHead === 'arrow' ? 'url(#arrowhead-start)' : s.startHead === 'circle' ? 'url(#circle-start)' : undefined;
      return (
        <g key={s.id} {...commonProps}>
          <line x1={s.start.x} y1={s.start.y} x2={s.end.x} y2={s.end.y} stroke={s.stroke} strokeWidth={s.strokeWidth || 2} markerEnd={markerEnd} markerStart={markerStart} />
          {renderSelectionOverlay(s)}
        </g>
      );
    }
    if (shape.type === ShapeType.SECTION) {
      const s = shape as SectionShape;
      return (
        <g key={s.id} {...commonProps} opacity={isMobile ? 0.5 : 1}>
          <rect x={s.x} y={s.y} width={s.width} height={s.height} fill={s.fill} stroke={s.stroke} strokeWidth={2} strokeDasharray="5,5" rx={8} />
          <text x={s.x + 10} y={s.y + 25} fill={s.stroke} fontSize={14} fontWeight="bold" style={{ pointerEvents: 'none', userSelect: 'none' }}>{s.label}</text>
          {renderAnchors(s)}
          {renderSelectionOverlay(s)}
        </g>
      );
    }
    if (shape.type === ShapeType.STICKY) {
      const s = shape as StickyShape;
      return (
        <g key={s.id} {...commonProps}>
          <rect
            x={s.x} y={s.y} width={s.width} height={s.height}
            fill={s.fill} stroke={s.stroke === 'transparent' ? 'rgba(0,0,0,0.1)' : s.stroke}
            strokeWidth={1}
            filter="drop-shadow(2px 2px 2px rgba(0,0,0,0.1))"
          />
          {!isEditing ? (
            <foreignObject x={s.x} y={s.y} width={s.width} height={s.height} style={{ pointerEvents: 'none' }}>
              <div
                className="w-full h-full p-4 flex items-center justify-center text-center leading-snug font-sans select-none"
                style={{ color: '#1e293b', fontSize: '16px', wordWrap: 'break-word', overflow: 'hidden' }}
              >
                {s.text}
              </div>
            </foreignObject>
          ) : (
            <foreignObject x={s.x} y={s.y} width={s.width} height={s.height}>
              <textarea
                autoFocus
                className="w-full h-full p-4 bg-transparent resize-none outline-none text-center flex items-center justify-center font-sans"
                style={{ color: '#1e293b', fontSize: '16px' }}
                value={s.text}
                onChange={(e) => handleUpdateShape(s.id, { text: e.target.value })}
                onBlur={() => setEditingId(null)}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </foreignObject>
          )}
          {renderAnchors(s)}
          {renderSelectionOverlay(s)}
        </g>
      );
    }
    if (shape.type === ShapeType.TEXT) {
      const s = shape as TextShape;
      const { width, height } = getTextDimensions(s.text, s.fontSize);

      return (
        <g key={s.id} {...commonProps}>
          {/* Hit area rect - Transparent but catches clicks */}
          <rect x={s.x} y={s.y} width={width} height={height} fill="transparent" stroke="none" />

          {!isEditing ? (
            <foreignObject x={s.x} y={s.y} width={width} height={height} style={{ pointerEvents: 'none' }}>
              <div
                className="w-full h-full flex items-center p-1 select-none whitespace-pre-wrap"
                style={{ fontSize: s.fontSize, color: s.fill, lineHeight: 1.5 }}
              >
                {s.text || "Type something..."}
              </div>
            </foreignObject>
          ) : (
            <foreignObject x={s.x} y={s.y} width={width} height={height}>
              <textarea
                autoFocus
                className="w-full h-full bg-transparent outline-none p-1 border border-blue-500 border-dashed rounded resize-none overflow-hidden"
                style={{ fontSize: s.fontSize, color: s.fill, lineHeight: 1.5 }}
                value={s.text}
                onChange={(e) => handleUpdateShape(s.id, { text: e.target.value })}
                onBlur={() => setEditingId(null)}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </foreignObject>
          )}
          {renderAnchors(s)}
          {renderSelectionOverlay(s)}
        </g>
      );
    }
    return null;
  };

  const renderComments = () => {
    return (
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        {comments.map(c => {
          const screenX = c.x * scale + offset.x;
          const screenY = c.y * scale + offset.y;
          return (
            <Box
              key={c.id}
              className="absolute pointer-events-auto flex flex-col items-start gap-2"
              style={{
                transform: `translate(${screenX}px, ${screenY}px)`,
                zIndex: c.isOpen ? 50 : 10
              }}
              onPointerDown={(e) => handleCommentPointerDown(e, c.id)}
            >
              <button
                onClick={(e) => handleCommentClick(e, c.id)}
                className={`flex items-center justify-center w-10 h-10 rounded-full shadow-md transition-all duration-200 border-2 ${c.isOpen
                  ? 'bg-blue-600 border-white text-white scale-110'
                  : (isDarkMode ? 'bg-gray-800 border-gray-600 text-blue-400 hover:scale-110' : 'bg-white border-white text-blue-600 hover:scale-110')
                  }`}
              >
                <MessageSquare size={18} fill={c.isOpen ? "currentColor" : "none"} />
              </button>
              {c.isOpen && (
                <Box
                  className={`w-80 rounded-xl shadow-2xl border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-left ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                    }`}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <Flex className={`px-4 py-3 border-b justify-between items-center ${isDarkMode ? 'border-gray-700 bg-gray-900/50' : 'border-gray-100 bg-gray-50/50'}`}>
                    <Flex className="items-center gap-2">
                      <Box className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-blue-400' : 'bg-blue-500'}`}></Box>
                      <Text className={`text-xs font-bold uppercase tracking-wide ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Comments</Text>
                    </Flex>
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className={`p-1.5 rounded-md transition-colors ${isDarkMode ? 'hover:bg-red-900/30 text-gray-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'}`}
                      title="Delete thread"
                    >
                      <Trash2 size={14} />
                    </button>
                  </Flex>

                  {/* Messages Area */}
                  <Box className="max-h-64 overflow-y-auto p-4 space-y-4">
                    <style>{`.custom-scrollbar::-webkit-scrollbar { display: none; } .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
                    {c.messages.length === 0 && (
                      <Box className="text-center py-6 opacity-50">
                        <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
                        <Text className="text-xs">No comments yet.</Text>
                      </Box>
                    )}
                    {c.messages.map((m, i) => (
                      <Flex key={m.id} className="flex-col gap-1 animate-in slide-in-from-bottom-2 duration-300 fill-mode-backwards" style={{ animationDelay: `${i * 50}ms` }}>
                        <Box className={`p-3 rounded-2xl rounded-tl-none text-sm leading-relaxed shadow-sm ${isDarkMode
                          ? 'bg-gray-700 text-gray-100'
                          : 'bg-gray-100 text-gray-800'
                          }`}>
                          {m.text}
                        </Box>
                        <Text as="span" className="text-[10px] opacity-40 px-1">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </Flex>
                    ))}
                  </Box>

                  {/* Footer / Input */}
                  <div className={`p-3 border-t ${isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-100 bg-gray-50/50'}`}>
                    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-ring focus-within:ring-2 focus-within:ring-blue-500/20 ${isDarkMode ? 'bg-gray-900 border-gray-600' : 'bg-white border-gray-300'
                      }`}>
                      <input
                        type="text"
                        placeholder="Type a reply..."
                        className={`flex-1 bg-transparent text-sm outline-none min-w-0 ${isDarkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddCommentMessage(c.id, e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <button
                        className={`p-1.5 rounded-md transition-colors ${isDarkMode
                          ? 'text-blue-400 hover:bg-blue-900/30'
                          : 'text-blue-600 hover:bg-blue-50'
                          }`}
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          handleAddCommentMessage(c.id, input.value);
                          input.value = '';
                        }}
                      >
                        <Send size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </Box>
              )}
            </Box>
          );
        })}
      </div>
    );
  };

  // Sort shapes so Sections are always at the bottom
  const sortedShapes = [...shapes].sort((a, b) => {
    if (a.type === ShapeType.SECTION && b.type !== ShapeType.SECTION) return -1;
    if (a.type !== ShapeType.SECTION && b.type === ShapeType.SECTION) return 1;
    return 0;
  });

  return (
    <Flex className="h-full flex-col">
      <PageHeader
        title="Whiteboard"
        subtitle="Visual collaboration space for your team"
        compact
      />
    <Box className="w-full flex-1 relative overflow-hidden flex flex-col bg-background">

      {/* UI Overlay - Independent Layers */}
      <Box className="absolute inset-0 pointer-events-none z-50">

        {/* Top Center: Properties Panel - Independent Layer */}
        <Box className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
          {!isMobile && selectedId && (
            <Box className="pointer-events-auto">
              <PropertiesPanel
                selectedShape={shapes.find(s => s.id === selectedId) || null}
                updateShape={(id, updates, sh) => handleUpdateShape(id, updates, sh)}
                deleteShape={handleDeleteShape}
                projectId={projectId}
                elementId={shapeIdToElementIdMap.current.get(selectedId) || null}
                shapes={shapes}
                onAddShape={(s) => {
                  setShapes(prev => [...prev, s]);
                  saveHistory([...shapes, s]);
                }}
              />
            </Box>
          )}
        </Box>

        {/* Left Center: Toolbar - Independent Layer with Flex Centering */}
        <Box className="absolute left-0 top-0 bottom-0 w-20 flex items-center justify-start pointer-events-none">
          {!isMobile && (
            <Box className="pointer-events-auto pl-4">
              <Toolbar
                currentTool={tool}
                setTool={setTool}
                onOpenAI={() => setIsAIModalOpen(true)}
                shapes={shapes}
                onScrollToSection={scrollToSection}
                isNavOpen={isNavOpen}
                onToggleNav={() => setIsNavOpen(!isNavOpen)}
                onUndo={undo}
                onRedo={redo}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
              />
            </Box>
          )}
        </Box>
      </Box>

      <AIModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onGenerate={handleAIGenerated}
        onGenerateDiagram={handleAIDiagram}
      />

      <Box
        ref={containerRef}
        className={`flex-1 relative overflow-hidden ${tool === ToolType.HAND || isMobile ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
        style={{ userSelect: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={() => { if (isNavOpen) setIsNavOpen(false); }}
      >
        {/* Infinite Grid Pattern */}
        <svg
          id="canvas-bg"
          className="absolute inset-0 w-full h-full"
          style={{
            opacity: 0.1,
            transform: `translate(${offset.x % (40 * scale)}px, ${offset.y % (40 * scale)}px) scale(${scale})`
          }}
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" className="fill-foreground/20" />
            </pattern>

            <marker id="arrowhead-end" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" className="fill-foreground" />
            </marker>
            <marker id="arrowhead-start" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto">
              <polygon points="10 0, 0 3.5, 10 7" className="fill-foreground" />
            </marker>
            <marker id="circle-end" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
              <circle cx="4" cy="4" r="3" className="fill-foreground" />
            </marker>
            <marker id="circle-start" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
              <circle cx="4" cy="4" r="3" className="fill-foreground" />
            </marker>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" style={{ pointerEvents: 'none' }} />
        </svg>

        {/* Main Canvas SVG */}
        <svg
          className="absolute left-0 top-0 w-full h-full overflow-visible"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            pointerEvents: 'none'
          }}
        >
          {sortedShapes.map(renderShape)}
        </svg>

        {/* Comments Layer */}
        {renderComments()}

        {/* Zoom Indicator */}
        <Box className={`absolute bottom-4 right-4 border shadow-md rounded-md px-3 py-1 text-sm font-medium ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-600'}`}>
          {Math.round(scale * 100)}%
        </Box>

        {/* Mobile Banner */}
        {isMobile && (
          <Box className="absolute bottom-16 left-4 right-4 bg-blue-600 text-white p-3 rounded-lg shadow-lg text-center text-sm font-medium">
            View Only Mode. Switch to Desktop to edit.
          </Box>
        )}
      </Box>
    </Box >
    </Flex>
  );
}

export default WhiteboardPage;