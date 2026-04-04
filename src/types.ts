export interface Resource {
  title: string;
  url: string;
}

export interface RoadmapStep {
  id: string;
  title: string;
  explanation: string;
  resources: Resource[];
  completed: boolean;
  suggestedQuestions?: Question[];
}

export interface Roadmap {
  topic: string;
  steps: RoadmapStep[];
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  category: "Local" | "International" | "Science" | "Arts" | "Nigeria";
}

export interface HistoricalEvent {
  year: string;
  event: string;
  significance: string;
}

export interface Country {
  name: string;
  capital: string;
  region: string;
  flag: string;
  mapUrl: string;
  population: number;
  languages: string[];
}

export interface WaecQuestion {
  id: string;
  subject: string;
  year: string;
  type: "objective" | "essay" | "practical";
  question: string;
  options?: string[]; // Only for objective
  correctAnswer?: string; // Only for objective
  sampleAnswer?: string; // For essay/practical
  explanation: string;
}

export interface University {
  name: string;
  country: string;
  web_pages: string[];
  alpha_two_code: string;
  "state-province": string | null;
}

export interface HistoryItem {
  id: string;
  type: "roadmap" | "quiz";
  title: string;
  timestamp: string;
  data: any; // Roadmap or Quiz results
}
