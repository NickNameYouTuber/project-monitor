import { GoogleGenAI, Type, Schema } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface AIBrainstormResult {
  title: string;
  ideas: string[];
}

export const generateBrainstormIdeas = async (topic: string): Promise<AIBrainstormResult> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Brainstorm 5 to 8 short, creative, and distinct ideas or concepts related to: "${topic}". 
      Also provide a short, logical title for this group of ideas (e.g., "Marketing Ideas", "Project Risks").
      Keep ideas concise (under 10 words each).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            ideas: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["title", "ideas"]
        },
      },
    });

    const jsonStr = response.text;
    if (!jsonStr) return { title: "Brainstorm", ideas: [] };
    
    return JSON.parse(jsonStr) as AIBrainstormResult;
  } catch (error) {
    console.error("Gemini API Error:", error);
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
    const prompt = `Create a detailed flowchart diagram about "${topic}". 
    
    RULES:
    1. Provide a "title" for this diagram section (e.g., "Login Process Flow").
    2. USE ONLY TWO SHAPE TYPES: "STICKY" and "ARROW".
    3. NODES (STICKY):
       - Must have a unique "id" (e.g., "n1", "n2").
       - MUST have a "text" field with descriptive content.
       - Provide "x" and "y" coordinates.
       - Layout: Top-to-Bottom or Left-to-Right flow.
       - Spacing: Keep items at least 250 units apart.
    4. EDGES (ARROW):
       - Must have "type": "ARROW".
       - Must have "connectFrom" (id of start node) and "connectTo" (id of end node).
       - Do NOT provide x/y for arrows.

    Return a valid JSON Object with "title" and "elements".`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            elements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING, enum: ["STICKY", "ARROW"] },
                    id: { type: Type.STRING },
                    text: { type: Type.STRING },
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER },
                    connectFrom: { type: Type.STRING },
                    connectTo: { type: Type.STRING }
                },
                required: ["type", "id"]
              }
            }
          },
          required: ["title", "elements"]
        },
      },
    });

    const jsonStr = response.text;
    if (!jsonStr) return { title: "Diagram", elements: [] };
    
    const data = JSON.parse(jsonStr) as AIDiagramResult;
    return data;
  } catch (error) {
    console.error("Gemini Diagram Error:", error);
    throw error;
  }
};