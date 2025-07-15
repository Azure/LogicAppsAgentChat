import React from 'react';
import { FluentProvider, Theme } from '@fluentui/react-components';
import {
  createCustomTheme,
  ThemeConfig,
  defaultLightTheme,
  defaultDarkTheme,
} from '../../theme/fluentTheme';

export interface ChatThemeProviderProps {
  children: React.ReactNode;
  theme?: 'light' | 'dark';
  themeConfig?: ThemeConfig;
  customTheme?: Theme;
}

export const ChatThemeProvider: React.FC<ChatThemeProviderProps> = ({
  children,
  theme = 'light',
  themeConfig,
  customTheme,
}) => {
  const fluentTheme = React.useMemo(() => {
    if (customTheme) {
      return customTheme;
    }

    if (themeConfig) {
      const { lightTheme, darkTheme } = createCustomTheme(themeConfig);
      return theme === 'dark' ? darkTheme : lightTheme;
    }

    return theme === 'dark' ? defaultDarkTheme : defaultLightTheme;
  }, [theme, themeConfig, customTheme]);

  return <FluentProvider theme={fluentTheme}>{children}</FluentProvider>;
};
