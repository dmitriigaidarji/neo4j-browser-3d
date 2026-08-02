import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  type PropsWithChildren,
} from "react";
import useCachedValue, { CachedKey } from "../hooks/useCachedValue";

export type Theme = "dark" | "light";

interface IThemeContext {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<IThemeContext>({
  theme: "dark",
  toggleTheme: () => {},
});

function preferredTheme(): Theme {
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export default function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useCachedValue<Theme>(
    CachedKey.theme,
    preferredTheme(),
  );

  // Bulma 1.x reads `data-theme` off the root element.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const toggleTheme = useCallback(
    () => setTheme((current) => (current === "dark" ? "light" : "dark")),
    [setTheme],
  );

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
