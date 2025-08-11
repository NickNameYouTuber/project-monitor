import { useEffect, useRef, useState, useCallback } from 'react';
import { Group as MantineGroup, SegmentedControl, Text, Button } from '@mantine/core';
import { Stage, Layer, Rect, Text as KText, Group as KonvaGroup } from 'react-konva';
import { getOrCreateWhiteboard, createElement, updateElement, type WhiteboardElement } from '../api/whiteboard';
import { useParams } from 'react-router-dom';
import Konva from 'konva';

type Tool = 'hand' | 'sticky';

export default function WhiteboardPage() {
  const { projectId } = useParams();
  const [tool, setTool] = useState<Tool>('hand');
  const [boardId, setBoardId] = useState<string | null>(null);
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
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
        // ignore connections in minimal version
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
          cursor: tool === 'hand' ? 'grab' : tool === 'sticky' ? 'crosshair' : tool === 'delete' ? 'pointer' : 'default'
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
            {/* Render elements */}
             {elements.map((el) => (
               <KonvaGroup key={el.id}>
                <Rect
                  id={el.id}
                  x={el.x}
                  y={el.y}
                  width={el.width}
                  height={el.height}
                  rotation={0}
                  fill={el.fill || '#ffeb3b'}
                  shadowBlur={3}
                  shadowOffsetX={2}
                  shadowOffsetY={2}
                  shadowOpacity={0.2}
                  draggable
                  onDragEnd={(e) => handleDragEnd(e, el.id)}
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
               </KonvaGroup>
            ))}
            
            {/* no transformer in minimal */}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}