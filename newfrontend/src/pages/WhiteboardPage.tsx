import { useEffect, useRef, useState } from 'react';
import { Button, Card, Group, Textarea } from '@mantine/core';
import { createConnection, createElement, deleteElement, getOrCreateWhiteboard, updateElement, type Whiteboard } from '../api/whiteboard';
import { useParams } from 'react-router-dom';

type Mode = 'select' | 'connect' | 'add-sticky';

export default function WhiteboardPage() {
  const { projectId } = useParams();
  const [whiteboard, setWhiteboard] = useState<Whiteboard | null>(null);
  const [mode, setMode] = useState<Mode>('select');
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projectId) return;
    getOrCreateWhiteboard(projectId).then(setWhiteboard);
  }, [projectId]);

  const elements = whiteboard?.elements || [];
  const connections = whiteboard?.connections || [];

  async function addSticky() {
    if (!whiteboard) return;
    const el = await createElement(whiteboard.id, { type: 'sticky', text: '', x: 200, y: 200, width: 220, height: 140, color: '#FFF8B3' });
    setWhiteboard({ ...whiteboard, elements: [...elements, el] });
  }

  function onDragStart(e: React.MouseEvent, id: string) {
    if (mode !== 'select') return;
    const el = elements.find(e => e.id === id);
    if (!el) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = el.x;
    const origY = el.y;
    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      setWhiteboard((prev) => prev ? { ...prev, elements: prev.elements.map(it => it.id === id ? { ...it, x: origX + dx, y: origY + dy } : it) } : prev);
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      const after = elements.find(e => e.id === id);
      if (after && whiteboard) void updateElement(whiteboard.id, id, { x: after.x, y: after.y });
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  async function startConnect(id: string) {
    if (!whiteboard) return;
    if (!connectingFrom) {
      setConnectingFrom(id);
    } else if (connectingFrom && connectingFrom !== id) {
      const conn = await createConnection(whiteboard.id, { from_element_id: connectingFrom, to_element_id: id });
      setWhiteboard({ ...whiteboard, connections: [...connections, conn] });
      setConnectingFrom(null);
    }
  }

  const svgWidth = boardRef.current?.clientWidth || 0;
  const svgHeight = boardRef.current?.clientHeight || 0;

  return (
    <div className="h-full w-full flex flex-col">
      <Group p="sm" justify="space-between" className="border-b">
        <Group>
          <Button size="xs" variant={mode === 'select' ? 'filled' : 'light'} onClick={() => setMode('select')}>Выделение</Button>
          <Button size="xs" variant={mode === 'add-sticky' ? 'filled' : 'light'} onClick={() => setMode('add-sticky')}>Стикер</Button>
          <Button size="xs" variant={mode === 'connect' ? 'filled' : 'light'} onClick={() => setMode('connect')}>Связь</Button>
        </Group>
        <Group>
          {mode === 'add-sticky' && <Button size="xs" onClick={addSticky}>Добавить стикер</Button>}
        </Group>
      </Group>

      <div ref={boardRef} className="relative flex-1 overflow-auto bg-[var(--mantine-color-gray-1)] dark:bg-[var(--mantine-color-dark-6)]">
        {/* connections */}
        <svg className="absolute inset-0 pointer-events-none" width={svgWidth} height={svgHeight}>
          {connections.map((c) => {
            const from = elements.find(e => e.id === c.from_element_id);
            const to = elements.find(e => e.id === c.to_element_id);
            if (!from || !to) return null;
            const x1 = from.x + from.width / 2;
            const y1 = from.y + from.height / 2;
            const x2 = to.x + to.width / 2;
            const y2 = to.y + to.height / 2;
            const path = `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}`;
            return <path key={c.id} d={path} stroke="#6b7280" strokeWidth={2} fill="none" markerEnd="url(#arrowhead)" />;
          })}
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
            </marker>
          </defs>
        </svg>

        {/* elements */}
        {elements.map((el) => (
          <Card key={el.id} className="absolute" style={{ left: el.x, top: el.y, width: el.width, height: el.height, background: el.color }} withBorder shadow="sm">
            <Group justify="space-between" mb="xs">
              <Group gap={6}>
                <Button size="xs" variant="subtle" onMouseDown={(e) => onDragStart(e, el.id)}>⋮⋮</Button>
                {mode === 'connect' && <Button size="xs" onClick={() => startConnect(el.id)}>{connectingFrom === el.id ? 'От' : 'Связать'}</Button>}
              </Group>
              <Button size="xs" variant="light" color="red" onClick={async () => { if (!whiteboard) return; await deleteElement(whiteboard.id, el.id); setWhiteboard({ ...whiteboard, elements: elements.filter(e => e.id !== el.id) }); }}>×</Button>
            </Group>
            <Textarea variant="unstyled" autosize minRows={3} value={el.text || ''} onChange={async (e) => { if (!whiteboard) return; const text = e.currentTarget.value; setWhiteboard({ ...whiteboard, elements: elements.map(it => it.id === el.id ? { ...it, text } : it) }); await updateElement(whiteboard.id, el.id, { text }); }} />
          </Card>
        ))}
      </div>
    </div>
  );
}


