
import type { OllamaModel } from "../types/ollama";

interface Props {
  models: OllamaModel[];
  selectedModel: string;
  onChange: (model: string) => void;
  disabled?: boolean;
}

export default function ModelSelector({
  models,
  selectedModel,
  onChange,
  disabled = false,
}: Props) {
  return (
    <select
      className="model-selector"
      value={selectedModel}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled || models.length === 0}
      aria-label="Seleccionar modelo"
    >
      {selectedModel && !models.some((model) => model.name === selectedModel) && (
        <option value={selectedModel}>
          {selectedModel} (no disponible)
        </option>
      )}

      {!selectedModel && models.length === 0 && (
        <option value="">Sin modelos disponibles</option>
      )}

      {models.map((model) => (
        <option key={model.name} value={model.name}>
          {model.name}
        </option>
      ))}
    </select>
  );
}
