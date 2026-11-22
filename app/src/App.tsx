import { useEffect, useState } from "react";
import Chat from "./components/Chat";
import ModelSelector from "./components/ModelSelector";
import ThemeToggle from "./components/ThemeToggle";
import { checkConnection, getModels } from "./services/ollama";
import type { OllamaModel } from "./types/ollama";
import "./App.css";

type Theme = "light" | "dark";
type ConnectionStatus = "loading" | "online" | "offline" | "models-error";

const connectionLabels: Record<ConnectionStatus, string> = {
  loading: "Buscando modelos…",
  online: "Conectado",
  offline: "Ollama no responde",
  "models-error": "No se pudo cargar la lista de modelos",
};

function getInitialTheme(): Theme {
  const savedTheme = localStorage.getItem("ollama-theme");

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [connection, setConnection] = useState<ConnectionStatus>("loading");
  const [modelRefresh, setModelRefresh] = useState(0);
  const loading = connection === "loading";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ollama-theme", theme);
  }, [theme]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]);

    async function loadModels() {
      const online = await checkConnection(signal);
      if (controller.signal.aborted) return;

      if (!online) {
        setConnection("offline");
        return;
      }

      try {
        const result = await getModels(signal);
        if (controller.signal.aborted) return;

        setModels(result.models);
        setSelectedModel((current) => current || result.models[0]?.name || "");
        setConnection("online");
      } catch {
        if (!controller.signal.aborted) {
          setConnection("models-error");
        }
      }
    }

    void loadModels();

    return () => controller.abort();
  }, [modelRefresh]);

  function refreshModels() {
    setConnection("loading");
    setModelRefresh((current) => current + 1);
  }

  function toggleTheme() {
    setTheme((current) =>
      current === "light" ? "dark" : "light"
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="brand-icon">✦</div>
          <h1>Ollama Web</h1>
        </div>

        <div className="header-controls">
          <ModelSelector
            models={models}
            selectedModel={selectedModel}
            onChange={setSelectedModel}
            disabled={loading}
          />

          <button
            className="secondary-button"
            onClick={refreshModels}
            disabled={loading}
            type="button"
          >
            Actualizar modelos
          </button>

          <ThemeToggle
            theme={theme}
            onToggle={toggleTheme}
          />

          <div className="connection-status" role="status">
            <span
              className={`status-dot ${
                connection === "online" || connection === "models-error"
                  ? "online"
                  : "offline"
              }`}
            />
            <span>
              {connection === "online" && models.length === 0
                ? "Sin modelos instalados"
                : connectionLabels[connection]}
            </span>
          </div>
        </div>
      </header>

      <main className="main">
        <Chat key={selectedModel} model={selectedModel} />
      </main>
    </div>
  );
}

export default App;
