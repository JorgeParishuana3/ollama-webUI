
export interface OllamaModel {
  name: string;
  model: string;
  size: number;
  modified_at: string;
}

export interface OllamaModelsResponse {
  models: OllamaModel[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatChunk {
  message?: ChatMessage;
  done: boolean;
  error?: string;
}
