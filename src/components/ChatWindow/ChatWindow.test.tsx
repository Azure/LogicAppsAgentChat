import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatWindow } from '.';

// Mock dependencies
vi.mock('../MessageList', () => ({
  MessageList: ({ welcomeMessage, agentName }: any) => (
    <div data-testid="message-list">
      {welcomeMessage && <div>{welcomeMessage}</div>}
      <div>Agent: {agentName}</div>
    </div>
  )
}));

vi.mock('../MessageInput', () => ({
  MessageInput: ({ placeholder, disabled, onSendMessage }: any) => (
    <div data-testid="message-input">
      <input 
        placeholder={placeholder} 
        disabled={disabled}
        data-testid="input-field"
      />
      <button onClick={() => onSendMessage('test message')}>Send</button>
    </div>
  )
}));

vi.mock('../CompanyLogo', () => ({
  CompanyLogo: () => <div data-testid="company-logo">Logo</div>
}));

vi.mock('../../hooks/useTheme', () => ({
  useTheme: (theme: any) => ({
    branding: theme?.branding || {}
  })
}));

vi.mock('../../hooks/useChatConnection', () => ({
  useChatConnection: vi.fn()
}));

describe('ChatWindow', () => {
  const mockSendMessage = vi.fn();
  const defaultProps = {
    agentUrl: 'https://agent.example.com',
    theme: {},
    placeholder: 'Type here...',
    welcomeMessage: 'Welcome!'
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { useChatConnection } = vi.mocked(await import('../../hooks/useChatConnection'));
    useChatConnection.mockReturnValue({
      isConnected: true,
      agentName: 'Test Agent',
      sendMessage: mockSendMessage
    });
  });

  it('should render all core components', () => {
    render(<ChatWindow {...defaultProps} />);

    expect(screen.getByTestId('message-list')).toBeInTheDocument();
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
    expect(screen.getByText('Welcome!')).toBeInTheDocument();
    expect(screen.getByText('Agent: Test Agent')).toBeInTheDocument();
  });

  it('should show header logo when configured', () => {
    const props = {
      ...defaultProps,
      theme: {
        branding: {
          logoPosition: 'header' as const
        }
      }
    };

    render(<ChatWindow {...props} />);
    
    const logos = screen.getAllByTestId('company-logo');
    expect(logos).toHaveLength(1);
    expect(logos[0].parentElement?.className).toContain('header');
  });

  it('should show footer logo when configured', () => {
    const props = {
      ...defaultProps,
      theme: {
        branding: {
          logoPosition: 'footer' as const
        }
      }
    };

    render(<ChatWindow {...props} />);
    
    const logos = screen.getAllByTestId('company-logo');
    expect(logos).toHaveLength(1);
    expect(logos[0].parentElement?.className).toContain('footer');
  });

  it('should not show logo when not configured', () => {
    render(<ChatWindow {...defaultProps} />);
    
    expect(screen.queryByTestId('company-logo')).not.toBeInTheDocument();
  });

  it('should pass correct props to MessageInput', () => {
    const props = {
      ...defaultProps,
      allowFileUpload: false,
      maxFileSize: 5000000,
      allowedFileTypes: ['image/*', '.pdf']
    };

    render(<ChatWindow {...props} />);
    
    const input = screen.getByTestId('input-field');
    expect(input).toHaveAttribute('placeholder', 'Type here...');
    expect(input).not.toBeDisabled();
  });

  it('should disable input when not connected', async () => {
    const { useChatConnection } = vi.mocked(await import('../../hooks/useChatConnection'));
    useChatConnection.mockReturnValue({
      isConnected: false,
      agentName: undefined,
      sendMessage: mockSendMessage
    });

    render(<ChatWindow {...defaultProps} />);
    
    const input = screen.getByTestId('input-field');
    expect(input).toBeDisabled();
  });

  it('should use A2A connection with provided agentUrl', async () => {
    const { useChatConnection } = vi.mocked(await import('../../hooks/useChatConnection'));
    
    render(<ChatWindow {...defaultProps} />);
    
    expect(useChatConnection).toHaveBeenCalledWith({
      agentUrl: 'https://agent.example.com',
      onMessage: undefined,
      onConnectionChange: undefined
    });
  });

  it('should use default agent name when not provided', async () => {
    const { useChatConnection } = vi.mocked(await import('../../hooks/useChatConnection'));
    useChatConnection.mockReturnValue({
      isConnected: true,
      agentName: undefined,
      sendMessage: mockSendMessage
    });

    render(<ChatWindow {...defaultProps} />);
    
    expect(screen.getByText('Agent: Assistant')).toBeInTheDocument();
  });

  it('should handle all props correctly', () => {
    const props = {
      agentUrl: 'https://agent.example.com',
      theme: {
        branding: {
          logoPosition: 'header' as const
        }
      },
      onMessage: vi.fn(),
      onConnectionChange: vi.fn(),
      userId: 'user123',
      metadata: { source: 'web' },
      placeholder: 'Custom placeholder',
      welcomeMessage: 'Custom welcome',
      allowFileUpload: true,
      maxFileSize: 10000000,
      allowedFileTypes: ['.jpg', '.png']
    };

    render(<ChatWindow {...props} />);
    
    // Verify the component renders without errors
    expect(screen.getByTestId('message-list')).toBeInTheDocument();
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
  });

  it('should pass callbacks to connection hook', async () => {
    const { useChatConnection } = vi.mocked(await import('../../hooks/useChatConnection'));
    const onMessage = vi.fn();
    const onConnectionChange = vi.fn();
    
    const props = {
      ...defaultProps,
      onMessage,
      onConnectionChange
    };

    render(<ChatWindow {...props} />);
    
    expect(useChatConnection).toHaveBeenCalledWith({
      agentUrl: 'https://agent.example.com',
      onMessage,
      onConnectionChange
    });
  });
});