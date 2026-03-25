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
}

export interface Roadmap {
  topic: string;
  steps: RoadmapStep[];
}
