import type {
  Shape,
  RectangleShape,
  CircleShape,
  StickyShape,
  TextShape,
  SectionShape,
  PathShape,
  ArrowShape,
  Comment,
  Point,
} from '../types';
import { ShapeType } from '../types';
import type { WhiteboardElementDto, WhiteboardConnectionDto } from '../../../api/whiteboards';

export function shapesToElements(shapes: Shape[]): Array<WhiteboardElementDto & { shapeId: string }> {
  return shapes
    .filter((shape) => shape.type !== ShapeType.ARROW)
    .map((shape, index) => {
      const base = {
        id: '',
        board_id: '',
        type: '',
        x: shape.x,
        y: shape.y,
        width: 0,
        height: 0,
        rotation: shape.rotation || 0,
        z_index: index,
        fill: shape.fill || null,
        text_color: shape.stroke || null,
        font_family: null,
        font_size: 14,
        task_id: shape.taskId || (shape.type === ShapeType.SECTION && (shape as SectionShape).taskIds?.length ? (shape as SectionShape).taskIds![0] : null),
        shapeId: shape.id,
      };

      switch (shape.type) {
        case ShapeType.RECTANGLE: {
          const s = shape as RectangleShape;
          return {
            ...base,
            type: 'rectangle',
            width: s.width,
            height: s.height,
          };
        }
        case ShapeType.CIRCLE: {
          const s = shape as CircleShape;
          return {
            ...base,
            type: 'circle',
            width: s.radius * 2,
            height: s.radius * 2,
          };
        }
        case ShapeType.STICKY: {
          const s = shape as StickyShape;
          return {
            ...base,
            type: 'sticky',
            width: s.width,
            height: s.height,
            text: s.text || null,
          };
        }
        case ShapeType.TEXT: {
          const s = shape as TextShape;
          return {
            ...base,
            type: 'text',
            width: 100,
            height: 30,
            text: s.text || null,
            font_size: s.fontSize || 14,
            font_family: null,
          };
        }
        case ShapeType.SECTION: {
          const s = shape as SectionShape;
          return {
            ...base,
            type: 'section',
            width: s.width,
            height: s.height,
            text: s.label || null,
            task_id: s.taskIds && s.taskIds.length > 0 ? s.taskIds[0] : null,
          };
        }
        case ShapeType.PATH: {
          const s = shape as PathShape;
          return {
            ...base,
            type: 'path',
            width: 100,
            height: 100,
            text: JSON.stringify(s.points || []),
          };
        }
        default:
          return base;
      }
    });
}

export function elementsToShapes(elements: WhiteboardElementDto[]): Shape[] {
  return elements.map((el) => {
    const base = {
      id: el.id,
      x: el.x,
      y: el.y,
      rotation: el.rotation || 0,
      fill: el.fill || '#ffffff',
      stroke: el.text_color || '#000000',
      taskId: el.task_id || undefined,
    };

    switch (el.type) {
      case 'rectangle':
        return {
          ...base,
          type: ShapeType.RECTANGLE,
          width: el.width,
          height: el.height,
        } as RectangleShape;

      case 'circle': {
        const radius = Math.min(el.width, el.height) / 2;
        return {
          ...base,
          type: ShapeType.CIRCLE,
          radius,
        } as CircleShape;
      }

      case 'sticky':
        return {
          ...base,
          type: ShapeType.STICKY,
          width: el.width,
          height: el.height,
          text: el.text || '',
        } as StickyShape;

      case 'text':
        return {
          ...base,
          type: ShapeType.TEXT,
          text: el.text || '',
          fontSize: el.font_size || 14,
        } as TextShape;

      case 'section': {
        const section: SectionShape = {
          ...base,
          type: ShapeType.SECTION,
          width: el.width,
          height: el.height,
          label: el.text || 'Section',
          taskIds: el.task_id ? [el.task_id] : [], // We load the primary one, others might be missing if backend is 1:1
        };
        return section;
      }

      case 'path': {
        let points: Point[] = [];
        let strokeWidth = 2;
        try {
          if (el.text) {
            const data = JSON.parse(el.text);
            if (Array.isArray(data)) {
              points = data;
              strokeWidth = 2;
            } else if (data && typeof data === 'object') {
              points = data.points || [];
              strokeWidth = data.strokeWidth || 2;
            }
          }
        } catch {
          points = [];
          strokeWidth = 2;
        }
        return {
          ...base,
          type: ShapeType.PATH,
          points,
          strokeWidth,
        } as PathShape;
      }

      default:
        return {
          ...base,
          type: ShapeType.RECTANGLE,
          width: el.width || 100,
          height: el.height || 100,
        } as RectangleShape;
    }
  });
}

export function arrowsToConnections(
  arrows: ArrowShape[],
  elementIdMap: Map<string, string>
): WhiteboardConnectionDto[] {
  return arrows.map((arrow) => {
    const fromElementId = arrow.startShapeId ? elementIdMap.get(arrow.startShapeId) : null;
    const toElementId = arrow.endShapeId ? elementIdMap.get(arrow.endShapeId) : null;

    return {
      id: arrow.id,
      board_id: '',
      from_element_id: fromElementId || null,
      to_element_id: toElementId || null,
      stroke: arrow.stroke || '#000000',
      stroke_width: 2,
      points: JSON.stringify({
        points: [arrow.start, arrow.end],
        startHead: arrow.startHead || 'arrow',
        endHead: arrow.endHead || 'arrow',
      }),
    };
  });
}

export function connectionsToArrows(
  connections: WhiteboardConnectionDto[],
  elementIdToShapeIdMap: Map<string, string>
): ArrowShape[] {
  return connections
    .map((conn) => {
      let start: Point = { x: 0, y: 0 };
      let end: Point = { x: 0, y: 0 };
      let startHead: 'none' | 'arrow' | 'circle' = 'arrow';
      let endHead: 'none' | 'arrow' | 'circle' = 'arrow';

      try {
        if (conn.points) {
          const pointsData = JSON.parse(conn.points);
          if (Array.isArray(pointsData) && pointsData.length >= 2) {
            start = pointsData[0];
            end = pointsData[1];
            startHead = 'arrow';
            endHead = 'arrow';
          } else if (pointsData && typeof pointsData === 'object' && Array.isArray(pointsData.points) && pointsData.points.length >= 2) {
            start = pointsData.points[0];
            end = pointsData.points[1];
            startHead = pointsData.startHead || 'arrow';
            endHead = pointsData.endHead || 'arrow';
          }
        }
      } catch {
        return null;
      }

      const startShapeId = conn.from_element_id ? elementIdToShapeIdMap.get(conn.from_element_id) : undefined;
      const endShapeId = conn.to_element_id ? elementIdToShapeIdMap.get(conn.to_element_id) : undefined;

      return {
        id: conn.id,
        type: ShapeType.ARROW,
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        rotation: 0,
        fill: 'transparent',
        stroke: conn.stroke || '#000000',
        start,
        end,
        startShapeId,
        endShapeId,
        startHead: startHead as 'none' | 'arrow' | 'circle',
        endHead: endHead as 'none' | 'arrow' | 'circle',
        strokeWidth: conn.stroke_width || 2,
      } as ArrowShape;
    })
    .filter((arrow): arrow is ArrowShape => arrow !== null);
}

export function commentsToElements(comments: Comment[]): Array<WhiteboardElementDto & { shapeId: string }> {
  return comments.map((comment) => ({
    id: '',
    board_id: '',
    type: 'comment',
    x: comment.x,
    y: comment.y,
    width: 200,
    height: 100,
    rotation: 0,
    z_index: 1000,
    text: JSON.stringify({
      messages: comment.messages,
      isOpen: comment.isOpen,
    }),
    fill: '#fff9b1',
    text_color: '#000000',
    font_family: null,
    font_size: 14,
    task_id: null,
    shapeId: comment.id,
  }));
}

export function elementsToComments(elements: WhiteboardElementDto[]): Comment[] {
  return elements
    .filter((el) => el.type === 'comment')
    .map((el) => {
      let messages: Comment['messages'] = [];
      let isOpen = false;

      try {
        if (el.text) {
          const data = JSON.parse(el.text);
          messages = data.messages || [];
          isOpen = data.isOpen || false;
        }
      } catch {
        messages = [];
        isOpen = false;
      }

      return {
        id: el.id,
        x: el.x,
        y: el.y,
        messages,
        isOpen,
      };
    });
}
