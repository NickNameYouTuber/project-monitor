import { useEffect, useRef, useState, useCallback } from 'react';
import { Group, SegmentedControl, Text } from '@mantine/core';
import { Stage, Layer, Rect, Text as KText, Arrow, Transformer } from 'react-konva';
import { getOrCreateWhiteboard, createElement, updateElement, deleteElement, createConnection, deleteConnection, type WhiteboardElement, type WhiteboardConnection } from '../api/whiteboard';
import { useParams } from 'react-router-dom';
import Konva from 'konva';

type Tool = 'select' | 'hand' | 'sticky' | 'arrow' | 'delete';

export default function WhiteboardPage() {
  const { projectId } = useParams();
  const [tool, setTool] = useState<Tool>('select');
  const [boardId, setBoardId] = useState<string | null>(null);
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [connections, setConnections] = useState<WhiteboardConnection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawingArrow, setIsDrawingArrow] = useState(false);
  const [arrowStart, setArrowStart] = useState<string | null>(null);
  const [tempArrowPoints, setTempArrowPoints] = useState<number[]>([]);
  
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  // Load board data
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!projectId) return;
      try {
        const board = await getOrCreateWhiteboard(projectId);
        if (!mounted) return;
        setBoardId(board.id);
        setElements(board.elements || []);
        setConnections(board.connections || []);
      } catch (err) {
        console.error('Failed to load board:', err);
      }
    })();
    return () => { mounted = false; };
  }, [projectId]);

  // Measure container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(100, Math.floor(rect.width));
      const h = Math.max(100, Math.floor(rect.height));
      setSize({ width: w, height: h });
    };
    
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    
    return () => ro.disconnect();
  }, []);

  // Update transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current || !layerRef.current) return;
    
    if (selectedId && tool === 'select') {
      const node = layerRef.current.findOne(`#${selectedId}`);
      if (node) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    } else {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, tool]);

  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage || !boardId) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Click on empty space - deselect
    if (e.target === stage) {
      setSelectedId(null);
      
      if (tool === 'sticky') {
        // Create new sticky note
        const newEl: Partial<WhiteboardElement> = {
          type: 'sticky',
          x: Math.round(pos.x),
          y: Math.round(pos.y),
          width: 200,
          height: 150,
          rotation: 0,
          z_index: elements.length,
          text: 'Новая заметка',
          fill: '#ffeb3b'
        };
        
        createElement(boardId, newEl).then((el) => {
          setElements((prev) => [...prev, el]);
          setSelectedId(el.id);
          setTool('select');
        }).catch(console.error);
      }
      return;
    }

    // Click on element
    const clickedId = e.target.id();
    if (!clickedId) return;

    if (tool === 'delete') {
      // Delete element
      deleteElement(clickedId).then(() => {
        setElements((prev) => prev.filter(el => el.id !== clickedId));
        // Also delete connections to/from this element
        connections.filter(c => c.source_element_id === clickedId || c.target_element_id === clickedId)
          .forEach(c => {
            deleteConnection(c.id).catch(console.error);
          });
        setConnections(prev => prev.filter(c => c.source_element_id !== clickedId && c.target_element_id !== clickedId));
      }).catch(console.error);
    } else if (tool === 'arrow') {
      // Start or finish arrow
      if (!arrowStart) {
        setArrowStart(clickedId);
        setIsDrawingArrow(true);
        const el = elements.find(e => e.id === clickedId);
        if (el) {
          setTempArrowPoints([el.x + el.width/2, el.y + el.height/2, el.x + el.width/2, el.y + el.height/2]);
        }
      } else if (clickedId !== arrowStart) {
        // Create connection
        const conn: Partial<WhiteboardConnection> = {
          source_element_id: arrowStart,
          target_element_id: clickedId,
          stroke: '#333333',
          stroke_width: 2
        };
        
        createConnection(boardId, conn).then((c) => {
          setConnections((prev) => [...prev, c]);
        }).catch(console.error);
        
        setArrowStart(null);
        setIsDrawingArrow(false);
        setTempArrowPoints([]);
      }
    } else if (tool === 'select') {
      setSelectedId(clickedId);
    }
  }, [tool, boardId, elements, connections, arrowStart]);

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawingArrow || tempArrowPoints.length < 4) return;
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pos = stage.getPointerPosition();
    if (!pos) return;
    
    setTempArrowPoints([tempArrowPoints[0], tempArrowPoints[1], pos.x, pos.y]);
  }, [isDrawingArrow, tempArrowPoints]);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>, elementId: string) => {
    const node = e.target;
    updateElement(elementId, {
      x: Math.round(node.x()),
      y: Math.round(node.y())
    }).then(() => {
      setElements(prev => prev.map(el => 
        el.id === elementId 
          ? { ...el, x: Math.round(node.x()), y: Math.round(node.y()) }
          : el
      ));
    }).catch(console.error);
  }, []);

  const handleTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>, elementId: string) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    
    // Reset scale and apply to width/height
    node.scaleX(1);
    node.scaleY(1);
    
    updateElement(elementId, {
      x: Math.round(node.x()),
      y: Math.round(node.y()),
      width: Math.round(node.width() * scaleX),
      height: Math.round(node.height() * scaleY),
      rotation: Math.round(node.rotation())
    }).then(() => {
      setElements(prev => prev.map(el => 
        el.id === elementId 
          ? { 
              ...el, 
              x: Math.round(node.x()),
              y: Math.round(node.y()),
              width: Math.round(node.width() * scaleX),
              height: Math.round(node.height() * scaleY),
              rotation: Math.round(node.rotation())
            }
          : el
      ));
    }).catch(console.error);
  }, []);

  const handleTextDblClick = useCallback((elementId: string) => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return;
    
    const newText = prompt('Введите текст:', element.text || '');
    if (newText !== null && newText !== element.text) {
      updateElement(elementId, { text: newText }).then(() => {
        setElements(prev => prev.map(el => 
          el.id === elementId ? { ...el, text: newText } : el
        ));
      }).catch(console.error);
    }
  }, [elements]);

  // Calculate arrow points
  const getArrowPoints = useCallback((conn: WhiteboardConnection): number[] => {
    const source = elements.find(el => el.id === conn.source_element_id);
    const target = elements.find(el => el.id === conn.target_element_id);
    
    if (!source || !target) return [];
    
    const sx = source.x + source.width / 2;
    const sy = source.y + source.height / 2;
    const tx = target.x + target.width / 2;
    const ty = target.y + target.height / 2;
    
    return [sx, sy, tx, ty];
  }, [elements]);

  return (
    <div className="h-full w-full flex flex-col" style={{ height: '100%' }}>
      <Group p="sm" gap="sm" className="shrink-0 bg-white border-b">
        <SegmentedControl
          value={tool}
          onChange={(v) => setTool(v as Tool)}
          data={[
            { label: '↖ Выбор', value: 'select' },
            { label: '✋ Рука', value: 'hand' },
            { label: '📝 Стикер', value: 'sticky' },
            { label: '→ Стрелка', value: 'arrow' },
            { label: '🗑 Удалить', value: 'delete' },
          ]}
        />
        
        {selectedId && (
          <Text size="sm" c="dimmed">
            Выбран элемент
          </Text>
        )}
        
        {isDrawingArrow && (
          <Text size="sm" c="blue">
            Кликните на целевой элемент
          </Text>
        )}
      </Group>

      <div
        ref={containerRef}
        className="flex-1 w-full overflow-hidden"
        style={{
          backgroundImage: 'radial-gradient(circle, #e0e0e0 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          backgroundColor: '#f5f5f5',
          cursor: tool === 'hand' ? 'grab' : tool === 'sticky' ? 'crosshair' : tool === 'delete' ? 'pointer' : 'default'
        }}
      >
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          draggable={tool === 'hand'}
        >
          <Layer ref={layerRef}>
            {/* Render connections */}
            {connections.map((conn) => {
              const points = getArrowPoints(conn);
              if (points.length === 0) return null;
              
              return (
                <Arrow
                  key={conn.id}
                  points={points}
                  stroke={conn.stroke || '#333333'}
                  strokeWidth={conn.stroke_width || 2}
                  fill={conn.stroke || '#333333'}
                  pointerLength={10}
                  pointerWidth={10}
                />
              );
            })}
            
            {/* Temp arrow while drawing */}
            {isDrawingArrow && tempArrowPoints.length === 4 && (
              <Arrow
                points={tempArrowPoints}
                stroke="#2196f3"
                strokeWidth={2}
                fill="#2196f3"
                pointerLength={10}
                pointerWidth={10}
                dash={[5, 5]}
              />
            )}
            
            {/* Render elements */}
            {elements.map((el) => (
              <Group key={el.id}>
                <Rect
                  id={el.id}
                  x={el.x}
                  y={el.y}
                  width={el.width}
                  height={el.height}
                  rotation={el.rotation}
                  fill={el.fill || '#ffeb3b'}
                  shadowBlur={3}
                  shadowOffsetX={2}
                  shadowOffsetY={2}
                  shadowOpacity={0.2}
                  draggable={tool === 'select'}
                  onDragEnd={(e) => handleDragEnd(e, el.id)}
                  onTransformEnd={(e) => handleTransformEnd(e, el.id)}
                  onDblClick={() => handleTextDblClick(el.id)}
                  cornerRadius={4}
                />
                {el.text && (
                  <KText
                    x={el.x}
                    y={el.y}
                    width={el.width}
                    height={el.height}
                    text={el.text}
                    fontSize={14}
                    fontFamily="Arial"
                    fill="#333"
                    align="center"
                    verticalAlign="middle"
                    padding={10}
                    listening={false}
                  />
                )}
              </Group>
            ))}
            
            {/* Transformer for selected element */}
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                // Limit resize
                if (newBox.width < 50 || newBox.height < 50) {
                  return oldBox;
                }
                return newBox;
              }}
            />
          </Layer>
        </Stage>
      </div>
    </div>
  );
}