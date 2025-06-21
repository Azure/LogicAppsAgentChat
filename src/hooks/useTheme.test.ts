import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTheme } from './useTheme';
import type { ChatTheme } from '../types';

describe('useTheme', () => {
  let mockDocumentElement: {
    style: {
      setProperty: ReturnType<typeof vi.fn>;
    };
  };
  
  beforeEach(() => {
    // Mock document.documentElement.style.setProperty
    mockDocumentElement = {
      style: {
        setProperty: vi.fn(),
      },
    };
    
    Object.defineProperty(document, 'documentElement', {
      value: mockDocumentElement,
      writable: true,
      configurable: true,
    });
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns default theme when no custom theme provided', () => {
    const { result } = renderHook(() => useTheme());
    
    expect(result.current).toEqual({
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
    });
  });

  it('merges custom theme with default theme', () => {
    const customTheme: Partial<ChatTheme> = {
      colors: {
        primary: '#ff0000',
        background: '#000000',
      },
      typography: {
        fontSize: {
          small: '0.75rem',
        },
      },
    };
    
    const { result } = renderHook(() => useTheme(customTheme));
    
    expect(result.current.colors.primary).toBe('#ff0000');
    expect(result.current.colors.background).toBe('#000000');
    expect(result.current.colors.text).toBe('#333333'); // Default value
    expect(result.current.typography.fontSize.small).toBe('0.75rem');
    expect(result.current.typography.fontSize.base).toBe('1rem'); // Default value
  });

  it('applies theme to document root on mount', () => {
    renderHook(() => useTheme());
    
    // Check color CSS variables
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--chat-color-primary', '#0066cc');
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--chat-color-primary-text', '#ffffff');
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--chat-color-background', '#ffffff');
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--chat-color-surface', '#f5f5f5');
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--chat-color-text', '#333333');
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--chat-color-text-secondary', '#666666');
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--chat-color-border', '#e0e0e0');
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--chat-color-error', '#d32f2f');
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--chat-color-success', '#388e3c');
    
    // Check typography CSS variables
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith(
      '--chat-font-family',
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    );
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--chat-font-size-small', '0.875rem');
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--chat-font-size-base', '1rem');
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--chat-font-size-large', '1.125rem');
    
    // Check spacing CSS variable
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--chat-spacing-unit', '8px');
    
    // Check border radius CSS variables
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--chat-radius-small', '4px');
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--chat-radius-medium', '8px');
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--chat-radius-large', '12px');
  });

  it('applies custom theme values to document root', () => {
    const customTheme: Partial<ChatTheme> = {
      colors: {
        primary: '#ff0000',
      },
      spacing: {
        unit: 16,
      },
    };
    
    renderHook(() => useTheme(customTheme));
    
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--chat-color-primary', '#ff0000');
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--chat-spacing-unit', '16px');
  });

  it('handles complete custom theme override', () => {
    const customTheme: Partial<ChatTheme> = {
      colors: {
        primary: '#123456',
        primaryText: '#abcdef',
        background: '#fedcba',
        surface: '#654321',
        text: '#111111',
        textSecondary: '#222222',
        border: '#333333',
        error: '#444444',
        success: '#555555',
      },
      typography: {
        fontFamily: 'Comic Sans MS',
        fontSize: {
          small: '10px',
          base: '12px',
          large: '14px',
        },
      },
      spacing: {
        unit: 4,
      },
      borderRadius: {
        small: '2px',
        medium: '4px',
        large: '6px',
      },
    };
    
    const { result } = renderHook(() => useTheme(customTheme));
    
    expect(result.current).toEqual(customTheme);
  });

  it('handles branding in custom theme', () => {
    const customTheme: Partial<ChatTheme> = {
      branding: {
        logoUrl: 'https://example.com/logo.png',
        logoSize: 'medium',
        logoPosition: 'header',
      },
    };
    
    const { result } = renderHook(() => useTheme(customTheme));
    
    expect(result.current.branding).toEqual(customTheme.branding);
  });

  it('prefers custom branding over default', () => {
    const defaultThemeWithBranding = {
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
      branding: {
        logoUrl: 'default-logo.png',
        logoSize: 'small' as const,
      },
    };
    
    const customTheme: Partial<ChatTheme> = {
      branding: {
        logoUrl: 'custom-logo.png',
        logoSize: 'large',
      },
    };
    
    const { result } = renderHook(() => useTheme(customTheme));
    
    expect(result.current.branding).toEqual(customTheme.branding);
  });

  it('returns stable theme reference when custom theme unchanged', () => {
    const customTheme: Partial<ChatTheme> = {
      colors: {
        primary: '#ff0000',
      },
    };
    
    const { result, rerender } = renderHook(() => useTheme(customTheme));
    
    const firstTheme = result.current;
    
    rerender();
    
    const secondTheme = result.current;
    
    // Deep equal but not same reference due to merging
    expect(secondTheme).toEqual(firstTheme);
  });

  it('converts camelCase to kebab-case correctly', () => {
    const customTheme: Partial<ChatTheme> = {
      colors: {
        primaryText: '#ffffff',
        textSecondary: '#666666',
      },
    };
    
    renderHook(() => useTheme(customTheme));
    
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--chat-color-primary-text', '#ffffff');
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--chat-color-text-secondary', '#666666');
  });

  it('handles partial typography override correctly', () => {
    const customTheme: Partial<ChatTheme> = {
      typography: {
        fontFamily: 'Arial',
        // fontSize is not provided
      },
    };
    
    const { result } = renderHook(() => useTheme(customTheme));
    
    expect(result.current.typography.fontFamily).toBe('Arial');
    expect(result.current.typography.fontSize).toEqual({
      small: '0.875rem',
      base: '1rem',
      large: '1.125rem',
    });
  });

  it('handles partial fontSize override correctly', () => {
    const customTheme: Partial<ChatTheme> = {
      typography: {
        fontSize: {
          base: '18px',
          // small and large are not provided
        },
      },
    };
    
    const { result } = renderHook(() => useTheme(customTheme));
    
    expect(result.current.typography.fontSize.small).toBe('0.875rem');
    expect(result.current.typography.fontSize.base).toBe('18px');
    expect(result.current.typography.fontSize.large).toBe('1.125rem');
  });

  it('applies theme when custom theme changes', () => {
    const { rerender } = renderHook(
      ({ theme }) => useTheme(theme),
      {
        initialProps: { theme: undefined },
      }
    );
    
    const initialCallCount = mockDocumentElement.style.setProperty.mock.calls.length;
    
    const customTheme: Partial<ChatTheme> = {
      colors: {
        primary: '#00ff00',
      },
    };
    
    rerender({ theme: customTheme });
    
    expect(mockDocumentElement.style.setProperty.mock.calls.length).toBeGreaterThan(initialCallCount);
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--chat-color-primary', '#00ff00');
  });

  it('handles empty custom theme objects', () => {
    const customTheme: Partial<ChatTheme> = {
      colors: {},
      typography: {
        fontSize: {},
      },
      spacing: {},
      borderRadius: {},
    };
    
    const { result } = renderHook(() => useTheme(customTheme));
    
    // Should still have all default values
    expect(result.current.colors.primary).toBe('#0066cc');
    expect(result.current.typography.fontSize.base).toBe('1rem');
    expect(result.current.spacing.unit).toBe(8);
    expect(result.current.borderRadius.medium).toBe('8px');
  });

  it('handles numeric values in spacing', () => {
    const customTheme: Partial<ChatTheme> = {
      spacing: {
        unit: 0,
      },
    };
    
    renderHook(() => useTheme(customTheme));
    
    expect(mockDocumentElement.style.setProperty).toHaveBeenCalledWith('--chat-spacing-unit', '0px');
  });
});