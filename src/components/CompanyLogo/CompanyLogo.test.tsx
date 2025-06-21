import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompanyLogo } from '.';
import { useTheme } from '../../hooks/useTheme';
import styles from './CompanyLogo.module.css';

vi.mock('../../hooks/useTheme');

describe('CompanyLogo', () => {
  const mockUseTheme = vi.mocked(useTheme);

  interface Branding {
    logoUrl?: string;
    logoSize?: 'small' | 'medium' | 'large';
  }

  const createMockTheme = (branding?: Branding) => ({
    colors: {
      primary: '#000',
      primaryText: '#fff',
      background: '#fff',
      surface: '#f0f0f0',
      text: '#000',
      textSecondary: '#666',
      border: '#ddd',
      error: '#ff0000',
      success: '#00ff00'
    },
    typography: {
      fontFamily: 'sans-serif',
      fontSize: {
        small: '0.875rem',
        base: '1rem',
        large: '1.125rem'
      }
    },
    spacing: {
      unit: 8
    },
    borderRadius: {
      small: '4px',
      medium: '8px',
      large: '12px'
    },
    branding
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when logoUrl is not provided', () => {
    mockUseTheme.mockReturnValue(createMockTheme(undefined));

    const { container } = render(<CompanyLogo />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when branding exists but logoUrl is empty', () => {
    mockUseTheme.mockReturnValue(createMockTheme({
      logoUrl: '',
      logoSize: 'medium',
    }));

    const { container } = render(<CompanyLogo />);
    expect(container.firstChild).toBeNull();
  });

  it('renders logo with medium size by default', () => {
    mockUseTheme.mockReturnValue(createMockTheme({
        logoUrl: 'https://example.com/logo.png',
    }));

    render(<CompanyLogo />);
    
    const logo = screen.getByAltText('Company Logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', 'https://example.com/logo.png');
    
    const container = logo.closest('div');
    expect(container).toHaveClass(styles.logoContainer);
    expect(container).toHaveClass(styles.medium);
  });

  it('renders logo with small size', () => {
    mockUseTheme.mockReturnValue(createMockTheme({
        logoUrl: 'https://example.com/logo.png',
        logoSize: 'small',
    }));

    render(<CompanyLogo />);
    
    const logo = screen.getByAltText('Company Logo');
    const container = logo.closest('div');
    expect(container).toHaveClass(styles.logoContainer);
    expect(container).toHaveClass(styles.small);
    expect(container).not.toHaveClass(styles.medium);
  });

  it('renders logo with large size', () => {
    mockUseTheme.mockReturnValue(createMockTheme({
        logoUrl: 'https://example.com/logo.png',
        logoSize: 'large',
    }));

    render(<CompanyLogo />);
    
    const logo = screen.getByAltText('Company Logo');
    const container = logo.closest('div');
    expect(container).toHaveClass(styles.logoContainer);
    expect(container).toHaveClass(styles.large);
    expect(container).not.toHaveClass(styles.medium);
  });

  it('applies custom className prop', () => {
    mockUseTheme.mockReturnValue(createMockTheme({
        logoUrl: 'https://example.com/logo.png',
        logoSize: 'medium',
    }));

    render(<CompanyLogo className="custom-class" />);
    
    const logo = screen.getByAltText('Company Logo');
    const container = logo.closest('div');
    expect(container).toHaveClass(styles.logoContainer);
    expect(container).toHaveClass(styles.medium);
    expect(container).toHaveClass('custom-class');
  });

  it('renders img element with correct attributes', () => {
    const logoUrl = 'https://example.com/company-logo.svg';
    mockUseTheme.mockReturnValue(createMockTheme({
        logoUrl,
        logoSize: 'medium',
    }));

    render(<CompanyLogo />);
    
    const logo = screen.getByAltText('Company Logo');
    expect(logo).toHaveAttribute('src', logoUrl);
    expect(logo).toHaveClass(styles.logo);
  });

  it('handles undefined logoSize gracefully', () => {
    mockUseTheme.mockReturnValue(createMockTheme({
        logoUrl: 'https://example.com/logo.png',
        logoSize: undefined,
    }));

    render(<CompanyLogo />);
    
    const logo = screen.getByAltText('Company Logo');
    const container = logo.closest('div');
    expect(container).toHaveClass(styles.medium);
  });
});