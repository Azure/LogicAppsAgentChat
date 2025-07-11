import { useEffect } from 'react';
import type { ChatTheme } from '../types';

const DEFAULT_THEME: ChatTheme = {
  colors: {
    primary: '#0066cc',
    primaryText: '#ffffff',
    background: '#ffffff',
    surface: '#f5f5f5',
    text: '#333333',
    textSecondary: '#666666',
    border: '#e0e0e0',
    error: '#d32f2f',
    success: '#388e3c',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: {
      small: '0.875rem',
      base: '1rem',
      large: '1.125rem',
    },
  },
  spacing: {
    unit: 8,
  },
  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '12px',
  },
};

export function useTheme(customTheme?: Partial<ChatTheme>) {
  const theme = mergeTheme(DEFAULT_THEME, customTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return theme;
}

function mergeTheme(defaultTheme: ChatTheme, customTheme?: Partial<ChatTheme>): ChatTheme {
  if (!customTheme) return defaultTheme;

  const result: ChatTheme = {
    colors: { ...defaultTheme.colors, ...customTheme.colors },
    typography: {
      ...defaultTheme.typography,
      ...customTheme.typography,
      fontSize: {
        ...defaultTheme.typography.fontSize,
        ...customTheme.typography?.fontSize,
      },
    },
    spacing: { ...defaultTheme.spacing, ...customTheme.spacing },
    borderRadius: { ...defaultTheme.borderRadius, ...customTheme.borderRadius },
  };

  // Handle optional branding property
  if (customTheme.branding !== undefined) {
    result.branding = customTheme.branding;
  } else if (defaultTheme.branding !== undefined) {
    result.branding = defaultTheme.branding;
  }

  return result;
}

function applyTheme(theme: ChatTheme) {
  const root = document.documentElement;

  // Colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--chat-color-${kebabCase(key)}`, value);
  });

  // Typography
  root.style.setProperty('--chat-font-family', theme.typography.fontFamily);
  Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
    root.style.setProperty(`--chat-font-size-${key}`, value);
  });

  // Spacing
  root.style.setProperty('--chat-spacing-unit', `${theme.spacing.unit}px`);

  // Border radius
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    root.style.setProperty(`--chat-radius-${key}`, value);
  });
}

function kebabCase(str: string): string {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}
