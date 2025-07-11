import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompanyLogo } from './CompanyLogo';
import styles from './CompanyLogo.module.css';
import type { ChatTheme } from '../../types';

describe('CompanyLogo', () => {
  it('renders nothing when branding is not provided', () => {
    const { container } = render(<CompanyLogo />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when branding exists but logoUrl is empty', () => {
    const branding: ChatTheme['branding'] = {
      logoUrl: '',
      logoSize: 'medium',
    };

    const { container } = render(<CompanyLogo branding={branding} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders logo with medium size by default', () => {
    const branding: ChatTheme['branding'] = {
      logoUrl: 'https://example.com/logo.png',
    };

    render(<CompanyLogo branding={branding} />);

    const logo = screen.getByAltText('Company Logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', 'https://example.com/logo.png');

    const container = logo.closest('div');
    expect(container).toHaveClass(styles.logoContainer);
    expect(container).toHaveClass(styles.medium);
  });

  it('renders logo with small size', () => {
    const branding: ChatTheme['branding'] = {
      logoUrl: 'https://example.com/logo.png',
      logoSize: 'small',
    };

    render(<CompanyLogo branding={branding} />);

    const logo = screen.getByAltText('Company Logo');
    const container = logo.closest('div');
    expect(container).toHaveClass(styles.logoContainer);
    expect(container).toHaveClass(styles.small);
    expect(container).not.toHaveClass(styles.medium);
  });

  it('renders logo with large size', () => {
    const branding: ChatTheme['branding'] = {
      logoUrl: 'https://example.com/logo.png',
      logoSize: 'large',
    };

    render(<CompanyLogo branding={branding} />);

    const logo = screen.getByAltText('Company Logo');
    const container = logo.closest('div');
    expect(container).toHaveClass(styles.logoContainer);
    expect(container).toHaveClass(styles.large);
    expect(container).not.toHaveClass(styles.medium);
  });

  it('applies custom className prop', () => {
    const branding: ChatTheme['branding'] = {
      logoUrl: 'https://example.com/logo.png',
      logoSize: 'medium',
    };

    render(<CompanyLogo branding={branding} className="custom-class" />);

    const logo = screen.getByAltText('Company Logo');
    const container = logo.closest('div');
    expect(container).toHaveClass(styles.logoContainer);
    expect(container).toHaveClass(styles.medium);
    expect(container).toHaveClass('custom-class');
  });

  it('renders img element with correct attributes', () => {
    const logoUrl = 'https://example.com/company-logo.svg';
    const branding: ChatTheme['branding'] = {
      logoUrl,
      logoSize: 'medium',
    };

    render(<CompanyLogo branding={branding} />);

    const logo = screen.getByAltText('Company Logo');
    expect(logo).toHaveAttribute('src', logoUrl);
    expect(logo).toHaveClass(styles.logo);
  });

  it('handles undefined logoSize gracefully', () => {
    const branding: ChatTheme['branding'] = {
      logoUrl: 'https://example.com/logo.png',
      logoSize: undefined,
    };

    render(<CompanyLogo branding={branding} />);

    const logo = screen.getByAltText('Company Logo');
    const container = logo.closest('div');
    expect(container).toHaveClass(styles.medium);
  });

  it('handles logo position in branding', () => {
    const branding: ChatTheme['branding'] = {
      logoUrl: 'https://example.com/logo.png',
      logoSize: 'medium',
      logoPosition: 'header',
    };

    render(<CompanyLogo branding={branding} />);

    const logo = screen.getByAltText('Company Logo');
    expect(logo).toBeInTheDocument();
    // logoPosition doesn't affect rendering in this component
  });
});
