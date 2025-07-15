# Microsoft Fluent UI v9 Migration Guide

This document outlines the migration of A2A Chat components to use Microsoft's Fluent UI v9 component library.

## Overview

The A2A Chat library has been updated to use Microsoft Fluent UI v9 components, providing:

- Consistent Microsoft design language
- Better accessibility out of the box
- Advanced theming capabilities
- Improved performance
- Type-safe component APIs

## Key Changes

### 1. Component Updates

All major components have been migrated to use Fluent UI v9:

- **Message Component**: Now uses Fluent UI's `Card`, `Button`, `Text`, and icon components
- **MessageInput Component**: Uses Fluent UI's `Textarea`, `Button`, and `Badge` components
- **ChatWidget**: Wrapped with `FluentProvider` for theme support

### 2. New Theme System

The library now supports Fluent UI v9's powerful theming system:

```typescript
// Basic usage with default themes
<ChatWidget
  agentCard="agent.json"
  fluentTheme="light" // or "dark"
/>

// Custom brand color
<ChatWidget
  agentCard="agent.json"
  themeConfig={{
    primaryColor: '#007bff'
  }}
/>

// Advanced theme customization
<ChatWidget
  agentCard="agent.json"
  themeConfig={{
    primaryColor: '#007bff',
    lightThemeOverrides: {
      colorNeutralBackground1: '#f8f9fa'
    },
    darkThemeOverrides: {
      colorNeutralBackground1: '#1a1a1a'
    }
  }}
/>
```

### 3. Using the Theme Provider Directly

For advanced use cases, you can use the theme provider directly:

```typescript
import { ChatThemeProvider, ChatWindow } from '@microsoft/a2achat-core/react';
import { webLightTheme } from '@fluentui/react-components';

function App() {
  return (
    <ChatThemeProvider customTheme={webLightTheme}>
      <ChatWindow agentCard="agent.json" />
    </ChatThemeProvider>
  );
}
```

## Benefits

### 1. Consistent Design Language

All components now follow Microsoft's Fluent design system, ensuring consistency with other Microsoft products like Teams, Office, and Azure.

### 2. Improved Accessibility

Fluent UI v9 components come with built-in accessibility features:

- ARIA labels and roles
- Keyboard navigation
- Screen reader support
- High contrast mode support

### 3. Better Performance

- Smaller bundle sizes with tree-shaking
- CSS-in-JS with runtime optimization
- Efficient re-rendering

### 4. Enhanced Customization

The new theme system allows for:

- Easy light/dark mode switching
- Custom brand colors that automatically generate color palettes
- Fine-grained control over individual design tokens
- Type-safe theme customization

## Migration Steps for Existing Applications

### 1. Update Dependencies

The Fluent UI dependencies are included with the library, so just update to the latest version:

```bash
npm install @microsoft/a2achat-core@latest
```

### 2. Update Theme Props

If you were using the old theme system:

```typescript
// Old
<ChatWidget
  theme={{
    primaryColor: '#007bff',
    fontFamily: 'Arial'
  }}
/>

// New
<ChatWidget
  themeConfig={{
    primaryColor: '#007bff'
  }}
/>
```

### 3. Custom Styling

Custom CSS classes still work, but consider using Fluent UI's styling system for better integration:

```typescript
import { makeStyles } from '@fluentui/react-components';

const useStyles = makeStyles({
  customContainer: {
    backgroundColor: tokens.colorNeutralBackground1,
    padding: tokens.spacingHorizontalM,
  },
});
```

## Examples

See the `fluent-theme-example.html` file in the `apps/iframe-app` directory for working examples of different theme configurations.

## Backward Compatibility

The library maintains backward compatibility with the existing API. The old `theme` prop is still supported and will be converted to the new theme system automatically.

## Future Enhancements

- Support for custom Fluent UI theme tokens
- Integration with Microsoft Teams themes
- Additional Fluent UI components for enhanced functionality
