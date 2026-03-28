import { createContext, useContext, type ReactNode } from 'react';
import { COLORS } from '../constants';

interface ThemeContextType {
  colors: typeof COLORS.light;
}

const ThemeContext = createContext<ThemeContextType>({ colors: COLORS.light });

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeContext.Provider value={{ colors: COLORS.light }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
