import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseIframeConfig } from '../config-parser';

// Mock window.LOGGED_IN_USER_NAME
declare global {
  interface Window {
    LOGGED_IN_USER_NAME?: string;
  }
}

describe('config-parser', () => {
  beforeEach(() => {
    // Reset window.location
    delete (window as any).location;
    (window as any).location = new URL('http://localhost:3000/iframe');

    // Clear dataset properties
    Object.keys(document.documentElement.dataset).forEach((key) => {
      delete document.documentElement.dataset[key];
    });

    // Clear global vars
    window.LOGGED_IN_USER_NAME = undefined;
  });

  describe('parseIframeConfig', () => {
    it('should parse basic configuration from URL params', () => {
      (window as any).location = new URL(
        'http://localhost:3000/iframe?agentCard=https://api.example.com/agent.json&apiKey=test-key'
      );

      const config = parseIframeConfig();

      expect(config.props.agentCard).toBe('https://api.example.com/agent.json');
      expect(config.apiKey).toBe('test-key');
      expect(config.multiSession).toBe(true);
      expect(config.mode).toBe('light');
      expect(config.inPortal).toBe(false);
    });

    it('should parse configuration from data attributes', () => {
      document.documentElement.dataset.agentCard = 'https://data.example.com/agent.json';
      document.documentElement.dataset.apiKey = 'data-key';
      document.documentElement.dataset.userId = 'user123';
      document.documentElement.dataset.userName = 'John Doe';

      const config = parseIframeConfig();

      expect(config.props.agentCard).toBe('https://data.example.com/agent.json');
      expect(config.props.apiKey).toBe('data-key');
      expect(config.props.userId).toBe('user123');
      expect(config.props.userName).toBe('John Doe');
    });

    it('should transform iframe URL pattern to agent card URL', () => {
      (window as any).location = new URL('http://localhost:3000/api/agentsChat/MyAgent/IFrame');

      const config = parseIframeConfig();

      expect(config.props.agentCard).toBe(
        'http://localhost:3000/api/agents/MyAgent/.well-known/agent.json'
      );
    });

    it('should parse theme configuration', () => {
      (window as any).location = new URL('http://localhost:3000/iframe?agentCard=test&theme=blue');

      const config = parseIframeConfig();

      expect(config.props.theme?.colors?.primary).toBe('#2563eb');
      expect(config.props.theme?.colors?.background).toBe('#ffffff');
    });

    it('should parse custom theme colors from data attributes', () => {
      document.documentElement.dataset.agentCard = 'test';
      document.documentElement.dataset.themePrimary = '#ff0000';
      document.documentElement.dataset.themeBackground = '#00ff00';

      const config = parseIframeConfig();

      expect(config.props.theme?.colors?.primary).toBe('#ff0000');
      expect(config.props.theme?.colors?.background).toBe('#00ff00');
    });

    it('should parse branding configuration', () => {
      (window as any).location = new URL(
        'http://localhost:3000/iframe?agentCard=test&logoUrl=https://example.com/logo.png&logoSize=large&logoPosition=footer'
      );

      const config = parseIframeConfig();

      expect(config.props.theme?.branding?.logoUrl).toBe('https://example.com/logo.png');
      expect(config.props.theme?.branding?.logoSize).toBe('large');
      expect(config.props.theme?.branding?.logoPosition).toBe('footer');
    });

    it('should parse file upload configuration', () => {
      document.documentElement.dataset.agentCard = 'test';
      document.documentElement.dataset.allowFileUpload = 'true';
      document.documentElement.dataset.maxFileSize = '10485760';
      document.documentElement.dataset.allowedFileTypes = '.pdf,.doc,.docx';

      const config = parseIframeConfig();

      expect(config.props.allowFileUpload).toBe(true);
      expect(config.props.maxFileSize).toBe(10485760);
      expect(config.props.allowedFileTypes).toEqual(['.pdf', '.doc', '.docx']);
    });

    it('should parse metadata JSON', () => {
      const metadata = { foo: 'bar', count: 123 };
      (window as any).location = new URL(
        `http://localhost:3000/iframe?agentCard=test&metadata=${encodeURIComponent(JSON.stringify(metadata))}`
      );

      const config = parseIframeConfig();

      expect(config.props.metadata).toEqual(metadata);
    });

    it('should handle portal configuration', () => {
      (window as any).location = new URL(
        'http://localhost:3000/iframe?agentCard=test&inPortal=true&trustedAuthority=https://portal.azure.com'
      );

      const config = parseIframeConfig();

      expect(config.inPortal).toBe(true);
      expect(config.trustedParentOrigin).toBe('https://portal.azure.com');
    });

    it('should throw error for untrusted portal authority', () => {
      (window as any).location = new URL(
        'http://localhost:3000/iframe?agentCard=test&inPortal=true&trustedAuthority=https://untrusted.com'
      );

      expect(() => parseIframeConfig()).toThrow(
        "The origin 'untrusted.com' is not trusted for Frame Blade."
      );
    });

    it('should handle single-session mode', () => {
      (window as any).location = new URL(
        'http://localhost:3000/iframe?agentCard=test&singleSession=true'
      );

      const config = parseIframeConfig();

      expect(config.multiSession).toBe(false);
    });

    it('should handle dark mode', () => {
      (window as any).location = new URL('http://localhost:3000/iframe?agentCard=test&mode=dark');

      const config = parseIframeConfig();

      expect(config.mode).toBe('dark');
    });

    it('should use global LOGGED_IN_USER_NAME if available', () => {
      window.LOGGED_IN_USER_NAME = 'GlobalUser';
      (window as any).location = new URL('http://localhost:3000/iframe?agentCard=test');

      const config = parseIframeConfig();

      expect(config.props.userName).toBe('GlobalUser');
    });

    it('should throw error when agent card is missing and URL pattern does not match', () => {
      (window as any).location = new URL('http://localhost:3000/random-path');

      expect(() => parseIframeConfig()).toThrow(
        'data-agent-card is required or URL must follow /api/agentsChat/{AgentKind}/IFrame pattern'
      );
    });
  });
});
