import clsx from 'clsx';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  icon: string;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Enterprise Ready',
    icon: '🏢',
    description: (
      <>
        Built for scale with Microsoft's enterprise standards. TypeScript-first with comprehensive
        type safety and full API documentation.
      </>
    ),
  },
  {
    title: 'Developer Friendly',
    icon: '⚡',
    description: (
      <>
        Get started in minutes with our intuitive API. Pre-built React components and examples for
        common use cases.
      </>
    ),
  },
  {
    title: 'Real-time Streaming',
    icon: '🔄',
    description: (
      <>
        Powered by Server-Sent Events for smooth, real-time AI responses with progressive rendering
        and low latency.
      </>
    ),
  },
  {
    title: 'Secure by Design',
    icon: '🔒',
    description: (
      <>
        OAuth 2.0, API keys, and custom auth flows built-in. Enterprise-grade security with Azure
        Active Directory integration.
      </>
    ),
  },
  {
    title: 'Fully Extensible',
    icon: '🎨',
    description: (
      <>
        Comprehensive theming system, plugin architecture, and component customization to match your
        brand.
      </>
    ),
  },
  {
    title: 'Production Tested',
    icon: '✅',
    description: (
      <>
        Battle-tested in production environments. Built-in error handling, retry logic, and
        performance optimizations.
      </>
    ),
  },
];

function Feature({ title, icon, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4', styles.featureCol)}>
      <div className={styles.featureCard}>
        <div className={styles.featureIcon}>{icon}</div>
        <h3 className={styles.featureTitle}>{title}</h3>
        <p className={styles.featureDescription}>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
