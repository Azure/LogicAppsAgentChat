import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import type { ChatWidgetProps } from '../types';

// Mock dependencies
vi.mock('react-dom/client');
vi.mock('../components/ChatWindow', () => ({
  ChatWindow: vi.fn((props: ChatWidgetProps) => null),
}));
vi.mock('../styles/base.css', () => ({}));

// We need to test the module initialization logic
describe('iframe', () => {
  let mockCreateRoot: ReturnType<typeof vi.fn>;
  let mockRoot: { render: ReturnType<typeof vi.fn> };
  let originalDocumentElement: HTMLElement;
  let originalLocation: Location;
  let originalReadyState: string;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  
  beforeEach(() => {
    // Clear module cache to allow re-importing
    vi.resetModules();
    
    // Mock createRoot
    mockRoot = { render: vi.fn() };
    mockCreateRoot = vi.fn().mockReturnValue(mockRoot);
    vi.mocked(createRoot).mockImplementation(mockCreateRoot);
    
    // Save original values
    originalDocumentElement = document.documentElement;
    originalLocation = window.location;
    originalReadyState = document.readyState;
    
    // Create a mock document element with dataset
    const mockDocumentElement = document.createElement('html');
    Object.defineProperty(document, 'documentElement', {
      value: mockDocumentElement,
      writable: true,
      configurable: true,
    });
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { search: '' },
      writable: true,
      configurable: true,
    });
    
    // Mock console.error
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Create chat-root element
    document.body.innerHTML = '<div id="chat-root"></div>';
    
    // Mock document.readyState
    Object.defineProperty(document, 'readyState', {
      value: 'complete',
      writable: true,
      configurable: true,
    });
  });
  
  afterEach(() => {
    // Restore original values
    Object.defineProperty(document, 'documentElement', {
      value: originalDocumentElement,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document, 'readyState', {
      value: originalReadyState,
      writable: true,
      configurable: true,
    });
    consoleErrorSpy?.mockRestore();
    vi.clearAllMocks();
  });

  it('initializes with agent URL from data attribute', async () => {
    document.documentElement.dataset.agentUrl = 'http://test.agent';
    
    await import('./iframe');
    
    expect(mockCreateRoot).toHaveBeenCalledWith(document.getElementById('chat-root'));
    expect(mockRoot.render).toHaveBeenCalled();
    
    const renderCall = mockRoot.render.mock.calls[0][0];
    expect(renderCall.props.agentUrl).toBe('http://test.agent');
    expect(renderCall.props.allowFileUpload).toBe(true);
  });

  it('initializes with agent URL from URL parameter', async () => {
    window.location.search = '?agentUrl=http://url.agent';
    
    await import('./iframe');
    
    const renderCall = mockRoot.render.mock.calls[0][0];
    expect(renderCall.props.agentUrl).toBe('http://url.agent');
  });

  it('prefers data attribute over URL parameter for agent URL', async () => {
    document.documentElement.dataset.agentUrl = 'http://data.agent';
    window.location.search = '?agentUrl=http://url.agent';
    
    await import('./iframe');
    
    const renderCall = mockRoot.render.mock.calls[0][0];
    expect(renderCall.props.agentUrl).toBe('http://data.agent');
  });

  it('throws error when agent URL is missing', async () => {
    await import('./iframe');
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to initialize chat widget:',
      expect.any(Error)
    );
    expect(document.body.innerHTML).toContain('Failed to load chat widget');
    expect(document.body.innerHTML).toContain('data-agent-url is required');
  });

  it('parses theme from data attributes', async () => {
    document.documentElement.dataset.agentUrl = 'http://test.agent';
    document.documentElement.dataset.themePrimary = '#ff0000';
    document.documentElement.dataset.themeBackground = '#000000';
    
    await import('./iframe');
    
    const renderCall = mockRoot.render.mock.calls[0][0];
    expect(renderCall.props.theme).toEqual({
      colors: {
        primary: '#ff0000',
        primaryText: '#fff',
        background: '#000000',
        surface: '#fff',
        text: '#222',
        textSecondary: '#666',
        border: '#e0e0e0',
        error: '#d32f2f',
        success: '#388e3c',
      },
    });
  });

  it('parses branding from data attributes', async () => {
    document.documentElement.dataset.agentUrl = 'http://test.agent';
    document.documentElement.dataset.logoUrl = 'http://logo.png';
    document.documentElement.dataset.logoSize = 'large';
    document.documentElement.dataset.logoPosition = 'footer';
    
    await import('./iframe');
    
    const renderCall = mockRoot.render.mock.calls[0][0];
    expect(renderCall.props.theme).toEqual({
      branding: {
        logoUrl: 'http://logo.png',
        logoSize: 'large',
        logoPosition: 'footer',
      },
    });
  });

  it('parses other configuration from data attributes', async () => {
    document.documentElement.dataset.agentUrl = 'http://test.agent';
    document.documentElement.dataset.userId = 'user123';
    document.documentElement.dataset.placeholder = 'Type here...';
    document.documentElement.dataset.welcomeMessage = 'Welcome!';
    document.documentElement.dataset.allowFileUpload = 'false';
    document.documentElement.dataset.maxFileSize = '5242880';
    document.documentElement.dataset.allowedFileTypes = '.pdf, .doc, .txt';
    
    await import('./iframe');
    
    const renderCall = mockRoot.render.mock.calls[0][0];
    expect(renderCall.props.userId).toBe('user123');
    expect(renderCall.props.placeholder).toBe('Type here...');
    expect(renderCall.props.welcomeMessage).toBe('Welcome!');
    expect(renderCall.props.allowFileUpload).toBe(false);
    expect(renderCall.props.maxFileSize).toBe(5242880);
    expect(renderCall.props.allowedFileTypes).toEqual(['.pdf', '.doc', '.txt']);
  });

  it('parses configuration from URL parameters', async () => {
    window.location.search = '?agentUrl=http://test.agent&userId=user456&placeholder=Ask me';
    
    await import('./iframe');
    
    const renderCall = mockRoot.render.mock.calls[0][0];
    expect(renderCall.props.agentUrl).toBe('http://test.agent');
    expect(renderCall.props.userId).toBe('user456');
    expect(renderCall.props.placeholder).toBe('Ask me');
  });

  it('parses valid metadata JSON', async () => {
    document.documentElement.dataset.agentUrl = 'http://test.agent';
    document.documentElement.dataset.metadata = '{"key": "value", "num": 123}';
    
    await import('./iframe');
    
    const renderCall = mockRoot.render.mock.calls[0][0];
    expect(renderCall.props.metadata).toEqual({ key: 'value', num: 123 });
  });

  it('handles invalid metadata JSON gracefully', async () => {
    document.documentElement.dataset.agentUrl = 'http://test.agent';
    document.documentElement.dataset.metadata = 'invalid json';
    
    await import('./iframe');
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to parse metadata:',
      expect.any(Error)
    );
    
    const renderCall = mockRoot.render.mock.calls[0][0];
    expect(renderCall.props.metadata).toBeUndefined();
  });

  it('handles missing chat-root element', async () => {
    document.documentElement.dataset.agentUrl = 'http://test.agent';
    document.body.innerHTML = ''; // Remove chat-root
    
    await import('./iframe');
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to initialize chat widget:',
      expect.any(Error)
    );
    expect(document.body.innerHTML).toContain('Failed to load chat widget');
    expect(document.body.innerHTML).toContain('Chat root element not found');
  });

  it('waits for DOMContentLoaded when document is loading', async () => {
    Object.defineProperty(document, 'readyState', {
      value: 'loading',
      writable: true,
      configurable: true,
    });
    
    document.documentElement.dataset.agentUrl = 'http://test.agent';
    
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    
    await import('./iframe');
    
    expect(addEventListenerSpy).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
    expect(mockCreateRoot).not.toHaveBeenCalled();
    
    // Simulate DOMContentLoaded
    const handler = addEventListenerSpy.mock.calls[0][1] as Function;
    handler();
    
    expect(mockCreateRoot).toHaveBeenCalled();
    expect(mockRoot.render).toHaveBeenCalled();
  });

  it('initializes immediately when document is ready', async () => {
    Object.defineProperty(document, 'readyState', {
      value: 'interactive',
      writable: true,
      configurable: true,
    });
    
    document.documentElement.dataset.agentUrl = 'http://test.agent';
    
    await import('./iframe');
    
    expect(mockCreateRoot).toHaveBeenCalled();
    expect(mockRoot.render).toHaveBeenCalled();
  });

  it('does not include theme when no theme attributes are set', async () => {
    document.documentElement.dataset.agentUrl = 'http://test.agent';
    
    await import('./iframe');
    
    const renderCall = mockRoot.render.mock.calls[0][0];
    expect(renderCall.props.theme).toBeUndefined();
  });

  it('uses default branding values when not specified', async () => {
    document.documentElement.dataset.agentUrl = 'http://test.agent';
    document.documentElement.dataset.logoUrl = 'http://logo.png';
    // logoSize and logoPosition not specified
    
    await import('./iframe');
    
    const renderCall = mockRoot.render.mock.calls[0][0];
    expect(renderCall.props.theme).toEqual({
      branding: {
        logoUrl: 'http://logo.png',
        logoSize: 'medium',
        logoPosition: 'header',
      },
    });
  });

  it('handles allowFileUpload as true by default', async () => {
    document.documentElement.dataset.agentUrl = 'http://test.agent';
    
    await import('./iframe');
    
    const renderCall = mockRoot.render.mock.calls[0][0];
    expect(renderCall.props.allowFileUpload).toBe(true);
  });

  it('handles empty allowedFileTypes string', async () => {
    document.documentElement.dataset.agentUrl = 'http://test.agent';
    document.documentElement.dataset.allowedFileTypes = '';
    
    await import('./iframe');
    
    const renderCall = mockRoot.render.mock.calls[0][0];
    expect(renderCall.props.allowedFileTypes).toEqual(['']);
  });

  it('trims whitespace from allowed file types', async () => {
    document.documentElement.dataset.agentUrl = 'http://test.agent';
    document.documentElement.dataset.allowedFileTypes = ' .pdf , .doc , .txt ';
    
    await import('./iframe');
    
    const renderCall = mockRoot.render.mock.calls[0][0];
    expect(renderCall.props.allowedFileTypes).toEqual(['.pdf', '.doc', '.txt']);
  });

  it('handles error objects without message property', async () => {
    const errorObject = { toString: () => 'Custom error' };
    vi.mocked(createRoot).mockImplementation(() => {
      throw errorObject;
    });
    
    document.documentElement.dataset.agentUrl = 'http://test.agent';
    
    await import('./iframe');
    
    expect(document.body.innerHTML).toContain('Custom error');
  });

  it('handles non-object errors', async () => {
    vi.mocked(createRoot).mockImplementation(() => {
      throw 'String error';
    });
    
    document.documentElement.dataset.agentUrl = 'http://test.agent';
    
    await import('./iframe');
    
    expect(document.body.innerHTML).toContain('String error');
  });
});