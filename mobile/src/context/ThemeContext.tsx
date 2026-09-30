import React, { createContext, useContext, useState } from 'react';
import { THEMES, ThemeMode, ThemeConfig } from '../theme/colors';

interface ThemeContextType {
  mode: ThemeMode;
  theme: ThemeConfig;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'marrow',
  theme: THEMES.marrow,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('marrow');

  const toggleTheme = () => {
    setMode((prev) => (prev === 'marrow' ? 'prepladder' : 'marrow'));
  };

  const theme = THEMES[mode];

  return (
    <ThemeContext.Provider value={{ mode, theme, toggleTheme, setThemeMode: setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
