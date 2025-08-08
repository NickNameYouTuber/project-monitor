import apiClient from './client';

export type WhiteboardElement = {
  id: string;
  whiteboard_id: string;
  type: 'sticky';
  text?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};

export type WhiteboardConnection = {
  id: string;
  whiteboard_id: string;
  from_element_id: string;
  to_element_id: string;
};

export type Whiteboard = {
  id: string;
  project_id: string;
  elements: WhiteboardElement[];
  connections: WhiteboardConnection[];
};

export async function getOrCreateWhiteboard(projectId: string): Promise<Whiteboard> {
  const { data } = await apiClient.get<Whiteboard>(`/projects/${projectId}/whiteboard`);
  return data;
}

export async function createElement(whiteboardId: string, payload: Omit<WhiteboardElement, 'id' | 'whiteboard_id'>): Promise<WhiteboardElement> {
  const { data } = await apiClient.post<WhiteboardElement>(`/whiteboards/${whiteboardId}/elements`, payload);
  return data;
}

export async function updateElement(whiteboardId: string, elementId: string, payload: Partial<Omit<WhiteboardElement, 'id' | 'whiteboard_id'>>): Promise<WhiteboardElement> {
  const { data } = await apiClient.put<WhiteboardElement>(`/whiteboards/${whiteboardId}/elements/${elementId}`, payload);
  return data;
}

export async function deleteElement(whiteboardId: string, elementId: string): Promise<void> {
  await apiClient.delete(`/whiteboards/${whiteboardId}/elements/${elementId}`);
}

export async function createConnection(whiteboardId: string, payload: { from_element_id: string; to_element_id: string; }): Promise<WhiteboardConnection> {
  const { data } = await apiClient.post<WhiteboardConnection>(`/whiteboards/${whiteboardId}/connections`, payload);
  return data;
}

export async function deleteConnection(whiteboardId: string, connectionId: string): Promise<void> {
  await apiClient.delete(`/whiteboards/${whiteboardId}/connections/${connectionId}`);
}


