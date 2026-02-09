export type ThemeMode = "light" | "dark";

const THEME_KEY = "poly-theme";

export const getStoredTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(THEME_KEY);
  return stored === "light" ? "light" : "dark";
};

export const applyTheme = (theme: ThemeMode) => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_KEY, theme);
  }
};

export const initTheme = (): ThemeMode => {
  const theme = getStoredTheme();
  applyTheme(theme);
  return theme;
};

export const toggleTheme = (): ThemeMode => {
  if (typeof document === "undefined") return "dark";
  const next =
    document.documentElement.classList.contains("dark") ? "light" : "dark";
  applyTheme(next);
  return next;
};
