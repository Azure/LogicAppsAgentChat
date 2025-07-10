import { useTheme } from '../../hooks/useTheme';
import styles from './CompanyLogo.module.css';

interface CompanyLogoProps {
  className?: string;
}

export function CompanyLogo({ className }: CompanyLogoProps) {
  const theme = useTheme();

  if (!theme.branding?.logoUrl) {
    return null;
  }

  const sizeClasses = {
    small: styles.small,
    medium: styles.medium,
    large: styles.large,
  };

  const sizeClass = sizeClasses[theme.branding.logoSize || 'medium'];

  return (
    <div className={`${styles.logoContainer} ${sizeClass} ${className || ''}`}>
      <img src={theme.branding.logoUrl} alt="Company Logo" className={styles.logo} />
    </div>
  );
}
