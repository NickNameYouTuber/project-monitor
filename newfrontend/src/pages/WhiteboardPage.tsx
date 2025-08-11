import { useEffect, useRef, useState, useCallback } from 'react';
import { Group as MantineGroup, SegmentedControl, Text, Button } from '@mantine/core';
import { Stage, Layer, Rect, Text as KText, Group as KonvaGroup, Circle, Arrow } from 'react-konva';
import { getOrCreateWhiteboard, createElement, updateElement, createConnection, type WhiteboardElement, type WhiteboardConnection } from '../api/whiteboard';
import { useParams } from 'react-router-dom';
import Konva from 'konva';

type Tool = 'hand' | 'sticky';

export default function WhiteboardPage() {
  const { projectId } = useParams();
  const [tool, setTool] = useState<Tool>('hand');
  const [boardId, setBoardId] = useState<string | null>(null);
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [connections, setConnections] = useState<WhiteboardConnection[]>([]);
  const [tempLine, setTempLine] = useState<number[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  // transformer removed in minimal version
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

  // no transformer logic

  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage || !boardId) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Click on empty space (stage or empty layer) - deselect and optionally create sticky
    const isEmpty = e.target === stage || e.target.getClassName?.() === 'Layer';
    if (isEmpty) {
      setSelectedId(null);
      
      if (tool === 'sticky') {
        // Create new sticky note
        const newEl: Partial<WhiteboardElement> = {
          type: 'sticky',
          x: Math.round(pos.x - 100),
          y: Math.round(pos.y - 75),
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
        }).catch(console.error);
      }
      return;
    }

    // Click on element
    const clickedId = e.target.id();
    if (!clickedId) return;
    setSelectedId(clickedId);
  }, [tool, boardId, elements]);

  // no mouse move logic in minimal mode

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

  // no resize/rotate in minimal mode

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

  // minimal version: no connections

  return (
    <div className="h-full w-full flex flex-col" style={{ height: '100%' }}>
      <MantineGroup p="sm" gap="sm" className="shrink-0 bg-white border-b">
        <SegmentedControl value={tool} onChange={(v) => setTool(v as Tool)} data={[
          { label: '✋ Перемещение', value: 'hand' },
          { label: '📝 Стикер', value: 'sticky' },
        ]} />
        
        {selectedId && (<Text size="sm" c="dimmed">Выбран элемент</Text>)}
        <Button size="xs" variant="default" onClick={() => setSelectedId(null)}>Снять выделение</Button>
      </MantineGroup>

      <div
        ref={containerRef}
        className="flex-1 w-full overflow-hidden"
        style={{
          backgroundImage: 'radial-gradient(circle, #e0e0e0 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          backgroundColor: '#f5f5f5',
          cursor: tool === 'hand' ? 'grab' : tool === 'sticky' ? 'crosshair' : 'default'
        }}
      >
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          onMouseDown={handleStageMouseDown}
          // no mouse move handler
          draggable={tool === 'hand'}
          dragBoundFunc={(pos) => pos}
        >
          <Layer ref={layerRef}>
            {/* Connections */}
            {connections.map((conn) => {
              const src = elements.find(el => el.id === conn.source_element_id);
              const dst = elements.find(el => el.id === conn.target_element_id);
              if (!src || !dst) return null;
              const sx = src.x + src.width / 2;
              const sy = src.y + src.height / 2;
              const tx = dst.x + dst.width / 2;
              const ty = dst.y + dst.height / 2;
              return (
                <Arrow key={conn.id}
                  points={[sx, sy, tx, ty]}
                  stroke={conn.stroke || '#8a8d91'}
                  fill={conn.stroke || '#8a8d91'}
                  strokeWidth={conn.stroke_width || 2}
                  pointerLength={8}
                  pointerWidth={8}
                />
              );
            })}
            {tempLine && (
              <Arrow points={tempLine} stroke="#2196f3" fill="#2196f3" strokeWidth={2} pointerLength={8} pointerWidth={8} dash={[6,6]} />
            )}
            {/* Render elements */}
             {elements.map((el) => (
               <KonvaGroup
                 key={el.id}
                 id={el.id}
                 x={el.x}
                 y={el.y}
                 draggable
                 onDragEnd={(e) => handleDragEnd(e, el.id)}
                 onDblClick={() => handleTextDblClick(el.id)}
               >
                 <Rect
                   width={el.width}
                   height={el.height}
                   rotation={0}
                   fill={el.fill || '#ffeb3b'}
                   shadowBlur={3}
                   shadowOffsetX={2}
                   shadowOffsetY={2}
                   shadowOpacity={0.2}
                   cornerRadius={4}
                 />
                  {el.text && (
                   <KText
                     x={0}
                     y={0}
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
                  {selectedId === el.id && (
                    <>
                      {anchorPoints(el).map((p, idx) => (
                        <Circle
                          key={idx}
                          x={p.x}
                          y={p.y}
                          radius={5}
                          fill="#1971c2"
                          stroke="#fff"
                          strokeWidth={1}
                          draggable
                          onDragMove={(e) => {
                            const group = e.target.getParent();
                            const gx = (group?.x() || 0) + p.x;
                            const gy = (group?.y() || 0) + p.y;
                            const stage = e.target.getStage();
                            const pos = stage?.getPointerPosition();
                            if (pos) setTempLine([gx, gy, pos.x, pos.y]);
                          }}
                          onDragEnd={(e) => {
                            setTempLine(null);
                            const stage = e.target.getStage();
                            const pos = stage?.getPointerPosition();
                            if (!pos) return;
                            const layers = stage ? stage.getLayers() : [] as any[];
                            const layer = layers && layers.length > 0 ? layers[0] : null;
                            const nodes = layer ? layer.find('Group') : [];
                            let targetId: string | null = null;
                            nodes.forEach((node:any) => {
                              if (node.id() === el.id) return;
                              const nx = node.x();
                              const ny = node.y();
                              const rect = node.findOne('Rect');
                              if (!rect) return;
                              const w = rect.width();
                              const h = rect.height();
                              if (pos.x >= nx && pos.x <= nx + w && pos.y >= ny && pos.y <= ny + h) {
                                targetId = node.id();
                              }
                            });
                            if (targetId && boardId) {
                              createConnection(boardId, { source_element_id: el.id, target_element_id: targetId, stroke: '#8a8d91', stroke_width: 2 })
                                .then((c) => setConnections(prev => [...prev, c]))
                                .catch(console.error);
                            }
                            e.target.position({ x: p.x, y: p.y });
                          }}
                        />
                      ))}
                    </>
                  )}
               </KonvaGroup>
             ))}
            
            {/* no transformer in minimal */}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}

function anchorPoints(el: WhiteboardElement) {
  return [
    { x: 0, y: 0 },
    { x: el.width / 2, y: 0 },
    { x: el.width, y: 0 },
    { x: el.width, y: el.height / 2 },
    { x: el.width, y: el.height },
    { x: el.width / 2, y: el.height },
    { x: 0, y: el.height },
    { x: 0, y: el.height / 2 },
  ];
}