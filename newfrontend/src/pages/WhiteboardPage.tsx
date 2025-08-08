import { useEffect, useRef, useState } from 'react';
import { Group, Button, SegmentedControl } from '@mantine/core';
import { Stage, Layer, Rect, Text as KText, Arrow } from 'react-konva';
import { getOrCreateWhiteboard, createElement, updateElement, type WhiteboardElement, type WhiteboardConnection } from '../api/whiteboard';
import { useParams } from 'react-router-dom';

type Tool = 'select' | 'hand' | 'sticky' | 'arrow';

export default function WhiteboardPage() {
  const { projectId } = useParams();
  const [tool, setTool] = useState<Tool>('select');
  const [boardId, setBoardId] = useState<string | null>(null);
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [connections, setConnections] = useState<WhiteboardConnection[]>([]);
  const [, setScale] = useState(1);
  const [, setOffset] = useState({ x: 0, y: 0 });
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const isPanningRef = useRef(false);
  const lastPosRef = useRef<{x: number; y: number} | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!projectId) return;
      const board = await getOrCreateWhiteboard(projectId);
      if (!mounted) return;
      setBoardId(board.id);
      setElements(board.elements ?? []);
      setConnections(board.connections ?? []);
    })();
    return () => { mounted = false; };
  }, [projectId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const onWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const scaleBy = 1.05;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const direction = e.evt.deltaY > 0 ? 1 : -1;
    const newScale = direction > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    stage.scale({ x: newScale, y: newScale });
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);
    stage.batchDraw();
    setScale(newScale);
    setOffset(newPos);
  };

  const handleMouseDown = () => {
    const stage = stageRef.current;
    if (!stage) return;
    // start panning in hand tool
    if (tool === 'hand') {
      isPanningRef.current = true;
      lastPosRef.current = stage.getPointerPosition();
    } else if (tool === 'sticky' && boardId) {
      const pos = stage.getPointerPosition();
      if (!pos) return;
      const newEl: Partial<WhiteboardElement> = { type: 'sticky', x: Math.round((pos.x - stage.x())/stage.scaleX()), y: Math.round((pos.y - stage.y())/stage.scaleY()), width: 160, height: 120, rotation: 0, z_index: elements.length, text: 'Стикер', fill: '#fff59d' };
      createElement(boardId, newEl).then((el) => setElements((prev) => [...prev, el]));
    }
  };

  const handleMouseMove = () => {
    const stage = stageRef.current;
    if (!stage) return;
    if (isPanningRef.current && lastPosRef.current) {
      const pos = stage.getPointerPosition();
      if (!pos) return;
      const dx = pos.x - lastPosRef.current.x;
      const dy = pos.y - lastPosRef.current.y;
      stage.position({ x: stage.x() + dx, y: stage.y() + dy });
      lastPosRef.current = pos;
      stage.batchDraw();
      setOffset({ x: stage.x(), y: stage.y() });
    }
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;
    lastPosRef.current = null;
  };

  return (
    <div className="h-full w-full flex flex-col" style={{ minHeight: '100%', height: '100%' }}>
      <Group p="sm" gap="sm" className="shrink-0">
        <SegmentedControl
          value={tool}
          onChange={(v) => setTool(v as Tool)}
          data={[
            { label: 'Выделение', value: 'select' },
            { label: 'Рука', value: 'hand' },
            { label: 'Стикер', value: 'sticky' },
            { label: 'Стрелка', value: 'arrow' },
          ]}
        />
        <Button variant="light" onClick={() => {
          const stage = stageRef.current;
          if (!stage) return;
          stage.scale({ x: 1, y: 1 });
          stage.position({ x: 0, y: 0 });
          stage.batchDraw();
          setScale(1);
          setOffset({ x: 0, y: 0 });
        }}>Сброс</Button>
      </Group>

      <div
        ref={containerRef}
        className="flex-1 w-full"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          minHeight: '0',
        }}
      >
        <Stage
          ref={stageRef}
          width={Math.max(1, size.width)}
          height={Math.max(1, size.height)}
          onWheel={onWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <Layer>
            {connections.map((c) => (
              <Arrow key={c.id} points={c.points ? JSON.parse(c.points) : []} stroke={c.stroke || '#2b2d42'} strokeWidth={c.stroke_width || 2} pointerLength={10} pointerWidth={10} />
            ))}
            {elements.map((el) => (
              <>
                <Rect
                  key={el.id}
                  x={el.x}
                  y={el.y}
                  width={el.width}
                  height={el.height}
                  rotation={el.rotation}
                  fill={el.fill || '#fff59d'}
                  shadowBlur={2}
                  draggable={tool === 'select'}
                  onDragEnd={(e) => {
                    updateElement(el.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }).then((saved) => {
                      setElements((prev) => prev.map((it) => it.id === el.id ? { ...it, x: saved.x, y: saved.y } as any : it));
                    });
                  }}
                />
                {el.text && (
                  <KText x={el.x + 8} y={el.y + 8} text={el.text} fontSize={16} fill="#1f2937" width={el.width - 16} />
                )}
              </>
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}


