import React from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { ChatWindow } from '../ChatWindow';
import { ChatThemeProvider } from '../ThemeProvider/ThemeProvider';
import type { ChatWidgetProps } from '../../types';
import type { ThemeConfig } from '../../theme/fluentTheme';

const useStyles = makeStyles({
  container: {
    height: '100%',
    width: '100%',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
    boxShadow: tokens.shadow16,
  },
});

/**
 * Main chat widget component that provides a complete chat interface.
 * This is the primary component exported by the library for easy integration
 * into any React application.
 *
 * @example
 * ```tsx
 * import { ChatWidget } from '@microsoft/a2achat-core/react';
 *
 * function App() {
 *   return (
 *     <ChatWidget
 *       agentCard="https://agent.example.com/agent.json"
 *       themeConfig={{
 *         primaryColor: '#007bff',
 *       }}
 *       welcomeMessage="Hello! How can I help you today?"
 *     />
 *   );
 * }
 * ```
 */
export function ChatWidget(
  props: ChatWidgetProps & { themeConfig?: ThemeConfig; fluentTheme?: 'light' | 'dark' }
) {
  const { theme, themeConfig, fluentTheme = 'light', ...restProps } = props;
  const styles = useStyles();

  // For backward compatibility, convert old theme to themeConfig
  const fluentThemeConfig: ThemeConfig | undefined = React.useMemo(() => {
    if (themeConfig) return themeConfig;
    // Legacy theme support - primaryColor might exist on old theme prop
    if (theme && 'primaryColor' in theme && typeof theme.primaryColor === 'string') {
      return {
        primaryColor: theme.primaryColor,
      };
    }
    return undefined;
  }, [theme, themeConfig]);

  // Check if we're in a multi-session context by looking for the parent container
  const isMultiSession =
    typeof window !== 'undefined' && window.location.search.includes('multiSession=true');

  return (
    <ChatThemeProvider theme={fluentTheme} themeConfig={fluentThemeConfig}>
      {isMultiSession ? (
        <ChatWindow {...restProps} theme={theme} />
      ) : (
        <div className={styles.container}>
          <ChatWindow {...restProps} theme={theme} />
        </div>
      )}
    </ChatThemeProvider>
  );
}
