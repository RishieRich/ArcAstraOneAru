import { IconMoon, IconSun } from "../icons";

export default function ThemeToggle({ theme, setTheme, t, compact = false }) {
  const dark = theme === "dark";
  const next = dark ? "light" : "dark";
  return (
    <button
      className={`theme-toggle${compact ? " compact" : ""}`}
      type="button"
      onClick={() => setTheme(next)}
      aria-label={dark ? t.useLightMode : t.useDarkMode}
      title={dark ? t.useLightMode : t.useDarkMode}
    >
      <span className="theme-toggle-icon">
        {dark ? <IconSun width={16} height={16} /> : <IconMoon width={16} height={16} />}
      </span>
      {!compact && <span>{dark ? t.lightMode : t.darkMode}</span>}
    </button>
  );
}
