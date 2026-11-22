
import { useEffect, useRef, useState } from "react";
import Message from "./Message";
import { streamChat } from "../services/ollama";
import type { ChatMessage } from "../types/ollama";

interface Props {
  model: string;
}

type IncompleteStatus = "Detenida" | "Interrumpida";

type DisplayMessage = ChatMessage & {
  status?: IncompleteStatus;
};

export default function Chat({ model }: Props) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [incomplete, setIncomplete] = useState<IncompleteStatus | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<DisplayMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [model]);

  function updateMessages(next: DisplayMessage[]) {
    messagesRef.current = next;
    setMessages(next);
  }

  function newChat() {
    abortRef.current?.abort();
    abortRef.current = null;
    updateMessages([]);
    setInput("");
    setError("");
    setIncomplete(null);
    setGenerating(false);
  }

  function stopGeneration() {
    if (!abortRef.current) return;

    abortRef.current.abort();
    abortRef.current = null;
    finishIncomplete("Detenida");
    setGenerating(false);
  }

  function finishIncomplete(status: IncompleteStatus) {
    const current = messagesRef.current;
    const last = current[current.length - 1];
    updateMessages(
      last.content
        ? [...current.slice(0, -1), { ...last, status }]
        : current.slice(0, -1)
    );
    setIncomplete(status);
  }

  function sendMessage() {
    const content = input.trim();
    if (!content || !model || abortRef.current) return;

    setInput("");
    void generateReply([...messagesRef.current, { role: "user", content }]);
  }

  function retryMessage() {
    const current = messagesRef.current;
    const last = current[current.length - 1];
    if (!incomplete || !last) return;

    void generateReply(last.status ? current.slice(0, -1) : current);
  }

  async function generateReply(nextMessages: DisplayMessage[]) {
    if (!model || abortRef.current) return;

    const controller = new AbortController();
    abortRef.current = controller;

    updateMessages([
      ...nextMessages,
      { role: "assistant", content: "" },
    ]);

    setError("");
    setIncomplete(null);
    setGenerating(true);

    let answer = "";

    try {
      await streamChat(
        model,
        nextMessages.filter((message) => !message.status),
        (chunk) => {
          if (abortRef.current !== controller) return;

          answer += chunk;

          updateMessages([
            ...nextMessages,
            { role: "assistant", content: answer },
          ]);
        },
        controller.signal
      );

      if (abortRef.current === controller && !answer) {
        updateMessages(nextMessages);
      }
    } catch (err) {
      if (abortRef.current === controller) {
        finishIncomplete("Interrumpida");
        setError(
          err instanceof Error
            ? err.message
            : "Error al generar la respuesta"
        );
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setGenerating(false);
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
            <Message key={index} message={message} status={message.status} />
          ))
        )}

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {incomplete && (
          <div role="status">
            {incomplete === "Detenida"
              ? "Generación detenida."
              : "Respuesta interrumpida."}
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

            {incomplete && (
              <button
                className="secondary-button"
                onClick={retryMessage}
                type="button"
              >
                Reintentar
              </button>
            )}

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
