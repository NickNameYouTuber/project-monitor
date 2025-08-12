import apiClient from './client';

export interface WhiteboardElement {
  id: string;
  board_id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  z_index: number;
  text?: string;
  fill?: string;
  text_color?: string;
  font_family?: string;
  font_size?: number;
}

export interface WhiteboardConnection {
  id: string;
  board_id: string;
  source_element_id: string;
  target_element_id: string;
  stroke?: string;
  stroke_width?: number;
  points?: string | null;
}

export interface WhiteboardResponse {
  id: string;
  project_id: string;
  elements: WhiteboardElement[];
  connections: WhiteboardConnection[];
}

export async function getOrCreateWhiteboard(projectId: string): Promise<WhiteboardResponse> {
  const { data } = await apiClient.get('/whiteboards', { params: { project_id: projectId } });
  return data;
}

export async function createElement(boardId: string, payload: Partial<WhiteboardElement>): Promise<WhiteboardElement> {
  const { data } = await apiClient.post(`/whiteboards/${boardId}/elements`, payload);
  return data;
}

export async function updateElement(elementId: string, payload: Partial<WhiteboardElement>): Promise<WhiteboardElement> {
  const { data } = await apiClient.patch(`/whiteboard-elements/${elementId}`, payload);
  return data;
}

export async function deleteElement(elementId: string): Promise<void> {
  await apiClient.delete(`/whiteboard-elements/${elementId}`);
}

export async function createConnection(boardId: string, payload: Partial<WhiteboardConnection>): Promise<WhiteboardConnection> {
  const { data } = await apiClient.post(`/whiteboards/${boardId}/connections`, payload);
  return data;
}

export async function updateConnection(connectionId: string, payload: Partial<WhiteboardConnection>): Promise<WhiteboardConnection> {
  const { data } = await apiClient.patch(`/whiteboard-connections/${connectionId}`, payload);
  return data;
}

export async function deleteConnection(connectionId: string): Promise<void> {
  await apiClient.delete(`/whiteboard-connections/${connectionId}`);
}


