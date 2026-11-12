import { useEffect, useState } from "react";
import Chat from "./components/Chat";
import ModelSelector from "./components/ModelSelector";
import ThemeToggle from "./components/ThemeToggle";
import { checkConnection, getModels } from "./services/ollama";
import type { OllamaModel } from "./types/ollama";
import "./App.css";

type Theme = "light" | "dark";

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
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ollama-theme", theme);
  }, [theme]);

  useEffect(() => {
    const controller = new AbortController();

    async function initialize() {
      setLoading(true);

      try {
        const online = await checkConnection(controller.signal);

        if (controller.signal.aborted) return;

        setConnected(online);

        if (online) {
          const result = await getModels(controller.signal);

          if (controller.signal.aborted) return;

          setModels(result.models);
          setSelectedModel(result.models[0]?.name ?? "");
        }
      } catch {
        if (!controller.signal.aborted) {
          setConnected(false);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => controller.abort();
  }, []);

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

          <ThemeToggle
            theme={theme}
            onToggle={toggleTheme}
          />

          <div className="connection-status">
            <span
              className={`status-dot ${
                connected ? "online" : "offline"
              }`}
            />
            <span>
              {loading
                ? "Conectando..."
                : connected
                  ? "Conectado"
                  : "Sin conexión"}
            </span>
          </div>
        </div>
      </header>

      <main className="main">
        {!loading && !connected ? (
          <div className="connection-error">
            <h2>No se pudo conectar con Ollama</h2>
            <p>Verifica que el servidor esté disponible.</p>
          </div>
        ) : (
          <Chat key={selectedModel} model={selectedModel} />
        )}
      </main>
    </div>
  );
}

export default App;
