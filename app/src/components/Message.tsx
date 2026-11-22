
import type { ChatMessage } from "../types/ollama";

interface Props {
    message: ChatMessage;
    status?: string;
}

export default function Message({ message, status }: Props) {
const isUser = message.role === "user";

    return (
    <div
        className={`message ${isUser ? "message-user" : "message-assistant"}`}
    >
        <div className="message-role">
        {isUser ? "Tú" : "Ollama"}
        {status && ` · ${status}`}
        </div>

        <div className="message-content">
        {message.content}
        </div>
    </div>
    );
}
