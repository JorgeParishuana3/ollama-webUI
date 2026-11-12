
import type { ChatMessage } from "../types/ollama";

interface Props {
    message: ChatMessage;
}

export default function Message({ message }: Props) {
const isUser = message.role === "user";

    return (
    <div
        className={`message ${isUser ? "message-user" : "message-assistant"}`}
    >
        <div className="message-role">
        {isUser ? "Tú" : "Ollama"}
        </div>

        <div className="message-content">
        {message.content}
        </div>
    </div>
    );
}
