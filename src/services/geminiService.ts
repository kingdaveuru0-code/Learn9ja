import { GoogleGenAI, Type } from "@google/genai";
import { Roadmap, Question, ChatMessage, NewsItem, HistoricalEvent, Country, WaecQuestion, University } from "../types";

const apiKey = process.env.GEMINI_API_KEY!;
const ai = new GoogleGenAI({ apiKey });

export async function generateRoadmap(topic: string, level: "Secondary" | "University" = "Secondary"): Promise<Roadmap> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a friendly expert educator who specializes in explaining complex topics to children. 
    Create a learning roadmap for the topic: "${topic}".
    Level: ${level === "University" ? "University/Undergraduate (Global Standards)" : "Secondary School (Global Standards)"}.
    Break it down into 5-7 logical steps.
    For each step, provide:
    1. A clear, simple title.
    2. A bite-sized explanation. IMPORTANT: Explain it so simply that even a 5-year-old child could understand the core concept and how to execute it. Use very simple words and fun, real-world analogies.
    3. 2-3 curated free resources (YouTube links, Coursera, edX, Khan Academy, etc.).
    
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

export async function generateQuestions(subject: string, level: "Secondary" | "University" = "Secondary"): Promise<Question[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate 5 multiple-choice questions for the subject: "${subject}".
    Level: ${level === "University" ? "University/Undergraduate (International Standards)" : "Secondary School (Global Standards)"}.
    Include both Science and Art related topics within the subject if applicable.
    Provide the correct answer and a very simple explanation for each. 
    IMPORTANT: The explanation must be so simple that a child can understand why the answer is correct.
    Output in JSON format.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["question", "options", "correctAnswer", "explanation"]
        }
      }
    }
  });

  const data = JSON.parse(response.text);
  return data.map((q: any, i: number) => ({ ...q, id: `q-${i}` }));
}

export async function chatWithAssistant(message: string, history: ChatMessage[]): Promise<string> {
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: "You are 'Prof. Global', a world-renowned expert educator and the lead professor of LEARN GLOBAL. Your mission is to help students with their questions about global studies (Science, Arts, Commercial) at both Secondary and University levels. IMPORTANT: You are proactive, encouraging, and explain everything to the lowest level possible, using very simple language that even a child can understand and execute. Use fun analogies, keep replies concise and fast, and always offer a 'Professor's Pro Tip' at the end of your explanations.",
    },
    history: history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
  });

  const result = await chat.sendMessage({ message });
  return result.text;
}

export async function getProfessorTip(context: string = "general"): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `As Prof. Global, provide a proactive, short, and inspiring learning tip for students. 
    Context: ${context}.
    The tip should be actionable and explained so simply that a child can understand.
    Keep it under 30 words.`,
  });
  return response.text;
}

export async function fetchDailyPortal(): Promise<{ news: NewsItem[], history: HistoricalEvent[] }> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Today is ${new Date().toDateString()}. 
    Provide a world news and history portal for students including:
    1. 6 current news items relevant to students:
       - 3 major world events (Global education, Science, Tech).
       - 3 major Nigerian daily news items (Education, Economy, major local events).
    2. 3 historical events that happened on this day in history.
    
    Output in JSON format.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          news: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                url: { type: Type.STRING },
                source: { type: Type.STRING },
                category: { type: Type.STRING, enum: ["Local", "International", "Science", "Arts", "Nigeria"] }
              },
              required: ["title", "summary", "url", "source", "category"]
            }
          },
          history: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                year: { type: Type.STRING },
                event: { type: Type.STRING },
                significance: { type: Type.STRING }
              },
              required: ["year", "event", "significance"]
            }
          }
        },
        required: ["news", "history"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function fetchCountries(): Promise<Country[]> {
  const response = await fetch("https://restcountries.com/v3.1/all?fields=name,capital,region,flags,maps,population,languages");
  if (!response.ok) throw new Error("Failed to fetch countries");
  const data = await response.json();
  
  return data.map((c: any) => ({
    name: c.name.common,
    capital: c.capital?.[0] || "N/A",
    region: c.region,
    flag: c.flags.svg || c.flags.png,
    mapUrl: c.maps.googleMaps,
    population: c.population,
    languages: Object.values(c.languages || {}) as string[]
  })).sort((a: Country, b: Country) => a.name.localeCompare(b.name));
}

export async function generateWaecQuestions(subject: string, count: number = 5): Promise<WaecQuestion[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate ${count} authentic WAEC-style past questions for the subject: ${subject}. 
    Include a mix of:
    - Objective (Multiple Choice)
    - Essay (Theory)
    - Practical (if applicable to the subject, otherwise more Essay)

    For each question, include:
    - year (e.g. 2018, 2020)
    - type ("objective", "essay", or "practical")
    - question text
    - options (ONLY for objective)
    - correctAnswer (ONLY for objective)
    - sampleAnswer (ONLY for essay/practical)
    - a helpful explanation (for all types)

    The questions should follow the West African Examination Council standards.
    IMPORTANT: The explanation must be written in extremely simple language that even a child can understand.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            subject: { type: Type.STRING },
            year: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["objective", "essay", "practical"] },
            question: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            correctAnswer: { type: Type.STRING },
            sampleAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["id", "subject", "year", "type", "question", "explanation"]
        }
      }
    }
  });

  return JSON.parse(response.text);
}

export async function fetchUniversities(name: string = "", country: string = ""): Promise<University[]> {
  const url = `https://universities.hipolabs.com/search?name=${encodeURIComponent(name)}&country=${encodeURIComponent(country)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch universities");
  return await response.json();
}

export async function fetchSubjectTopics(subject: string, level: "Secondary" | "University" = "Secondary"): Promise<string[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `List 10 popular and important topics for the subject: "${subject}".
    Level: ${level === "University" ? "University/Undergraduate (Global Standards)" : "Secondary School (Global Standards)"}.
    Provide only the names of the topics as a simple list.
    Output in JSON format as an array of strings.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  return JSON.parse(response.text);
}

export async function generateStudentVideo(prompt: string): Promise<string> {
  const apiKey = (process.env as any).API_KEY || process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Failed to generate video");

  const response = await fetch(downloadLink, {
    method: 'GET',
    headers: {
      'x-goog-api-key': apiKey!,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
