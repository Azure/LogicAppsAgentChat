import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/installation',
        'getting-started/quick-start',
        'getting-started/concepts',
      ],
    },
    {
      type: 'category',
      label: 'Usage Guide',
      items: [
        'usage/client-direct',
        'usage/react-hook',
        'usage/react-components',
        'usage/iframe-widget',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: ['api/client', 'api/react-hooks', 'api/components', 'api/types'],
    },
    {
      type: 'category',
      label: 'Examples',
      items: [
        'examples/basic-chat',
        'examples/custom-ui',
        'examples/multi-session',
        'examples/vue-integration',
      ],
    },
    {
      type: 'category',
      label: 'Advanced',
      items: ['advanced/streaming', 'advanced/authentication'],
    },
    {
      type: 'category',
      label: 'Customization',
      items: ['customization/theming', 'customization/plugins'],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: ['deployment/production', 'deployment/integration'],
    },
  ],
};

export default sidebars;
