import React, {
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
    forwardRef,
  } from 'react';
  import {
    ActionIcon,
    ColorInput,
    Group,
    NumberInput,
    Paper,
    SegmentedControl,
    Slider,
    Stack,
    Text,
    Tooltip,
    Button,
  } from '@mantine/core';
  
  // ---- Типы фигур ----
  type Id = string;
  
  type RectShape = {
    id: Id;
    type: 'rect';
    x: number;
    y: number;
    w: number;
    h: number;
    rotation?: number;
    fill: string;
    stroke: string;
    strokeWidth: number;
  };
  
  type EllipseShape = {
    id: Id;
    type: 'ellipse';
    x: number;
    y: number;
    w: number;
    h: number;
    rotation?: number;
    fill: string;
    stroke: string;
    strokeWidth: number;
  };
  
  type ArrowShape = {
    id: Id;
    type: 'arrow';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    stroke: string;
    strokeWidth: number;
  };
  
  type TextShape = {
    id: Id;
    type: 'text';
    x: number;
    y: number;
    text: string;
    fontSize: number;
    color: string;
  };
  
  type Shape = RectShape | EllipseShape | ArrowShape | TextShape;
  
  type Mode = 'select' | 'hand' | 'rect' | 'ellipse' | 'arrow' | 'text';
  
  export interface MiroLikeBoardProps {
    width?: number | string;
    height?: number | string;
    initialShapes?: Shape[];
    backgroundColor?: string;
    onChange?: (shapes: Shape[]) => void;
  }
  
  export interface MiroLikeBoardRef {
    getJSON(): string;
    loadJSON(json: string): void;
    getSVG(): string;
    setZoom(zoom: number): void;
    resetView(): void;
  }
  
  // ---- Утилиты ----
  const uid = () => Math.random().toString(36).slice(2, 10);
  
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  
  function isPointInsideRect(px: number, py: number, x: number, y: number, w: number, h: number) {
    return px >= x && px <= x + w && py >= y && py <= y + h;
  }
  
  function getShapeBBox(s: Shape) {
    switch (s.type) {
      case 'rect':
      case 'ellipse':
        return { x: s.x, y: s.y, w: s.w, h: s.h };
      case 'arrow':
        return {
          x: Math.min(s.x1, s.x2),
          y: Math.min(s.y1, s.y2),
          w: Math.abs(s.x2 - s.x1),
          h: Math.abs(s.y2 - s.y1),
        };
      case 'text':
        // Грубая оценка ширины текста (можно улучшить)
        return { x: s.x, y: s.y - s.fontSize, w: s.text.length * (s.fontSize * 0.6), h: s.fontSize * 1.2 };
    }
  }
  
  function hitTestShape(s: Shape, x: number, y: number) {
    switch (s.type) {
      case 'rect':
      case 'ellipse': {
        return isPointInsideRect(x, y, s.x, s.y, s.w, s.h);
      }
      case 'arrow': {
        // Точка близко к отрезку
        const { x1, y1, x2, y2 } = s;
        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        const dot = A * C + B * D;
        const lenSq = C * C + D * D || 1;
        let t = dot / lenSq;
        t = clamp(t, 0, 1);
        const projX = x1 + t * C;
        const projY = y1 + t * D;
        const dist = Math.hypot(x - projX, y - projY);
        return dist <= (s.strokeWidth + 6); // «толще» для удобства
      }
      case 'text': {
        const b = getShapeBBox(s);
        return isPointInsideRect(x, y, b.x, b.y, b.w, b.h);
      }
    }
  }
  
  // ---- Компонент ----
  export const MiroLikeBoard = forwardRef<MiroLikeBoardRef, MiroLikeBoardProps>(
    ({ width = '100%', height = 600, initialShapes = [], backgroundColor = '#fff', onChange }, ref) => {
      const containerRef = useRef<HTMLDivElement>(null);
      const svgRef = useRef<SVGSVGElement>(null);
  
      const [shapes, setShapes] = useState<Shape[]>(() => initialShapes);
      const [mode, setMode] = useState<Mode>('select');
      const [selectedId, setSelectedId] = useState<Id | null>(null);
  
      const [fill, setFill] = useState<string>('#E9ECEF');
      const [stroke, setStroke] = useState<string>('#2B2D31');
      const [strokeWidth, setStrokeWidth] = useState<number>(2);
      const [textColor, setTextColor] = useState<string>('#111');
      const [fontSize, setFontSize] = useState<number>(18);
  
      const [zoom, setZoom] = useState<number>(1);
      const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
      const [isPanning, setIsPanning] = useState<boolean>(false);
      const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
      const [spaceDown, setSpaceDown] = useState(false);
  
      // Для drag фигур
      const dragRef = useRef<{ id: Id; dx: number; dy: number } | null>(null);
  
      // Для рисования стрелки в один проход
      const drawingArrowId = useRef<Id | null>(null);
  
      // Обратные вызовы наружу
      useEffect(() => {
        onChange?.(shapes);
      }, [shapes, onChange]);
  
      useImperativeHandle(
        ref,
        (): MiroLikeBoardRef => ({
          getJSON: () => JSON.stringify(shapes),
          loadJSON: (json: string) => {
            try {
              const arr = JSON.parse(json) as Shape[];
              setShapes(Array.isArray(arr) ? arr : []);
              setSelectedId(null);
            } catch {
              // игнор
            }
          },
          getSVG: () => {
            const el = svgRef.current;
            if (!el) return '';
            const clone = el.cloneNode(true) as SVGSVGElement;
            // Уберём UI-оверлеи (если бы они были), здесь просто outerHTML
            return clone.outerHTML;
          },
          setZoom: (z: number) => setZoom(clamp(z, 0.2, 4)),
          resetView: () => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          },
        }),
        [shapes]
      );
  
      // Координаты курсора -> координаты доски
      const clientToBoard = useCallback(
        (clientX: number, clientY: number) => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return { x: 0, y: 0 };
          const sx = clientX - rect.left;
          const sy = clientY - rect.top;
          const x = (sx - pan.x) / zoom;
          const y = (sy - pan.y) / zoom;
          return { x, y };
        },
        [pan.x, pan.y, zoom]
      );
  
      // Слушаем пробел для пэна
      useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
          if (e.code === 'Space') {
            e.preventDefault();
            setSpaceDown(true);
          }
          if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
            setShapes(prev => prev.filter(s => s.id !== selectedId));
            setSelectedId(null);
          }
          if (e.key === 'Escape') {
            setSelectedId(null);
            drawingArrowId.current = null;
          }
        };
        const onKeyUp = (e: KeyboardEvent) => {
          if (e.code === 'Space') {
            setSpaceDown(false);
          }
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
          window.removeEventListener('keydown', onKeyDown);
          window.removeEventListener('keyup', onKeyUp);
        };
      }, [selectedId]);
  
      // Колесо: пан или зум
      const onWheel = useCallback(
        (e: React.WheelEvent) => {
          if (!containerRef.current) return;
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const scaleBy = 1.1;
            const direction = e.deltaY > 0 ? 1 : -1;
            const newZoom = clamp(zoom * (direction > 0 ? 1 / scaleBy : scaleBy), 0.2, 4);
  
            // Зум к курсору
            const rect = containerRef.current.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const wx = (sx - pan.x) / zoom;
            const wy = (sy - pan.y) / zoom;
  
            const nx = wx * newZoom + pan.x;
            const ny = wy * newZoom + pan.y;
            const newPan = { x: sx - nx, y: sy - ny };
  
            setZoom(newZoom);
            setPan(newPan);
          } else {
            // Пан колёсиком
            setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
          }
        },
        [zoom, pan.x, pan.y]
      );
  
      // Мышь: фон (SVG) — mousedown
      const onSvgMouseDown = useCallback(
        (e: React.MouseEvent) => {
          if (mode === 'hand' || spaceDown) {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            setIsPanning(true);
            panStart.current = {
              x: e.clientX,
              y: e.clientY,
              panX: pan.x,
              panY: pan.y,
            };
            return;
          }
  
          const { x, y } = clientToBoard(e.clientX, e.clientY);
  
          if (mode === 'select') {
            // Клик по фону — снять выделение
            setSelectedId(null);
            return;
          }
  
          if (mode === 'rect') {
            const id = uid();
            const newShape: RectShape = {
              id,
              type: 'rect',
              x: Math.round(x - 60),
              y: Math.round(y - 40),
              w: 120,
              h: 80,
              fill,
              stroke,
              strokeWidth,
            };
            setShapes(prev => [...prev, newShape]);
            setSelectedId(id);
            return;
          }
  
          if (mode === 'ellipse') {
            const id = uid();
            const newShape: EllipseShape = {
              id,
              type: 'ellipse',
              x: Math.round(x - 60),
              y: Math.round(y - 40),
              w: 120,
              h: 80,
              fill,
              stroke,
              strokeWidth,
            };
            setShapes(prev => [...prev, newShape]);
            setSelectedId(id);
            return;
          }
  
          if (mode === 'text') {
            const id = uid();
            const newShape: TextShape = {
              id,
              type: 'text',
              x: Math.round(x),
              y: Math.round(y),
              text: 'Новый текст',
              fontSize,
              color: textColor,
            };
            setShapes(prev => [...prev, newShape]);
            setSelectedId(id);
            return;
          }
  
          if (mode === 'arrow') {
            const id = uid();
            const newShape: ArrowShape = {
              id,
              type: 'arrow',
              x1: x,
              y1: y,
              x2: x,
              y2: y,
              stroke,
              strokeWidth,
            };
            drawingArrowId.current = id;
            setShapes(prev => [...prev, newShape]);
            setSelectedId(id);
            return;
          }
        },
        [mode, spaceDown, clientToBoard, pan.x, pan.y, fill, stroke, strokeWidth, textColor, fontSize]
      );
  
      const onSvgMouseMove = useCallback(
        (e: React.MouseEvent) => {
          // Панорама
          if (isPanning && panStart.current) {
            const dx = e.clientX - panStart.current.x;
            const dy = e.clientY - panStart.current.y;
            setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
            return;
          }
          // Рисуем стрелку
          if (drawingArrowId.current) {
            const { x, y } = clientToBoard(e.clientX, e.clientY);
            setShapes(prev =>
              prev.map(s => (s.id === drawingArrowId.current && s.type === 'arrow' ? { ...s, x2: x, y2: y } : s))
            );
          }
        },
        [isPanning, clientToBoard]
      );
  
      const onSvgMouseUp = useCallback(() => {
        setIsPanning(false);
        panStart.current = null;
        drawingArrowId.current = null;
      }, []);
  
      // Перетаскивание фигур
      const onShapeMouseDown = useCallback(
        (e: React.MouseEvent, id: Id) => {
          e.stopPropagation();
          setSelectedId(id);
          const { x, y } = clientToBoard(e.clientX, e.clientY);
          const s = shapes.find(s => s.id === id);
          if (!s) return;
          if (s.type === 'rect' || s.type === 'ellipse') {
            dragRef.current = { id, dx: x - s.x, dy: y - s.y };
          } else if (s.type === 'text') {
            const b = getShapeBBox(s);
            dragRef.current = { id, dx: x - b.x, dy: y - b.y };
          } else if (s.type === 'arrow') {
            // Перетаскиваем всю стрелку целиком
            dragRef.current = { id, dx: x - s.x1, dy: y - s.y1 };
          }
        },
        [clientToBoard, shapes]
      );
  
      const onSvgMouseMoveDrag = useCallback(
        (e: React.MouseEvent) => {
          if (!dragRef.current) return;
          const { x, y } = clientToBoard(e.clientX, e.clientY);
          const { id, dx, dy } = dragRef.current;
          setShapes(prev =>
            prev.map(s => {
              if (s.id !== id) return s;
              if (s.type === 'rect' || s.type === 'ellipse') {
                return { ...s, x: x - dx, y: y - dy };
              }
              if (s.type === 'text') {
                const b = getShapeBBox(s);
                const w = b.w; // сохраняем ширину оценки, смещение по верхнему левому
                const h = b.h;
                return { ...s, x: x - dx, y: y - dy + h };
              }
              if (s.type === 'arrow') {
                const lenX = s.x2 - s.x1;
                const lenY = s.y2 - s.y1;
                const nx1 = x - dx;
                const ny1 = y - dy;
                return { ...s, x1: nx1, y1: ny1, x2: nx1 + lenX, y2: ny1 + lenY };
              }
              return s;
            })
          );
        },
        [clientToBoard]
      );
  
      const onSvgMouseUpDrag = useCallback(() => {
        dragRef.current = null;
      }, []);
  
      // Свойства выбранной фигуры для панели
      const selectedShape = useMemo(() => shapes.find(s => s.id === selectedId) || null, [shapes, selectedId]);
  
      // Обновление свойств для выбранной фигуры
      const updateSelected = useCallback(
        (patch: Partial<RectShape & EllipseShape & ArrowShape & TextShape>) => {
          if (!selectedId) return;
          setShapes(prev => prev.map(s => (s.id === selectedId ? { ...s, ...patch } as Shape : s)));
        },
        [selectedId]
      );
  
      // Сетка
      const patternSize = 24;
  
      return (
        <Paper withBorder radius="md" style={{ width, height, overflow: 'hidden', position: 'relative' }}>
          {/* Панель инструментов */}
          <Group justify="space-between" p="sm" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
            <Group gap="xs">
              <SegmentedControl
                value={mode}
                onChange={v => setMode(v as Mode)}
                data={[
                  { label: 'Выдел.', value: 'select' },
                  { label: 'Рука', value: 'hand' },
                  { label: '▭', value: 'rect' },
                  { label: '◯', value: 'ellipse' },
                  { label: '→', value: 'arrow' },
                  { label: 'A', value: 'text' },
                ]}
                size="xs"
              />
              <ColorInput value={fill} onChange={setFill} format="hex" size="xs" label="Заливка" withPicker={true} />
              <ColorInput value={stroke} onChange={setStroke} format="hex" size="xs" label="Обводка" withPicker={true} />
              <NumberInput
                value={strokeWidth}
                onChange={v => setStrokeWidth(Number(v) || 1)}
                min={1}
                max={16}
                size="xs"
                label="Толщина"
              />
              <ColorInput value={textColor} onChange={setTextColor} format="hex" size="xs" label="Цвет текста" />
              <NumberInput
                value={fontSize}
                onChange={v => setFontSize(Number(v) || 12)}
                min={10}
                max={96}
                size="xs"
                label="Размер шрифта"
              />
            </Group>
            <Group gap="xs">
              <Stack gap={2} align="stretch" style={{ width: 160 }}>
                <Text size="xs" c="dimmed">
                  Масштаб {Math.round(zoom * 100)}%
                </Text>
                <Slider
                  min={20}
                  max={400}
                  step={5}
                  value={zoom * 100}
                  onChange={(v: number) => setZoom(clamp(v / 100, 0.2, 4))}
                />
              </Stack>
              <Tooltip label="Сброс вида">
                <ActionIcon variant="light" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
                  ⤾
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Очистить">
                <ActionIcon variant="light" color="red" onClick={() => { setShapes([]); setSelectedId(null); }}>
                  🗑️
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
  
          {/* Рабочая область */}
          <div
            ref={containerRef}
            onWheel={onWheel}
            onMouseDown={onSvgMouseDown}
            onMouseMove={(e) => {
              onSvgMouseMove(e);
              onSvgMouseMoveDrag(e);
            }}
            onMouseUp={(e) => {
              onSvgMouseUp(e);
              onSvgMouseUpDrag();
            }}
            onMouseLeave={() => {
              setIsPanning(false);
              panStart.current = null;
              drawingArrowId.current = null;
              dragRef.current = null;
            }}
            style={{ width: '100%', height: `calc(${typeof height === 'number' ? `${height}px` : height} - 64px)`, background: backgroundColor, position: 'relative', cursor: (mode === 'hand' || spaceDown) ? 'grab' : 'default' }}
          >
            <svg ref={svgRef} width="100%" height="100%">
              <defs>
                {/* Сетка */}
                <pattern id="grid" width={patternSize} height={patternSize} patternUnits="userSpaceOnUse">
                  <path d={`M ${patternSize} 0 L 0 0 0 ${patternSize}`} fill="none" stroke="#e9ecef" strokeWidth="1" />
                </pattern>
                {/* Маркер стрелки */}
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill={stroke} />
                </marker>
                <marker id="arrowhead-selected" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                </marker>
              </defs>
  
              {/* Фон + сетка с учетом пан/зум */}
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                <rect x={-5000} y={-5000} width={10000} height={10000} fill="url(#grid)" />
  
                {/* Фигуры */}
                {shapes.map((s) => {
                  const isSelected = s.id === selectedId;
  
                  if (s.type === 'rect') {
                    return (
                      <g key={s.id} onMouseDown={(e) => onShapeMouseDown(e, s.id)} style={{ cursor: mode === 'select' ? 'move' : 'default' }}>
                        <rect
                          x={s.x}
                          y={s.y}
                          width={s.w}
                          height={s.h}
                          rx={8}
                          fill={s.fill}
                          stroke={s.stroke}
                          strokeWidth={s.strokeWidth}
                        />
                        {isSelected && (
                          <rect
                            x={s.x - 6}
                            y={s.y - 6}
                            width={s.w + 12}
                            height={s.h + 12}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth={1}
                            strokeDasharray="4 3"
                            pointerEvents="none"
                          />
                        )}
                      </g>
                    );
                  }
  
                  if (s.type === 'ellipse') {
                    const cx = s.x + s.w / 2;
                    const cy = s.y + s.h / 2;
                    return (
                      <g key={s.id} onMouseDown={(e) => onShapeMouseDown(e, s.id)} style={{ cursor: mode === 'select' ? 'move' : 'default' }}>
                        <ellipse
                          cx={cx}
                          cy={cy}
                          rx={s.w / 2}
                          ry={s.h / 2}
                          fill={s.fill}
                          stroke={s.stroke}
                          strokeWidth={s.strokeWidth}
                        />
                        {isSelected && (
                          <rect
                            x={s.x - 6}
                            y={s.y - 6}
                            width={s.w + 12}
                            height={s.h + 12}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth={1}
                            strokeDasharray="4 3"
                            pointerEvents="none"
                          />
                        )}
                      </g>
                    );
                  }
  
                  if (s.type === 'arrow') {
                    return (
                      <g key={s.id} onMouseDown={(e) => onShapeMouseDown(e, s.id)} style={{ cursor: mode === 'select' ? 'move' : 'default' }}>
                        <line
                          x1={s.x1}
                          y1={s.y1}
                          x2={s.x2}
                          y2={s.y2}
                          stroke={isSelected ? '#3b82f6' : s.stroke}
                          strokeWidth={isSelected ? s.strokeWidth + 1 : s.strokeWidth}
                          markerEnd={`url(#${isSelected ? 'arrowhead-selected' : 'arrowhead'})`}
                        />
                      </g>
                    );
                  }
  
                  if (s.type === 'text') {
                    return (
                      <g key={s.id} onMouseDown={(e) => onShapeMouseDown(e, s.id)} style={{ cursor: mode === 'select' ? 'move' : 'text' }}>
                        <text x={s.x} y={s.y} fontSize={s.fontSize} fill={s.color} dominantBaseline="hanging">
                          {s.text}
                        </text>
                        {isSelected && (
                          <rect
                            x={s.x - 6}
                            y={s.y - s.fontSize * 0.2 - 6}
                            width={Math.max(40, s.text.length * (s.fontSize * 0.6)) + 12}
                            height={s.fontSize * 1.4 + 12}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth={1}
                            strokeDasharray="4 3"
                            pointerEvents="none"
                          />
                        )}
                      </g>
                    );
                  }
  
                  return null;
                })}
              </g>
            </svg>
  
            {/* Редактор текста поверх (по двойному клику) */}
            {selectedShape?.type === 'text' && (
              <TextEditorOverlay
                containerRef={containerRef}
                pan={pan}
                zoom={zoom}
                shape={selectedShape}
                onChange={(text) => updateSelected({ text })}
              />
            )}
          </div>
  
          {/* Панель свойств для выделенной фигуры */}
          <Paper withBorder p="sm" radius="md" style={{ position: 'absolute', right: 12, top: 60, minWidth: 220, pointerEvents: 'auto' }}>
            <Stack gap="xs">
              <Text size="sm" fw={600}>
                Свойства
              </Text>
              {!selectedShape && <Text size="xs" c="dimmed">Ничего не выбрано</Text>}
              {selectedShape?.type === 'rect' && (
                <>
                  <NumberInput label="Ширина" value={selectedShape.w} onChange={(v) => updateSelected({ w: Number(v) || 10 })} min={10} />
                  <NumberInput label="Высота" value={selectedShape.h} onChange={(v) => updateSelected({ h: Number(v) || 10 })} min={10} />
                  <ColorInput label="Заливка" value={selectedShape.fill} onChange={(v) => updateSelected({ fill: v })} />
                  <ColorInput label="Обводка" value={selectedShape.stroke} onChange={(v) => updateSelected({ stroke: v })} />
                  <NumberInput label="Толщина" value={selectedShape.strokeWidth} min={1} max={16} onChange={(v) => updateSelected({ strokeWidth: Number(v) || 1 })} />
                  <Group justify="apart" mt="xs">
                    <Button variant="light" color="red" onClick={() => { setShapes(prev => prev.filter(s => s.id !== selectedShape.id)); setSelectedId(null); }}>
                      Удалить
                    </Button>
                  </Group>
                </>
              )}
              {selectedShape?.type === 'ellipse' && (
                <>
                  <NumberInput label="Ширина" value={selectedShape.w} onChange={(v) => updateSelected({ w: Number(v) || 10 })} min={10} />
                  <NumberInput label="Высота" value={selectedShape.h} onChange={(v) => updateSelected({ h: Number(v) || 10 })} min={10} />
                  <ColorInput label="Заливка" value={selectedShape.fill} onChange={(v) => updateSelected({ fill: v })} />
                  <ColorInput label="Обводка" value={selectedShape.stroke} onChange={(v) => updateSelected({ stroke: v })} />
                  <NumberInput label="Толщина" value={selectedShape.strokeWidth} min={1} max={16} onChange={(v) => updateSelected({ strokeWidth: Number(v) || 1 })} />
                  <Group justify="apart" mt="xs">
                    <Button variant="light" color="red" onClick={() => { setShapes(prev => prev.filter(s => s.id !== selectedShape.id)); setSelectedId(null); }}>
                      Удалить
                    </Button>
                  </Group>
                </>
              )}
              {selectedShape?.type === 'arrow' && (
                <>
                  <ColorInput label="Обводка" value={selectedShape.stroke} onChange={(v) => updateSelected({ stroke: v })} />
                  <NumberInput label="Толщина" value={selectedShape.strokeWidth} min={1} max={16} onChange={(v) => updateSelected({ strokeWidth: Number(v) || 1 })} />
                  <Group justify="apart" mt="xs">
                    <Button variant="light" color="red" onClick={() => { setShapes(prev => prev.filter(s => s.id !== selectedShape.id)); setSelectedId(null); }}>
                      Удалить
                    </Button>
                  </Group>
                </>
              )}
              {selectedShape?.type === 'text' && (
                <>
                  <NumberInput label="Размер шрифта" value={selectedShape.fontSize} min={10} max={96} onChange={(v) => updateSelected({ fontSize: Number(v) || 12 })} />
                  <ColorInput label="Цвет" value={selectedShape.color} onChange={(v) => updateSelected({ color: v })} />
                  <Group justify="apart" mt="xs">
                    <Button variant="light" color="red" onClick={() => { setShapes(prev => prev.filter(s => s.id !== selectedShape.id)); setSelectedId(null); }}>
                      Удалить
                    </Button>
                  </Group>
                </>
              )}
            </Stack>
          </Paper>
        </Paper>
      );
    }
  );
  
  MiroLikeBoard.displayName = 'MiroLikeBoard';
  
  // ---- Оверлей для редактирования текста по месту ----
  function TextEditorOverlay({
    containerRef,
    pan,
    zoom,
    shape,
    onChange,
  }: {
    containerRef: React.RefObject<HTMLDivElement>;
    pan: { x: number; y: number };
    zoom: number;
    shape: TextShape;
    onChange: (val: string) => void;
  }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(shape.text);
  
    useEffect(() => setValue(shape.text), [shape.text]);
  
    // Позиция в экранных координатах
    const screenX = shape.x * zoom + pan.x;
    const screenY = shape.y * zoom + pan.y;
  
    return (
      <>
        <div
          onDoubleClick={() => setEditing(true)}
          style={{
            position: 'absolute',
            left: screenX,
            top: screenY,
            transform: 'translateY(-2px)',
            fontSize: shape.fontSize * zoom,
            color: shape.color,
            pointerEvents: 'none',
            opacity: 0, // невидимый слой для захвата dblclick на месте текста
          }}
        >
          {shape.text}
        </div>
        {editing && (
          <textarea
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
              setEditing(false);
              onChange(value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.currentTarget.blur();
              }
            }}
            style={{
              position: 'absolute',
              left: screenX,
              top: screenY,
              transformOrigin: 'top left',
              transform: `scale(${zoom})`,
              fontSize: shape.fontSize,
              color: shape.color,
              fontFamily: 'inherit',
              lineHeight: 1.2,
              background: 'rgba(255,255,255,0.9)',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              padding: '6px 8px',
              outline: 'none',
              resize: 'both',
              minWidth: 80,
              minHeight: shape.fontSize * 1.6,
              zIndex: 5,
            }}
          />
        )}
      </>
    );
  }
  