# A2A Chat Documentation

This is the official documentation site for A2A Chat, built with [DocuSaurus 3](https://docusaurus.io/).

## 📚 Documentation Structure

- **Getting Started** - Installation, quick start guide, and core concepts
- **Usage Guide** - Detailed guides for different integration approaches
- **API Reference** - Complete API documentation for all exports
- **Examples** - Working examples and code snippets
- **Advanced** - Streaming, authentication, and advanced features
- **Customization** - Theming, plugins, and component customization
- **Deployment** - Production deployment and integration guides

## 🚀 Development

### Prerequisites

- Node.js >= 18
- pnpm >= 8

### Running Locally

```bash
# From the monorepo root
pnpm docs:dev

# Or from this directory
pnpm start
```

The site will be available at http://localhost:3000

### Building for Production

```bash
# From the monorepo root
pnpm docs:build

# Or from this directory
pnpm build
```

The static files will be generated in the `build` directory.

## 📝 Writing Documentation

### Adding a New Page

1. Create a new `.md` or `.mdx` file in the appropriate directory under `docs/`
2. Add frontmatter at the top:

```markdown
---
sidebar_position: 1
title: Your Page Title
---

# Your Page Title

Your content here...
```

3. Update `sidebars.ts` if needed to include your new page

### Using MDX Features

You can use React components in MDX files:

````mdx
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="npm" label="npm" default>

```bash
npm install @microsoft/a2achat-core
```
````

  </TabItem>
  <TabItem value="yarn" label="yarn">

```bash
yarn add @microsoft/a2achat-core
```

  </TabItem>
</Tabs>
```

### Code Blocks

Use triple backticks with language specification for syntax highlighting:

````markdown
```typescript
import { A2AClient } from '@microsoft/a2achat-core';

const client = new A2AClient({
  agentCard: 'https://api.example.com/.well-known/agent-card.json',
});
```
````

## 🎨 Customization

### Theme Configuration

Edit `docusaurus.config.ts` to customize:

- Site metadata
- Navigation bar
- Footer
- Color scheme
- Social cards

### Custom CSS

Add custom styles in `src/css/custom.css`.

### Custom Components

Create React components in `src/components/` and use them in MDX files.

## 🚢 Deployment

### GitHub Pages

```bash
GIT_USER=<Your GitHub username> USE_SSH=true pnpm deploy
```

### Vercel

1. Import the repository on Vercel
2. Set the root directory to `apps/docs-site`
3. Set build command to `pnpm build`
4. Set output directory to `build`

### Netlify

1. Create a new site from Git
2. Set base directory to `apps/docs-site`
3. Set build command to `pnpm build`
4. Set publish directory to `apps/docs-site/build`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `pnpm start`
5. Build and verify with `pnpm build`
6. Submit a pull request

### Documentation Style Guide

- Use present tense
- Be concise and clear
- Include code examples
- Test all code snippets
- Check for broken links

## 📄 License

This documentation is part of the A2A Chat project and follows the same license terms.
