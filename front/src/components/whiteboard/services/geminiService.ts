import { apiClient } from '../../../api/client';

export interface AIBrainstormResult {
  title: string;
  ideas: string[];
}

export const generateBrainstormIdeas = async (topic: string): Promise<AIBrainstormResult> => {
  try {
    const { data } = await apiClient.post<AIBrainstormResult>('/whiteboards/ai/brainstorm', { topic });
    return data;
  } catch (error) {
    console.error("AI API Error:", error);
    throw error;
  }
};

export interface AIGeneratedShape {
  type: 'STICKY' | 'ARROW';
  id: string;
  text?: string;
  x: number;
  y: number;
  connectFrom?: string; // ID of shape to connect from
  connectTo?: string; // ID of shape to connect to
}

export interface AIDiagramResult {
  title: string;
  elements: AIGeneratedShape[];
}

export const generateDiagram = async (topic: string): Promise<AIDiagramResult> => {
  try {
    const { data } = await apiClient.post<AIDiagramResult>('/whiteboards/ai/diagram', { topic });
    return data;
  } catch (error) {
    console.error("AI Diagram Error:", error);
    throw error;
  }
};