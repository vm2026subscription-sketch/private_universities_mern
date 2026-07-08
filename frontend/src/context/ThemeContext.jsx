import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('vm_theme');
    return stored ? stored === 'dark' : false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('vm_theme', dark ? 'dark' : 'light');
  }, [dark]);

  // Stable identities so the context value only changes when `dark` flips —
  // previously a new { dark, toggle } object was created on every provider
  // render, re-rendering every consumer unnecessarily.
  const toggle = useCallback(() => setDark(d => !d), []);
  const value = useMemo(() => ({ dark, toggle }), [dark, toggle]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
