import { GoogleGenAI, Type } from "@google/genai";
import { Roadmap, RoadmapStep } from "../types";

const apiKey = process.env.GEMINI_API_KEY!;
const ai = new GoogleGenAI({ apiKey });

export async function generateRoadmap(topic: string): Promise<Roadmap> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a friendly Nigerian secondary school teacher. 
    Create a learning roadmap for the topic: "${topic}".
    The roadmap should be tailored for Nigerian JSS1-SS3 students.
    Break it down into 5-7 logical steps.
    For each step, provide:
    1. A clear, simple title.
    2. A bite-sized explanation in plain English (avoid jargon, use Nigerian examples if possible).
    3. 2-3 curated free resources (YouTube links, Khan Academy, BBC Bitesize, etc.).
    
    Output the result in JSON format.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                explanation: { type: Type.STRING },
                resources: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      url: { type: Type.STRING }
                    },
                    required: ["title", "url"]
                  }
                }
              },
              required: ["title", "explanation", "resources"]
            }
          }
        },
        required: ["topic", "steps"]
      }
    }
  });

  const data = JSON.parse(response.text);
  
  // Add IDs and completion status
  const roadmap: Roadmap = {
    topic: data.topic,
    steps: data.steps.map((step: any, index: number) => ({
      ...step,
      id: `step-${index}`,
      completed: false
    }))
  };

  return roadmap;
}
