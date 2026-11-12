
import type {
  ChatChunk,
  ChatMessage,
  OllamaModelsResponse,
} from "../types/ollama";

const API_URL = "/api";

export async function getModels(
  signal?: AbortSignal
): Promise<OllamaModelsResponse> {
  const response = await fetch(`${API_URL}/tags`, { signal });

  if (!response.ok) {
    throw new Error("No se pudieron obtener los modelos");
  }

  return response.json();
}

export async function checkConnection(
  signal?: AbortSignal
): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/version`, {
      signal,
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function streamChat(
  model: string,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Error de Ollama (${response.status}): ${detail}`
    );
  }

  if (!response.body) {
    throw new Error("El servidor no devolvió un stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  function processLine(line: string) {
    if (!line.trim()) return;

    const chunk = JSON.parse(line) as ChatChunk;

    if (chunk.error) {
      throw new Error(chunk.error);
    }

    if (chunk.message?.content) {
      onChunk(chunk.message.content);
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        processLine(line);
      }
    }

    buffer += decoder.decode();

    if (buffer.trim()) {
      processLine(buffer);
    }
  } finally {
    reader.releaseLock();
  }
}
