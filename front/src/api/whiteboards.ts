import { apiClient } from './client';

export type WhiteboardDto = {
  id: string;
  project_id: string;
  elements: WhiteboardElementDto[];
  connections: WhiteboardConnectionDto[];
};

export type WhiteboardElementDto = {
  id: string;
  board_id?: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  z_index?: number;
  text?: string;
  fill?: string;
  text_color?: string;
  font_family?: string;
  font_size?: number;
};

export type WhiteboardConnectionDto = {
  id: string;
  board_id?: string;
  from_element_id?: string;
  to_element_id?: string;
  stroke?: string;
  stroke_width?: number;
  points?: string;
};

export async function getOrCreateBoard(projectId: string): Promise<WhiteboardDto> {
  const { data } = await apiClient.get<WhiteboardDto>('/whiteboards', { params: { project_id: projectId } });
  return data;
}

export async function createElement(boardId: string, body: Partial<WhiteboardElementDto>): Promise<WhiteboardElementDto> {
  const { data } = await apiClient.post<WhiteboardElementDto>(`/whiteboards/${boardId}/elements`, body);
  return data;
}

export async function updateElement(elementId: string, body: Partial<WhiteboardElementDto>): Promise<WhiteboardElementDto> {
  const { data } = await apiClient.patch<WhiteboardElementDto>(`/whiteboard-elements/${elementId}`, body);
  return data;
}

export async function deleteElement(elementId: string): Promise<void> {
  await apiClient.delete(`/whiteboard-elements/${elementId}`);
}


