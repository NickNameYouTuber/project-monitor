import React, { useRef, useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { 
  Pencil, 
  Square, 
  Circle, 
  ArrowRight, 
  Type, 
  Eraser,
  Undo2,
  Redo2,
  Download,
  Upload,
  Trash2,
  Palette
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { LoadingSpinner } from './loading-spinner';
import type { Project } from '../App';
import { getOrCreateBoard, createElement as apiCreateElement, updateElement as apiUpdateElement, deleteElement as apiDeleteElement, type WhiteboardDto } from '../api/whiteboards';

type Tool = 'pen' | 'rectangle' | 'circle' | 'arrow' | 'text' | 'eraser';

interface DrawingElement {
  id: string;
  type: Tool;
  x: number;
  y: number;
  width?: number;
  height?: number;
  endX?: number;
  endY?: number;
  text?: string;
  color: string;
  strokeWidth: number;
  path?: { x: number; y: number }[];
}

const colors = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', 
  '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080'
];

const strokeWidths = [1, 2, 4, 8, 16];

export function WhiteboardPage({ project }: { project: Project | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<Tool>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState(2);
  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [board, setBoard] = useState<WhiteboardDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!project) return;
      try {
        setIsLoading(true);
        const b = await getOrCreateBoard(project.id);
        setBoard(b);
        setElements(b.elements.map(e => ({
          id: e.id,
          type: (e.type as any) || 'rectangle',
          x: e.x,
          y: e.y,
          width: e.width,
          height: e.height,
          color: e.fill || '#000000',
          strokeWidth: (e.font_size || 2) as number,
          text: e.text,
        })));
      } catch {}
      finally {
        setIsLoading(false);
      }
    })();
  }, [project?.id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

    // Draw all elements
    elements.forEach(element => {
      ctx.strokeStyle = element.color;
      ctx.lineWidth = element.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      switch (element.type) {
        case 'pen':
          if (element.path && element.path.length > 1) {
            ctx.beginPath();
            ctx.moveTo(element.path[0].x, element.path[0].y);
            element.path.forEach(point => {
              ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
          }
          break;
        case 'rectangle':
          if (element.width && element.height) {
            ctx.strokeRect(element.x, element.y, element.width, element.height);
          }
          break;
        case 'circle':
          if (element.width && element.height) {
            const radius = Math.sqrt(Math.pow(element.width, 2) + Math.pow(element.height, 2)) / 2;
            ctx.beginPath();
            ctx.arc(element.x + element.width / 2, element.y + element.height / 2, radius, 0, 2 * Math.PI);
            ctx.stroke();
          }
          break;
        case 'arrow':
          if (element.endX !== undefined && element.endY !== undefined) {
            drawArrow(ctx, element.x, element.y, element.endX, element.endY);
          }
          break;
        case 'text':
          if (element.text) {
            ctx.fillStyle = element.color;
            ctx.font = `${element.strokeWidth * 8}px Arial`;
            ctx.fillText(element.text, element.x, element.y);
          }
          break;
      }
    });
  }, [elements]);

  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
    const headlen = 15;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setIsDrawing(true);
    setStartPos(pos);

    if (currentTool === 'pen') {
      setCurrentPath([pos]);
    } else if (currentTool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        const newElement: DrawingElement = {
          id: Date.now().toString(),
          type: 'text',
          x: pos.x,
          y: pos.y,
          text,
          color: currentColor,
          strokeWidth: currentStrokeWidth
        };
        setElements(prev => [...prev, newElement]);
        (async () => {
          try {
            if (!board) return;
            const created = await apiCreateElement(board.id, { type: 'text', x: newElement.x, y: newElement.y, text, fill: newElement.color, font_size: newElement.strokeWidth });
            setElements(prev => prev.map(el => el === newElement ? { ...newElement, id: created.id } : el));
          } catch {}
        })();
      }
      setIsDrawing(false);
    } else if (currentTool === 'eraser') {
      // Remove nearest element and delete via API
      const nearest = elements
        .map(el => ({ el, d: Math.hypot((el.x - pos.x), (el.y - pos.y)) }))
        .sort((a,b)=>a.d-b.d)[0];
      if (nearest && nearest.d < 20) {
        const delId = nearest.el.id;
        setElements(prev => prev.filter(e => e.id !== delId));
        (async () => { try { await apiDeleteElement(delId); } catch {} })();
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const pos = getMousePos(e);

    if (currentTool === 'pen') {
      setCurrentPath(prev => [...prev, pos]);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const pos = getMousePos(e);
    setIsDrawing(false);

    const newElement: DrawingElement = {
      id: Date.now().toString(),
      type: currentTool,
      x: startPos.x,
      y: startPos.y,
      color: currentColor,
      strokeWidth: currentStrokeWidth
    };

    switch (currentTool) {
      case 'pen':
        newElement.path = currentPath;
        break;
      case 'rectangle':
        newElement.width = pos.x - startPos.x;
        newElement.height = pos.y - startPos.y;
        break;
      case 'circle':
        newElement.width = pos.x - startPos.x;
        newElement.height = pos.y - startPos.y;
        break;
      case 'arrow':
        newElement.endX = pos.x;
        newElement.endY = pos.y;
        break;
    }

    if (currentTool !== 'text' && currentTool !== 'eraser') {
      setElements(prev => [...prev, newElement]);
      (async () => {
        try {
          if (!board) return;
          const payload: any = { type: currentTool, x: newElement.x, y: newElement.y, fill: newElement.color, font_size: newElement.strokeWidth };
          if (newElement.width !== undefined) payload.width = newElement.width;
          if (newElement.height !== undefined) payload.height = newElement.height;
          if (newElement.endX !== undefined && newElement.endY !== undefined) {
            payload.x = newElement.x; payload.y = newElement.y;
            payload.width = newElement.endX; payload.height = newElement.endY; // упрощённо
          }
          const created = await apiCreateElement(board.id, payload);
          setElements(prev => prev.map(el => el === newElement ? { ...newElement, id: created.id } : el));
        } catch {}
      })();
    }
    
    setCurrentPath([]);
  };

  const clearCanvas = () => {
    setElements([]);
  };

  const tools = [
    { id: 'pen', icon: Pencil, label: 'Pen' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
  ] as const;

  if (isLoading) {
    return <LoadingSpinner 
      stages={['Init Canvas', 'Load Board', 'Fetch Elements', 'Ready']}
    />;
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1>Whiteboard</h1>
            <p className="text-muted-foreground">Collaborative drawing and diagramming</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="border-b border-border p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            {tools.map(tool => {
              const Icon = tool.icon;
              return (
                <Button
                  key={tool.id}
                  variant={currentTool === tool.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentTool(tool.id)}
                >
                  <Icon className="w-4 h-4" />
                </Button>
              );
            })}
          </div>

          <Separator orientation="vertical" className="h-8" />

          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-muted-foreground" />
            <div className="flex gap-1">
              {colors.map(color => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded border-2 ${
                    currentColor === color ? 'border-foreground' : 'border-border'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setCurrentColor(color)}
                />
              ))}
            </div>
          </div>

          <Separator orientation="vertical" className="h-8" />

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Stroke:</span>
            <Select value={currentStrokeWidth.toString()} onValueChange={(value) => setCurrentStrokeWidth(Number(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {strokeWidths.map(width => (
                  <SelectItem key={width} value={width.toString()}>
                    {width}px
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator orientation="vertical" className="h-8" />

          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled>
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Redo2 className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={clearCanvas}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4">
        <div className="h-full bg-white rounded-lg border border-border overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => setIsDrawing(false)}
          />
        </div>
      </div>
    </div>
  );
}