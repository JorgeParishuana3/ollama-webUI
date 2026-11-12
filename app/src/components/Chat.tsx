
import { useEffect, useRef, useState } from "react";
import Message from "./Message";
import { streamChat } from "../services/ollama";
import type { ChatMessage } from "../types/ollama";

interface Props {
  model: string;
}

export default function Chat({ model }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    generationRef.current++;
    abortRef.current?.abort();
    abortRef.current = null;
    messagesRef.current = [];
    // Reinicia el chat al cambiar de modelo.
    // La actualización se realiza en el siguiente ciclo.
    return () => {
      generationRef.current++;
      abortRef.current?.abort();
    };
  }, [model]);

  function updateMessages(next: ChatMessage[]) {
    messagesRef.current = next;
    setMessages(next);
  }

  function newChat() {
    generationRef.current++;
    abortRef.current?.abort();
    abortRef.current = null;
    updateMessages([]);
    setInput("");
    setError("");
    setGenerating(false);
  }

  function stopGeneration() {
    generationRef.current++;
    abortRef.current?.abort();
    abortRef.current = null;
    setGenerating(false);
  }

  async function sendMessage() {
    const content = input.trim();

    if (!content || !model || generating) return;

    const controller = new AbortController();
    const generationId = ++generationRef.current;

    abortRef.current = controller;

    const nextMessages: ChatMessage[] = [
      ...messagesRef.current,
      { role: "user", content },
    ];

    updateMessages([
      ...nextMessages,
      { role: "assistant", content: "" },
    ]);

    setInput("");
    setError("");
    setGenerating(true);

    let answer = "";

    try {
      await streamChat(
        model,
        nextMessages,
        (chunk) => {
          if (generationRef.current !== generationId) return;

          answer += chunk;

          updateMessages([
            ...nextMessages,
            { role: "assistant", content: answer },
          ]);
        },
        controller.signal
      );
    } catch (err) {
      if (
        generationRef.current === generationId &&
        !controller.signal.aborted
      ) {
        setError(
          err instanceof Error
            ? err.message
            : "Error al generar la respuesta"
        );
      }
    } finally {
      if (generationRef.current === generationId) {
        abortRef.current = null;
        setGenerating(false);

        if (!answer) {
          updateMessages(nextMessages);
        }
      }
    }
  }

  return (
    <section className="chat">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <div className="empty-icon">✦</div>
            <h2>Ollama Web</h2>
            <p>Selecciona un modelo y comienza a conversar.</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <Message key={index} message={message} />
          ))
        )}

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="chat-footer">
        <div className="composer">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            placeholder={
              model
                ? "Escribe un mensaje..."
                : "Selecciona un modelo"
            }
            disabled={!model || generating}
            rows={2}
          />

          <div className="composer-actions">
            <button
              className="secondary-button"
              onClick={newChat}
              type="button"
            >
              Nuevo chat
            </button>

            {generating ? (
              <button
                className="stop-button"
                onClick={stopGeneration}
                type="button"
              >
                ■ Detener
              </button>
            ) : (
              <button
                className="send-button"
                onClick={() => void sendMessage()}
                disabled={!input.trim() || !model}
                type="button"
              >
                Enviar ↑
              </button>
            )}
          </div>
        </div>
        <p className="footer-note">
          Conversación temporal · No se guarda historial
        </p>
      </div>
    </section>
  );
}
