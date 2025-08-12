import { useEffect, useRef, useState, useCallback } from 'react';
import { Group as MantineGroup, SegmentedControl, Text, Button } from '@mantine/core';
import { Stage, Layer, Rect, Text as KText, Group as KonvaGroup, Circle, Arrow } from 'react-konva';
import { getOrCreateWhiteboard, createElement, updateElement, createConnection, deleteElement, updateConnection, deleteConnection, type WhiteboardElement, type WhiteboardConnection } from '../api/whiteboard';
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
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [pendingFill, setPendingFill] = useState<string | null>(null);
  const [pendingTextColor, setPendingTextColor] = useState<string | null>(null);
  const [pendingFontFamily, setPendingFontFamily] = useState<string | null>(null);
  const [pendingFontSize, setPendingFontSize] = useState<number | null>(null);
  
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  // transformer removed in minimal version
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

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
      // Use clientWidth/Height to avoid scrollbar-driven layout shifts
      const w = Math.max(100, Math.floor(el.clientWidth));
      const h = Math.max(100, Math.floor(el.clientHeight));
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
      setSelectedConnectionId(null);
      
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

    // Click on element: resolve group id so anchors show
    const target = e.target as any;
    const parent = target?.getParent?.();
    const groupId = parent && parent.getClassName && parent.getClassName() === 'Group' && parent.id ? parent.id() : null;
    const clickedId = groupId || (target?.id ? target.id() : null);
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
    <div className="w-full h-full flex flex-col overflow-hidden">
      <MantineGroup p="sm" gap="sm" className="shrink-0 bg-white border-b">
        <SegmentedControl value={tool} onChange={(v) => setTool(v as Tool)} data={[
          { label: '✋ Перемещение', value: 'hand' },
          { label: '📝 Стикер', value: 'sticky' },
        ]} />
        
        {(!!selectedId || !!selectedConnectionId) && (
          <Text size="sm" c="dimmed">{selectedId ? 'Выбран стикер' : 'Выбрана стрелка'}</Text>
        )}
        <Button size="xs" variant="default" onClick={() => { setSelectedId(null); setSelectedConnectionId(null); }}>Снять выделение</Button>
        {selectedId && (
          <Button size="xs" color="red" variant="filled" onClick={() => {
            // удаление выбранного стикера
            const id = selectedId;
            setSelectedId(null);
            // optimistic remove on frontend and call backend
            setElements(prev => prev.filter(el => el.id !== id));
            // remove related connections visually
            setConnections(prev => prev.filter(c => c.source_element_id !== id && c.target_element_id !== id));
            // backend delete with auth token
           deleteElement(id).catch(() => {});
          }}>Удалить стикер</Button>
        )}
      </MantineGroup>

      <div
        ref={containerRef}
        className="flex-1 w-full overflow-hidden relative"
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
          draggable={tool === 'hand' && !connectingFromId}
          x={stagePos.x}
          y={stagePos.y}
          scaleX={scale}
          scaleY={scale}
          dragBoundFunc={(pos) => pos}
          onWheel={(e) => {
            if (!e.evt.ctrlKey) return;
            e.evt.preventDefault();
            const stage = stageRef.current;
            if (!stage) return;
            const oldScale = scale;
            const pointer = stage.getPointerPosition();
            if (!pointer) return;
            const mousePointTo = {
              x: (pointer.x - stagePos.x) / oldScale,
              y: (pointer.y - stagePos.y) / oldScale,
            };
            const direction = e.evt.deltaY > 0 ? -1 : 1;
            const scaleBy = 1.05;
            let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
            newScale = Math.max(0.25, Math.min(3, newScale));
            const newPos = {
              x: pointer.x - mousePointTo.x * newScale,
              y: pointer.y - mousePointTo.y * newScale,
            };
            setScale(newScale);
            setStagePos(newPos);
          }}
          onDblClick={() => {
            const stage = stageRef.current;
            if (!stage) return;
            const p = stage.getPointerPosition();
            if (!p) return;
            // Center view on double click
            const newScale = 1.4;
            const center = { x: size.width / 2, y: size.height / 2 };
            const mousePointTo = { x: (p.x - stagePos.x) / scale, y: (p.y - stagePos.y) / scale };
            const newPos = { x: center.x - mousePointTo.x * newScale, y: center.y - mousePointTo.y * newScale };
            setScale(newScale);
            setStagePos(newPos);
          }}
        >
          <Layer ref={layerRef}>
            {/* Connections */}
            {connections.map((conn) => {
              const src = elements.find(el => el.id === conn.source_element_id);
              const dst = elements.find(el => el.id === conn.target_element_id);
              if (!src || !dst) return null;
              const srcAnchor = nearestAnchorPoint(src, dst.x + dst.width / 2, dst.y + dst.height / 2);
              const dstAnchor = nearestAnchorPoint(dst, src.x + src.width / 2, src.y + src.height / 2);
              const sx = src.x + srcAnchor.x;
              const sy = src.y + srcAnchor.y;
              const tx = dst.x + dstAnchor.x;
              const ty = dst.y + dstAnchor.y;
              const dashed = getDashedFlag(conn);
              const isSelected = selectedConnectionId === conn.id;
              return (
                <Arrow key={conn.id}
                  points={[sx, sy, tx, ty]}
                  stroke={conn.stroke || '#8a8d91'}
                  fill={conn.stroke || '#8a8d91'}
                  strokeWidth={(conn.stroke_width || 2) + (isSelected ? 1 : 0)}
                  pointerLength={getHeadsMeta(conn) === 'none' ? 0 : 8}
                  pointerWidth={getHeadsMeta(conn) === 'none' ? 0 : 8}
                  pointerAtBeginning={getHeadsMeta(conn) === 'both'}
                  dash={dashed ? [8, 6] : undefined}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    setSelectedId(null);
                    setSelectedConnectionId(conn.id);
                  }}
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
                  draggable={!connectingFromId}
                  onDragMove={(e) => {
                    const node = e.target;
                    const nx = Math.round(node.x());
                    const ny = Math.round(node.y());
                    setElements(prev => prev.map(it => it.id === el.id ? { ...it, x: nx, y: ny } : it));
                  }}
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
                      fontSize={el.font_size ?? 14}
                      fontFamily={el.font_family ?? 'Arial'}
                      fill={el.text_color ?? '#333'}
                     align="center"
                     verticalAlign="middle"
                     padding={10}
                     listening={false}
                   />
                 )}
                  {(selectedId === el.id || (tempLine && hoveredTargetId === el.id)) && (
                    <>
                      {anchorPoints(el).map((p, idx) => (
                        <>
                          {/* Large guard zone around anchor to capture drag attempts and override sticker drag */}
                          <Circle
                            key={`guard-${idx}`}
                            x={p.x}
                            y={p.y}
                            radius={20}
                            fill="rgba(0,0,0,0.001)"
                            strokeEnabled={false}
                            listening
                            draggable
                            onMouseEnter={(e) => {
                              const container = e.target.getStage()?.container();
                              if (container) container.style.cursor = 'crosshair';
                            }}
                            onMouseLeave={(e) => {
                              const container = e.target.getStage()?.container();
                              if (container) container.style.cursor = 'default';
                            }}
                            onDragStart={(e) => {
                              e.cancelBubble = true;
                              setConnectingFromId(el.id);
                              
                              // Start drawing line from anchor position (not guard circle position)
                              const parentGroup = (e.target as any).getParent();
                              const groupPos = parentGroup ? { x: parentGroup.x(), y: parentGroup.y() } : { x: 0, y: 0 };
                              const sx = groupPos.x + p.x;
                              const sy = groupPos.y + p.y;
                              setTempLine([sx, sy, sx, sy]);
                            }}
                            onDragMove={(e) => {
                              e.cancelBubble = true;
                              const stage = e.target.getStage();
                              const pos = stage?.getPointerPosition();
                              if (!pos) return;
                              
                              // Start point is the actual anchor position, not the guard circle
                              const parentGroup = (e.target as any).getParent();
                              const groupPos = parentGroup ? { x: parentGroup.x(), y: parentGroup.y() } : { x: 0, y: 0 };
                              const sx = groupPos.x + p.x;
                              const sy = groupPos.y + p.y;
                              
                              let ex = pos.x;
                              let ey = pos.y;
                              
                              // detect hovered target
                              const layers = stage ? stage.getLayers() : ([] as any[]);
                              const layer = layers && layers.length > 0 ? layers[0] : null;
                              const nodes: any = layer ? layer.find('Group') : [];
                              let targetId: string | null = null;
                              const arr = nodes?.toArray ? nodes.toArray() : nodes;
                              arr.forEach((node: any) => {
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
                              setHoveredTargetId(targetId);
                              if (targetId) {
                                const targetEl = elements.find(it => it.id === targetId);
                                if (targetEl) {
                                  const local = nearestAnchorPoint(targetEl, ex, ey);
                                  ex = targetEl.x + local.x;
                                  ey = targetEl.y + local.y;
                                }
                              }
                              setTempLine([sx, sy, ex, ey]);
                            }}
                            onDragEnd={(e) => {
                              e.cancelBubble = true;
                              setTempLine(null);
                              setHoveredTargetId(null);
                              setConnectingFromId(null);
                              
                              const stage = e.target.getStage();
                              const pos = stage?.getPointerPosition();
                              if (!pos) {
                                // Reset position to original anchor
                                e.target.position({ x: p.x, y: p.y });
                                return;
                              }
                              
                              const layers = stage ? stage.getLayers() : ([] as any[]);
                              const layer = layers && layers.length > 0 ? layers[0] : null;
                              const nodes: any = layer ? layer.find('Group') : [];
                              let targetId: string | null = null;
                              const arr = nodes?.toArray ? nodes.toArray() : nodes;
                              arr.forEach((node:any) => {
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
                              
                              // Reset position to original anchor
                              e.target.position({ x: p.x, y: p.y });
                            }}
                          />
                          {/* Actual small anchor */}
                          <Circle
                            key={`anchor-${idx}`}
                            x={p.x}
                            y={p.y}
                            radius={5}
                            fill="#1971c2"
                            stroke="#fff"
                            strokeWidth={1}
                            listening={false}
                          />
                        </>
                      ))}
                    </>
                  )}
               </KonvaGroup>
             ))}
            
            {/* no transformer in minimal */}
          </Layer>
        </Stage>
        {/* Minimap */}
        <div style={{ position: 'absolute', right: 8, bottom: 8, width: 180, height: 120, background: '#fff', border: '1px solid #e9ecef', borderRadius: 4, boxShadow: '0 2px 6px rgba(0,0,0,0.08)', overflow: 'hidden', cursor: 'pointer' }}
          onMouseDown={(ev) => {
            const rect = (ev.currentTarget as HTMLDivElement).getBoundingClientRect();
            const rx = ev.clientX - rect.left;
            const ry = ev.clientY - rect.top;
            // compute world bounds
            const worldMinX = Math.min(0, ...elements.map(e => e.x));
            const worldMinY = Math.min(0, ...elements.map(e => e.y));
            const worldMaxX = Math.max(size.width, ...elements.map(e => e.x + e.width));
            const worldMaxY = Math.max(size.height, ...elements.map(e => e.y + e.height));
            const worldW = Math.max(1, worldMaxX - worldMinX);
            const worldH = Math.max(1, worldMaxY - worldMinY);
            const mmW = 180, mmH = 120;
            const sx = mmW / worldW;
            const sy = mmH / worldH;
            const s = Math.min(sx, sy);
            const wx = rx / s + worldMinX;
            const wy = ry / s + worldMinY;
            // center stage to (wx, wy)
            const center = { x: size.width / 2, y: size.height / 2 };
            const newPos = { x: center.x - wx * scale, y: center.y - wy * scale };
            setStagePos(newPos);
          }}
        >
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {elements.map(el => {
              const worldMinX = Math.min(0, ...elements.map(e => e.x));
              const worldMinY = Math.min(0, ...elements.map(e => e.y));
              const worldMaxX = Math.max(size.width, ...elements.map(e => e.x + e.width));
              const worldMaxY = Math.max(size.height, ...elements.map(e => e.y + e.height));
              const worldW = Math.max(1, worldMaxX - worldMinX);
              const worldH = Math.max(1, worldMaxY - worldMinY);
              const mmW = 180, mmH = 120;
              const sx = mmW / worldW;
              const sy = mmH / worldH;
              const s = Math.min(sx, sy);
              const x = (el.x - worldMinX) * s;
              const y = (el.y - worldMinY) * s;
              const w = el.width * s;
              const h = el.height * s;
              return <div key={el.id} style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: '#abd5ff', opacity: 0.7, border: '1px solid #74a9f5' }} />;
            })}
            {/* viewport */}
            {(() => {
              const worldMinX = Math.min(0, ...elements.map(e => e.x));
              const worldMinY = Math.min(0, ...elements.map(e => e.y));
              const worldMaxX = Math.max(size.width, ...elements.map(e => e.x + e.width));
              const worldMaxY = Math.max(size.height, ...elements.map(e => e.y + e.height));
              const worldW = Math.max(1, worldMaxX - worldMinX);
              const worldH = Math.max(1, worldMaxY - worldMinY);
              const mmW = 180, mmH = 120;
              const sx = mmW / worldW;
              const sy = mmH / worldH;
              const s = Math.min(sx, sy);
              const viewX = (-stagePos.x) / scale;
              const viewY = (-stagePos.y) / scale;
              const x = (viewX - worldMinX) * s;
              const y = (viewY - worldMinY) * s;
              const w = size.width * s / scale;
              const h = size.height * s / scale;
              return <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, border: '1px solid #333', boxShadow: 'inset 0 0 0 9999px rgba(0,0,0,0.05)' }} />;
            })()}
          </div>
        </div>
        {(selectedId || selectedConnectionId) && (
          <div style={{ position: 'absolute', right: 8, top: 8, width: 280, background: '#fff', border: '1px solid #e9ecef', borderRadius: 6, padding: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
            {selectedId && (
              <div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Настройки стикера</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <label style={{ fontSize: 13, width: 110 }}>Цвет фона</label>
                  <input type="color" value={pendingFill ?? (elements.find(e => e.id === selectedId)?.fill || '#ffeb3b')} onChange={(ev) => setPendingFill(ev.target.value)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <label style={{ fontSize: 13, width: 110 }}>Цвет текста</label>
                  <input type="color" value={pendingTextColor ?? (elements.find(e => e.id === selectedId)?.text_color || '#333333')} onChange={(ev) => setPendingTextColor(ev.target.value)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <label style={{ fontSize: 13, width: 110 }}>Шрифт</label>
                  <select value={pendingFontFamily ?? (elements.find(e => e.id === selectedId)?.font_family || 'Arial')} onChange={(ev) => setPendingFontFamily(ev.target.value)} style={{ flex: 1 }}>
                    <option value="Arial">Arial</option>
                    <option value="Inter">Inter</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Courier New">Courier New</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <label style={{ fontSize: 13, width: 110 }}>Размер</label>
                  <input type="number" min={10} max={64} value={pendingFontSize ?? (elements.find(e => e.id === selectedId)?.font_size ?? 14)} onChange={(ev) => setPendingFontSize(parseInt(ev.target.value || '14', 10))} style={{ width: 80 }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button size="xs" variant="default" onClick={() => setPendingFill(null)}>Сброс</Button>
                  <Button size="xs" onClick={() => {
                    const el = elements.find(e => e.id === selectedId);
                    if (!el) return;
                    const newFill = pendingFill ?? el.fill ?? '#ffeb3b';
                    const newTextColor = pendingTextColor ?? el.text_color ?? '#333333';
                    const newFontFamily = pendingFontFamily ?? el.font_family ?? 'Arial';
                    const newFontSize = pendingFontSize ?? el.font_size ?? 14;
                    updateElement(el.id, { fill: newFill, text_color: newTextColor, font_family: newFontFamily, font_size: newFontSize }).then(() => {
                      setElements(prev => prev.map(it => it.id === el.id ? { ...it, fill: newFill, text_color: newTextColor, font_family: newFontFamily, font_size: newFontSize } : it));
                    }).catch(console.error);
                  }}>Сохранить</Button>
                </div>
              </div>
            )}
            {selectedConnectionId && (
              <div style={{ marginTop: selectedId ? 12 : 0 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Настройки стрелки</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Button size="xs" variant="default" onClick={() => {
                    const conn = connections.find(c => c.id === selectedConnectionId);
                    if (!conn || !boardId) return;
                    // reverse by recreate
                    deleteConnection(conn.id).catch(() => {});
                    createConnection(boardId, {
                      source_element_id: conn.target_element_id,
                      target_element_id: conn.source_element_id,
                      stroke: conn.stroke,
                      stroke_width: conn.stroke_width,
                      points: conn.points || null,
                    }).then((newConn) => {
                      setConnections(prev => prev
                        .filter(c => c.id !== conn.id)
                        .concat(newConn));
                      setSelectedConnectionId(newConn.id);
                    }).catch(console.error);
                  }}>Поменять направление</Button>
                  <Button size="xs" variant="default" onClick={() => {
                    const conn = connections.find(c => c.id === selectedConnectionId);
                    if (!conn) return;
                    const meta = safeParsePointsMeta(conn.points);
                    const nextMeta = { ...meta, dashed: !meta.dashed };
                    updateConnection(conn.id, { points: JSON.stringify(nextMeta) }).then((updated) => {
                      setConnections(prev => prev.map(c => c.id === conn.id ? { ...c, points: updated.points } : c));
                    }).catch(console.error);
                  }}>{getDashedFlag(connections.find(c => c.id === selectedConnectionId)) ? 'Сделать сплошной' : 'Сделать пунктирной'}</Button>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button size="xs" variant={getHeadsMeta(connections.find(c => c.id === selectedConnectionId)) === 'end' ? 'filled' : 'default'} onClick={() => {
                      const conn = connections.find(c => c.id === selectedConnectionId);
                      if (!conn) return;
                      const meta = safeParsePointsMeta(conn.points);
                      const nextMeta = { ...meta, heads: 'end' as const };
                      updateConnection(conn.id, { points: JSON.stringify(nextMeta) }).then((updated) => {
                        setConnections(prev => prev.map(c => c.id === conn.id ? { ...c, points: updated.points } : c));
                      }).catch(console.error);
                    }}>Одна</Button>
                    <Button size="xs" variant={getHeadsMeta(connections.find(c => c.id === selectedConnectionId)) === 'both' ? 'filled' : 'default'} onClick={() => {
                      const conn = connections.find(c => c.id === selectedConnectionId);
                      if (!conn) return;
                      const meta = safeParsePointsMeta(conn.points);
                      const nextMeta = { ...meta, heads: 'both' as const };
                      updateConnection(conn.id, { points: JSON.stringify(nextMeta) }).then((updated) => {
                        setConnections(prev => prev.map(c => c.id === conn.id ? { ...c, points: updated.points } : c));
                      }).catch(console.error);
                    }}>Две</Button>
                    <Button size="xs" variant={getHeadsMeta(connections.find(c => c.id === selectedConnectionId)) === 'none' ? 'filled' : 'default'} onClick={() => {
                      const conn = connections.find(c => c.id === selectedConnectionId);
                      if (!conn) return;
                      const meta = safeParsePointsMeta(conn.points);
                      const nextMeta = { ...meta, heads: 'none' as const };
                      updateConnection(conn.id, { points: JSON.stringify(nextMeta) }).then((updated) => {
                        setConnections(prev => prev.map(c => c.id === conn.id ? { ...c, points: updated.points } : c));
                      }).catch(console.error);
                    }}>Без</Button>
                  </div>
                  <Button size="xs" color="red" variant="filled" onClick={() => {
                    const conn = connections.find(c => c.id === selectedConnectionId);
                    if (!conn) return;
                    deleteConnection(conn.id).then(() => {
                      setConnections(prev => prev.filter(c => c.id !== conn.id));
                      setSelectedConnectionId(null);
                    }).catch(console.error);
                  }}>Удалить</Button>
                </div>
              </div>
            )}
          </div>
        )}
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

function nearestAnchorPoint(el: WhiteboardElement, targetAbsX: number, targetAbsY: number) {
  const pts = anchorPoints(el);
  let best = pts[0];
  let bestD = Number.POSITIVE_INFINITY;
  for (const p of pts) {
    const ax = el.x + p.x;
    const ay = el.y + p.y;
    const dx = ax - targetAbsX;
    const dy = ay - targetAbsY;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

function safeParsePointsMeta(points?: string | null): { dashed?: boolean; heads?: 'end' | 'both' | 'none' } {
  if (!points) return {} as any;
  try {
    const obj = JSON.parse(points);
    if (obj && typeof obj === 'object') {
      const o: any = obj;
      const heads = o.heads === 'both' || o.heads === 'none' ? o.heads : 'end';
      return { dashed: !!o.dashed, heads };
    }
  } catch {}
  return {} as any;
}

function getDashedFlag(conn?: WhiteboardConnection): boolean {
  if (!conn) return false;
  const meta = safeParsePointsMeta(conn.points);
  return !!meta.dashed;
}

function getHeadsMeta(conn?: WhiteboardConnection): 'end' | 'both' | 'none' {
  if (!conn) return 'end';
  const meta = safeParsePointsMeta(conn.points);
  return meta.heads ?? 'end';
}