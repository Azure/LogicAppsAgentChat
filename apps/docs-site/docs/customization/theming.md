---
sidebar_position: 1
---

# Theming

Customize the appearance of A2A Chat components to match your brand and design system.

## Theme Structure

A2A Chat uses a comprehensive theming system based on CSS variables and JavaScript configuration.

### Default Theme

```typescript
const defaultTheme = {
  colors: {
    primary: '#0078d4',
    primaryText: '#ffffff',
    background: '#ffffff',
    surface: '#f5f5f5',
    text: '#323130',
    textSecondary: '#605e5c',
    border: '#edebe9',
    error: '#d13438',
    success: '#107c10',
    warning: '#ffaa44',
    info: '#0078d4',
  },
  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '12px',
  },
  spacing: {
    small: '8px',
    medium: '16px',
    large: '24px',
  },
  typography: {
    fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
    fontSize: {
      small: '0.875rem',
      base: '1rem',
      large: '1.125rem',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      bold: 600,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  shadows: {
    small: '0 2px 4px rgba(0, 0, 0, 0.1)',
    medium: '0 4px 8px rgba(0, 0, 0, 0.1)',
    large: '0 8px 16px rgba(0, 0, 0, 0.1)',
  },
  transitions: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
  },
};
```

## Using Themes

### With ChatThemeProvider

Wrap your chat components with `ChatThemeProvider`:

```tsx
import { ChatWidget, ChatThemeProvider } from '@microsoft/a2achat-core/react';

const customTheme = {
  colors: {
    primary: '#6366f1',
    primaryText: '#ffffff',
    background: '#ffffff',
    surface: '#f9fafb',
    text: '#111827',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    error: '#ef4444',
    success: '#10b981',
  },
};

function App() {
  return (
    <ChatThemeProvider theme={customTheme}>
      <ChatWidget agentCard="..." />
    </ChatThemeProvider>
  );
}
```

### Direct Theme Prop

Pass theme directly to components:

```tsx
<ChatWidget agentCard="..." theme={customTheme} />
```

## CSS Variables

All theme values are exposed as CSS variables for easy customization:

```css
:root {
  /* Colors */
  --chat-color-primary: #0078d4;
  --chat-color-primary-text: #ffffff;
  --chat-color-background: #ffffff;
  --chat-color-surface: #f5f5f5;
  --chat-color-text: #323130;
  --chat-color-text-secondary: #605e5c;
  --chat-color-border: #edebe9;
  --chat-color-error: #d13438;
  --chat-color-success: #107c10;

  /* Border Radius */
  --chat-radius-small: 4px;
  --chat-radius-medium: 8px;
  --chat-radius-large: 12px;

  /* Spacing */
  --chat-spacing-small: 8px;
  --chat-spacing-medium: 16px;
  --chat-spacing-large: 24px;

  /* Typography */
  --chat-font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
  --chat-font-size-small: 0.875rem;
  --chat-font-size-base: 1rem;
  --chat-font-size-large: 1.125rem;

  /* Shadows */
  --chat-shadow-small: 0 2px 4px rgba(0, 0, 0, 0.1);
  --chat-shadow-medium: 0 4px 8px rgba(0, 0, 0, 0.1);
  --chat-shadow-large: 0 8px 16px rgba(0, 0, 0, 0.1);

  /* Transitions */
  --chat-transition-fast: 150ms;
  --chat-transition-normal: 250ms;
  --chat-transition-slow: 350ms;
}
```

### CSS-Only Theming

Override CSS variables without JavaScript:

```css
/* Dark theme example */
.dark-theme {
  --chat-color-background: #1a1a1a;
  --chat-color-surface: #2d2d2d;
  --chat-color-text: #ffffff;
  --chat-color-text-secondary: #a0a0a0;
  --chat-color-border: #404040;
  --chat-color-primary: #60a5fa;
}

/* Custom brand colors */
.brand-theme {
  --chat-color-primary: #ff6b6b;
  --chat-color-success: #51cf66;
  --chat-color-error: #ff6b6b;
  --chat-font-family: 'Inter', sans-serif;
}
```

## Common Theme Examples

### Dark Theme

```typescript
const darkTheme = {
  colors: {
    primary: '#60a5fa',
    primaryText: '#ffffff',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    border: '#334155',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    info: '#3b82f6',
  },
  shadows: {
    small: '0 2px 4px rgba(0, 0, 0, 0.3)',
    medium: '0 4px 8px rgba(0, 0, 0, 0.3)',
    large: '0 8px 16px rgba(0, 0, 0, 0.3)',
  },
};
```

### Material Design Theme

```typescript
const materialTheme = {
  colors: {
    primary: '#1976d2',
    primaryText: '#ffffff',
    background: '#fafafa',
    surface: '#ffffff',
    text: 'rgba(0, 0, 0, 0.87)',
    textSecondary: 'rgba(0, 0, 0, 0.6)',
    border: 'rgba(0, 0, 0, 0.12)',
    error: '#d32f2f',
    success: '#388e3c',
    warning: '#f57c00',
    info: '#1976d2',
  },
  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '16px',
  },
  shadows: {
    small: '0px 2px 4px rgba(0, 0, 0, 0.14)',
    medium: '0px 4px 8px rgba(0, 0, 0, 0.14)',
    large: '0px 8px 16px rgba(0, 0, 0, 0.14)',
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: {
      small: '0.75rem',
      base: '0.875rem',
      large: '1rem',
    },
  },
};
```

### Tailwind-Inspired Theme

```typescript
const tailwindTheme = {
  colors: {
    primary: '#6366f1', // indigo-500
    primaryText: '#ffffff',
    background: '#ffffff',
    surface: '#f9fafb', // gray-50
    text: '#111827', // gray-900
    textSecondary: '#6b7280', // gray-500
    border: '#e5e7eb', // gray-200
    error: '#ef4444', // red-500
    success: '#10b981', // emerald-500
    warning: '#f59e0b', // amber-500
    info: '#3b82f6', // blue-500
  },
  borderRadius: {
    small: '0.375rem', // rounded-md
    medium: '0.5rem', // rounded-lg
    large: '0.75rem', // rounded-xl
  },
  typography: {
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
};
```

## Advanced Theming

### Dynamic Theme Switching

```tsx
import { useState } from 'react';
import { ChatWidget, ChatThemeProvider } from '@microsoft/a2achat-core/react';

function ThemedChat() {
  const [isDark, setIsDark] = useState(false);

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <div className={isDark ? 'dark' : 'light'}>
      <button onClick={() => setIsDark(!isDark)}>Toggle Theme</button>

      <ChatThemeProvider theme={theme}>
        <ChatWidget agentCard="..." />
      </ChatThemeProvider>
    </div>
  );
}
```

### Theme from System Preferences

```tsx
import { useEffect, useState } from 'react';

function useSystemTheme() {
  const [isDark, setIsDark] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isDark;
}

function AutoThemedChat() {
  const isDark = useSystemTheme();
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ChatThemeProvider theme={theme}>
      <ChatWidget agentCard="..." />
    </ChatThemeProvider>
  );
}
```

### Partial Theme Updates

Merge partial themes with defaults:

```tsx
import { defaultTheme, mergeThemes } from '@microsoft/a2achat-core/react';

const brandColors = {
  colors: {
    primary: '#ff6b6b',
    success: '#51cf66',
  },
};

const customTheme = mergeThemes(defaultTheme, brandColors);
```

## Component-Specific Styling

### Message Bubbles

```css
/* Custom message bubble styles */
.chat-message {
  /* User messages */
  &[data-role='user'] {
    --chat-message-bg: var(--chat-color-primary);
    --chat-message-text: var(--chat-color-primary-text);
    border-radius: 18px 18px 4px 18px;
  }

  /* Assistant messages */
  &[data-role='assistant'] {
    --chat-message-bg: var(--chat-color-surface);
    --chat-message-text: var(--chat-color-text);
    border-radius: 18px 18px 18px 4px;
  }
}
```

### Input Area

```css
/* Custom input styling */
.chat-input-container {
  background: linear-gradient(to bottom, transparent, var(--chat-color-background));
  backdrop-filter: blur(10px);
}

.chat-input {
  border-radius: 24px;
  border: 2px solid transparent;
  transition: border-color var(--chat-transition-fast);

  &:focus {
    border-color: var(--chat-color-primary);
    box-shadow: 0 0 0 3px rgba(var(--chat-color-primary-rgb), 0.1);
  }
}
```

### Animations

```css
/* Message entrance animation */
@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chat-message {
  animation: messageSlideIn var(--chat-transition-normal) ease-out;
}

/* Typing indicator */
.chat-typing-indicator span {
  animation: typing 1.4s infinite;

  &:nth-child(2) {
    animation-delay: 0.2s;
  }

  &:nth-child(3) {
    animation-delay: 0.4s;
  }
}

@keyframes typing {
  0%,
  60%,
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  30% {
    transform: scale(1);
    opacity: 1;
  }
}
```

## Fluent UI Integration

Since A2A Chat uses Fluent UI v9, you can leverage Fluent's theming system:

```tsx
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  createLightTheme,
  createDarkTheme,
} from '@fluentui/react-components';
import { ChatWidget } from '@microsoft/a2achat-core/react';

// Custom brand colors
const myBrandRamp = {
  10: '#020305',
  20: '#111723',
  30: '#16263D',
  40: '#193253',
  50: '#1B3F6A',
  60: '#1B4C82',
  70: '#18599B',
  80: '#1267B4',
  90: '#0075CE',
  100: '#0084E8',
  110: '#2194FA',
  120: '#4AA3FF',
  130: '#6AB2FF',
  140: '#87C1FF',
  150: '#A1CFFF',
  160: '#BADEFF',
};

const myLightTheme = createLightTheme(myBrandRamp);
const myDarkTheme = createDarkTheme(myBrandRamp);

function FluentThemedChat() {
  return (
    <FluentProvider theme={myLightTheme}>
      <ChatWidget agentCard="..." />
    </FluentProvider>
  );
}
```

## Best Practices

1. **Consistency**: Maintain consistent color usage across your application
2. **Accessibility**: Ensure sufficient color contrast (WCAG AA minimum)
3. **Performance**: Use CSS variables for runtime theme switching
4. **Responsive**: Test themes on different screen sizes
5. **Fallbacks**: Provide sensible defaults for optional theme values

## Theme Testing

Test your theme with different scenarios:

```tsx
// Theme tester component
function ThemeTester({ theme }) {
  return (
    <ChatThemeProvider theme={theme}>
      <div className="theme-test-grid">
        {/* Test different states */}
        <ChatWidget agentCard="..." />

        {/* Error state */}
        <div className="error-state">Error message preview</div>

        {/* Loading state */}
        <div className="loading-state">
          <TypingIndicator />
        </div>

        {/* All color swatches */}
        <ColorPalette theme={theme} />
      </div>
    </ChatThemeProvider>
  );
}
```

## Next Steps

- [Custom Plugins](./plugins) - Extend functionality
- [Component Customization](./components) - Override default components
- [CSS Modules](./css-modules) - Advanced styling techniques
- [Examples](../examples/custom-ui) - See theming in action
