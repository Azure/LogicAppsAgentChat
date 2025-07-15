import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthenticationMessage } from '../AuthenticationMessage';
import type { AuthPart } from '../../../types';

describe('AuthenticationMessage', () => {
  const mockAuthParts: AuthPart[] = [
    {
      serviceName: 'External Service',
      consentLink: 'https://example.com/auth',
      description: 'This action requires authentication with an external service.',
    },
  ];

  it('should display pending state correctly', () => {
    render(
      <AuthenticationMessage authParts={mockAuthParts} status="pending" onAuthenticate={vi.fn()} />
    );

    expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    expect(screen.getByText('External Service')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.queryByText('Authenticated')).not.toBeInTheDocument();
  });

  it('should display completed state correctly', () => {
    render(
      <AuthenticationMessage
        authParts={mockAuthParts}
        status="completed"
        onAuthenticate={vi.fn()}
      />
    );

    expect(screen.getByText('Authentication Completed')).toBeInTheDocument();
    expect(screen.getByText('External Service')).toBeInTheDocument();
    expect(screen.getByText('Authenticated')).toBeInTheDocument();
    expect(screen.getByText('All services authenticated successfully')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign In' })).not.toBeInTheDocument();
  });

  it('should display failed state correctly', () => {
    render(
      <AuthenticationMessage authParts={mockAuthParts} status="failed" onAuthenticate={vi.fn()} />
    );

    expect(screen.getByText('Authentication Failed')).toBeInTheDocument();
    // Failed state doesn't show additional text, just the title and auth parts
  });

  it('should initialize auth states correctly based on status', () => {
    const { rerender } = render(
      <AuthenticationMessage authParts={mockAuthParts} status="pending" onAuthenticate={vi.fn()} />
    );

    // Initially pending
    expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();

    // Rerender with completed status
    rerender(
      <AuthenticationMessage
        authParts={mockAuthParts}
        status="completed"
        onAuthenticate={vi.fn()}
      />
    );

    // Should now show completed state
    expect(screen.getByText('Authentication Completed')).toBeInTheDocument();
    expect(screen.getByText('Authenticated')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign In' })).not.toBeInTheDocument();
  });
});
