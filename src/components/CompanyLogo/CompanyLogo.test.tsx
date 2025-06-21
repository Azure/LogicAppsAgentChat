import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompanyLogo } from '.';
import { useTheme } from '../../hooks/useTheme';
import styles from './CompanyLogo.module.css';

vi.mock('../../hooks/useTheme');

describe('CompanyLogo', () => {
  const mockUseTheme = vi.mocked(useTheme);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when logoUrl is not provided', () => {
    mockUseTheme.mockReturnValue({
      name: 'default',
      colors: {
        primary: '#000',
        background: '#fff',
        text: '#000',
        messageBubbleUser: '#000',
        messageBubbleAssistant: '#000',
      },
      branding: undefined,
    });

    const { container } = render(<CompanyLogo />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when branding exists but logoUrl is empty', () => {
    mockUseTheme.mockReturnValue({
      name: 'default',
      colors: {
        primary: '#000',
        background: '#fff',
        text: '#000',
        messageBubbleUser: '#000',
        messageBubbleAssistant: '#000',
      },
      branding: {
        logoUrl: '',
        logoSize: 'medium',
      },
    });

    const { container } = render(<CompanyLogo />);
    expect(container.firstChild).toBeNull();
  });

  it('renders logo with medium size by default', () => {
    mockUseTheme.mockReturnValue({
      name: 'default',
      colors: {
        primary: '#000',
        background: '#fff',
        text: '#000',
        messageBubbleUser: '#000',
        messageBubbleAssistant: '#000',
      },
      branding: {
        logoUrl: 'https://example.com/logo.png',
      },
    });

    render(<CompanyLogo />);
    
    const logo = screen.getByAltText('Company Logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', 'https://example.com/logo.png');
    
    const container = logo.closest('div');
    expect(container).toHaveClass(styles.logoContainer);
    expect(container).toHaveClass(styles.medium);
  });

  it('renders logo with small size', () => {
    mockUseTheme.mockReturnValue({
      name: 'default',
      colors: {
        primary: '#000',
        background: '#fff',
        text: '#000',
        messageBubbleUser: '#000',
        messageBubbleAssistant: '#000',
      },
      branding: {
        logoUrl: 'https://example.com/logo.png',
        logoSize: 'small',
      },
    });

    render(<CompanyLogo />);
    
    const logo = screen.getByAltText('Company Logo');
    const container = logo.closest('div');
    expect(container).toHaveClass(styles.logoContainer);
    expect(container).toHaveClass(styles.small);
    expect(container).not.toHaveClass(styles.medium);
  });

  it('renders logo with large size', () => {
    mockUseTheme.mockReturnValue({
      name: 'default',
      colors: {
        primary: '#000',
        background: '#fff',
        text: '#000',
        messageBubbleUser: '#000',
        messageBubbleAssistant: '#000',
      },
      branding: {
        logoUrl: 'https://example.com/logo.png',
        logoSize: 'large',
      },
    });

    render(<CompanyLogo />);
    
    const logo = screen.getByAltText('Company Logo');
    const container = logo.closest('div');
    expect(container).toHaveClass(styles.logoContainer);
    expect(container).toHaveClass(styles.large);
    expect(container).not.toHaveClass(styles.medium);
  });

  it('applies custom className prop', () => {
    mockUseTheme.mockReturnValue({
      name: 'default',
      colors: {
        primary: '#000',
        background: '#fff',
        text: '#000',
        messageBubbleUser: '#000',
        messageBubbleAssistant: '#000',
      },
      branding: {
        logoUrl: 'https://example.com/logo.png',
        logoSize: 'medium',
      },
    });

    render(<CompanyLogo className="custom-class" />);
    
    const logo = screen.getByAltText('Company Logo');
    const container = logo.closest('div');
    expect(container).toHaveClass(styles.logoContainer);
    expect(container).toHaveClass(styles.medium);
    expect(container).toHaveClass('custom-class');
  });

  it('renders img element with correct attributes', () => {
    const logoUrl = 'https://example.com/company-logo.svg';
    mockUseTheme.mockReturnValue({
      name: 'default',
      colors: {
        primary: '#000',
        background: '#fff',
        text: '#000',
        messageBubbleUser: '#000',
        messageBubbleAssistant: '#000',
      },
      branding: {
        logoUrl,
        logoSize: 'medium',
      },
    });

    render(<CompanyLogo />);
    
    const logo = screen.getByAltText('Company Logo');
    expect(logo).toHaveAttribute('src', logoUrl);
    expect(logo).toHaveClass(styles.logo);
  });

  it('handles undefined logoSize gracefully', () => {
    mockUseTheme.mockReturnValue({
      name: 'default',
      colors: {
        primary: '#000',
        background: '#fff',
        text: '#000',
        messageBubbleUser: '#000',
        messageBubbleAssistant: '#000',
      },
      branding: {
        logoUrl: 'https://example.com/logo.png',
        logoSize: undefined,
      },
    });

    render(<CompanyLogo />);
    
    const logo = screen.getByAltText('Company Logo');
    const container = logo.closest('div');
    expect(container).toHaveClass(styles.medium);
  });
});