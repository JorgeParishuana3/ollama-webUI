
interface ThemeToggleProps {
    theme: "light" | "dark";
    onToggle: () => void;
}

export default function ThemeToggle({
    theme,
    onToggle,
}: ThemeToggleProps) {
    return (
        <button
            type="button"
            className="theme-toggle"
            onClick={onToggle}
            aria-label={
            theme === "light"
                ? "Activar modo oscuro"
                : "Activar modo claro"
            }
            title={
            theme === "light"
                ? "Modo oscuro"
                : "Modo claro"
            }
        >
            {theme === "light" ? "☾" : "☀"}
        </button>
    );
}
