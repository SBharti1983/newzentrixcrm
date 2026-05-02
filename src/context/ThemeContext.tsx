import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'Light' | 'Dark' | 'Classic Dark' | 'System';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('zentrix_theme');
    return (saved as Theme) || 'System';
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('zentrix_theme', newTheme);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.removeAttribute('data-theme');
    
    if (theme === 'System') {
      // CRM branded default: dark sidebar/header + light content
      root.setAttribute('data-theme', 'system');
    } else if (theme === 'Light') {
      root.setAttribute('data-theme', 'light');
    } else if (theme === 'Dark') {
      root.setAttribute('data-theme', 'dark');
    } else if (theme === 'Classic Dark') {
      root.setAttribute('data-theme', 'classic-dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
