import { apiClient } from './client';
import type { Shape, SectionShape, Comment } from '../components/whiteboard/types';

export type WhiteboardElementDto = {
  id: string;
  board_id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  z_index: number;
  text?: string | null;
  fill?: string | null;
  text_color?: string | null;
  font_family?: string | null;
  font_size: number;
  task_id?: string | null;
};

export type WhiteboardConnectionDto = {
  id: string;
  board_id: string;
  from_element_id?: string | null;
  to_element_id?: string | null;
  stroke?: string | null;
  stroke_width?: number | null;
  points?: string | null;
};

export type WhiteboardDto = {
  id: string;
  project_id: string;
  elements: WhiteboardElementDto[];
  connections: WhiteboardConnectionDto[];
};

function normalizeElement(raw: any): WhiteboardElementDto {
  return {
    id: raw.id,
    board_id: raw.board_id ?? raw.boardId,
    type: raw.type,
    x: raw.x,
    y: raw.y,
    width: raw.width,
    height: raw.height,
    rotation: raw.rotation ?? 0,
    z_index: raw.z_index ?? raw.zIndex ?? 0,
    text: raw.text ?? null,
    fill: raw.fill ?? null,
    text_color: raw.text_color ?? raw.textColor ?? null,
    font_family: raw.font_family ?? raw.fontFamily ?? null,
    font_size: raw.font_size ?? raw.fontSize ?? 14,
    task_id: raw.task_id ?? raw.taskId ?? null,
  };
}

function normalizeConnection(raw: any): WhiteboardConnectionDto {
  return {
    id: raw.id,
    board_id: raw.board_id ?? raw.boardId,
    from_element_id: raw.from_element_id ?? raw.fromElementId ?? null,
    to_element_id: raw.to_element_id ?? raw.toElementId ?? null,
    stroke: raw.stroke ?? null,
    stroke_width: raw.stroke_width ?? raw.strokeWidth ?? null,
    points: raw.points ?? null,
  };
}

export async function getOrCreateWhiteboard(projectId: string): Promise<WhiteboardDto> {
  const { data } = await apiClient.get('/whiteboards', {
    params: { project_id: projectId },
  });
  return {
    id: data.id,
    project_id: data.project_id ?? data.projectId,
    elements: Array.isArray(data.elements) ? data.elements.map(normalizeElement) : [],
    connections: Array.isArray(data.connections) ? data.connections.map(normalizeConnection) : [],
  };
}

export async function createElement(
  boardId: string,
  element: {
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    z_index?: number;
    text?: string;
    fill?: string;
    text_color?: string;
    font_family?: string;
    font_size?: number;
    task_id?: string;
  }
): Promise<WhiteboardElementDto> {
  const { data } = await apiClient.post(`/whiteboards/${boardId}/elements`, element);
  return normalizeElement(data);
}

export async function updateElement(
  elementId: string,
  updates: {
    type?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    z_index?: number;
    text?: string;
    fill?: string;
    text_color?: string;
    font_family?: string;
    font_size?: number;
    task_id?: string;
  }
): Promise<WhiteboardElementDto> {
  const { data } = await apiClient.patch(`/whiteboard-elements/${elementId}`, updates);
  return normalizeElement(data);
}

export async function deleteElement(elementId: string): Promise<void> {
  await apiClient.delete(`/whiteboard-elements/${elementId}`);
}

export async function createConnection(
  boardId: string,
  connection: {
    from_element_id?: string;
    to_element_id?: string;
    stroke?: string;
    stroke_width?: number;
    points?: string;
  }
): Promise<WhiteboardConnectionDto> {
  const { data } = await apiClient.post(`/whiteboards/${boardId}/connections`, connection);
  return normalizeConnection(data);
}

export async function updateConnection(
  connectionId: string,
  updates: {
    from_element_id?: string;
    to_element_id?: string;
    stroke?: string;
    stroke_width?: number;
    points?: string;
  }
): Promise<WhiteboardConnectionDto> {
  const { data } = await apiClient.patch(`/whiteboard-connections/${connectionId}`, updates);
  return normalizeConnection(data);
}

export async function deleteConnection(connectionId: string): Promise<void> {
  await apiClient.delete(`/whiteboard-connections/${connectionId}`);
}

export async function getProjectSections(projectId: string): Promise<SectionShape[]> {
  const { data } = await apiClient.get('/whiteboards/sections', {
    params: { project_id: projectId },
  });
  return Array.isArray(data) ? data : [];
}

export async function linkElementToTask(elementId: string, taskId: string): Promise<WhiteboardElementDto> {
  const { data } = await apiClient.patch(`/whiteboard-elements/${elementId}/link-task`, { task_id: taskId });
  return normalizeElement(data);
}

export async function unlinkElementFromTask(elementId: string): Promise<WhiteboardElementDto> {
  const { data } = await apiClient.patch(`/whiteboard-elements/${elementId}/unlink-task`, {});
  return normalizeElement(data);
}

export async function getProjectTasks(projectId: string) {
  const { data } = await apiClient.get(`/projects/${projectId}/tasks`);
  return Array.isArray(data) ? data : [];
}
