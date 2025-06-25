# A2A Chat Demo

This directory contains two demo applications showcasing the @microsoft/a2achat library with A2A protocol integration.

## Overview

1. **Chat Demo** (`index.html`) - Interactive demo with theme customization and agent configuration
2. **iframe Integration Demo** (`iframe.html`) - Shows how to embed the chat widget in other applications

## Running the Demo

```bash
npm install
npm run demo
```

The demo will open in your browser at http://localhost:5173/demo/

## Chat Demo Features

### 1. Agent Card Configuration
Configure your A2A agent in two ways:

**Custom URL Mode** (default):
- Enter the URL of your A2A-compliant agent
- The system will fetch the agent card from the provided URL

**Hardcoded JSON Mode**:
- Toggle "Use Hardcoded Agent Card"
- Enter the full agent card JSON configuration
- Useful for testing or when the agent doesn't serve its own card

### 2. Real-time Streaming
Experience real-time message streaming with SSE-enabled agents. The UI shows typing indicators and streams responses character by character.

### 3. Theme Customization
Switch between 8 pre-configured themes instantly:
- Default (Purple gradient)
- Blue
- Green  
- Red
- Purple
- Teal
- Orange
- Pink

### 4. File Upload Support
Upload files directly in the chat:
- Supports images (JPEG, PNG, GIF, WebP)
- Documents (PDF, TXT, MD)
- Code files (JS, TS, JSON, etc.)

### 5. Connection Status
Visual indicators show:
- Connecting state
- Connection errors
- Successful connections

## Example Agent Configuration

### Using a URL:
```
https://copilot-backend-agents.azurewebsites.net/hackernews
```

### Using JSON Configuration:
```json
{
  "name": "Hacker News Agent",
  "description": "Get the latest from Hacker News",
  "conversationStarters": [
    { "text": "What's trending on HN today?" },
    { "text": "Show me the top stories" }
  ]
}
```

## URL Parameters

### Chat Demo
Access the demo with pre-configured settings:

```
# With agent URL
http://localhost:5173/demo/?agentCard=https://your-agent.example.com

# For embedded mode (hides configuration UI)
http://localhost:5173/demo/?agentCard=https://your-agent.example.com&embedded=true
```

### iframe Integration Demo
The iframe demo supports both URL-based and PostMessage configuration:

```
# URL-based configuration
http://localhost:5173/demo/iframe.html?agentCard=https://your-agent.example.com

# PostMessage configuration (see iframe.html source)
```

## iframe Integration

The `iframe.html` file demonstrates how to embed the chat widget in your application:

1. **URL-based Integration**: Pass the agent configuration via URL parameters
2. **PostMessage Integration**: Configure the agent dynamically using postMessage API

### Example Integration:
```html
<iframe 
  src="http://localhost:5173/demo/?agentCard=YOUR_AGENT_URL&embedded=true"
  width="100%" 
  height="600"
/>
```

For advanced integration with framework examples, see the source code in `iframe.html`.

## Development

### File Structure
```
demo/
├── index.html      # Main chat demo UI
├── app.tsx         # React application logic
├── iframe.html     # iframe integration demo
└── README.md       # This file
```

### Key Components
- `app.tsx` - Main application with theme management and agent configuration
- `../src/components/ChatWindow` - Core chat component
- `../src/store/chatStore` - State management using Zustand
- `../src/a2aclient` - A2A protocol client implementation

### Building

```bash
# Development mode with hot reload
npm run dev

# Build library for production
npm run build:lib

# Build library for development
npm run build:lib:dev

# Build and watch for changes
npm run build:lib:watch
```

## Agent Card Specification

Your A2A agent should serve an agent card at its root URL with the following structure:

```typescript
interface AgentCard {
  name: string;
  description: string;
  conversationStarters?: Array<{
    text: string;
  }>;
  capabilities?: {
    streaming?: boolean;
    fileUpload?: boolean;
  };
}
```

## Security Considerations

When embedding the chat widget:
- Ensure your agent URL uses HTTPS
- Configure appropriate CORS headers on your agent
- Validate agent responses on your backend
- Consider implementing authentication if needed

## Troubleshooting

### CORS Issues
If you encounter CORS errors:
1. Ensure your agent includes proper CORS headers
2. Check that your agent URL is accessible from the browser
3. Try using a proxy for development

### Connection Errors
- Verify the agent URL is correct and accessible
- Check browser console for detailed error messages
- Ensure the agent implements the A2A protocol correctly

### Theme Not Applying
- Clear browser cache
- Check for CSS conflicts with parent applications
- Verify theme object structure matches expected format