'use client';

import { createContext, useState, useEffect, useContext } from 'react';

// Create context
const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => {},
});

// Theme provider component
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [isLoaded, setIsLoaded] = useState(false);

  // Get theme from local storage on component mount
  useEffect(() => {
    // Check if we're in the browser
    if (typeof window !== 'undefined') {
      // Check if there's a saved theme in localStorage
      const savedTheme = localStorage.getItem('theme');
      
      // Only use 'light' or 'dark' for toggle
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
      } else {
        // Default to light if no valid theme found
        setTheme('light');
        localStorage.setItem('theme', 'light');
      }
      
      setIsLoaded(true);
    }
  }, []);

  // Apply theme to document when theme changes
  useEffect(() => {
    if (!isLoaded || typeof document === 'undefined') return;
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme, isLoaded]);

  // Update theme with specific value
  const updateTheme = (newTheme) => {
    if (typeof window === 'undefined') return;
    
    // For settings page we allow 'system', but the toggle
    // only uses 'light' and 'dark'
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    } else {
      // Ensure we only ever set 'light' or 'dark'
      const validTheme = newTheme === 'dark' ? 'dark' : 'light';
      setTheme(validTheme);
    }
    localStorage.setItem('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to use the theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}