# A2A Chat Demo

This demo showcases the @microsoft/a2achat library with A2A protocol integration.

## Running the Demo

```bash
npm install
npm run demo
```

The demo will open in your browser at http://localhost:3000/demo/

## Features Demonstrated

1. **A2A Agent Connection**: Connect to any A2A-compliant agent by entering its URL
2. **Real-time Streaming**: Experience real-time message streaming with SSE-enabled agents
3. **Theme Customization**: Switch between 8 pre-configured themes
4. **User Identification**: Optionally set a user ID for the chat session
5. **File Upload Support**: Upload files in the chat (note: A2A file support coming soon)

## Example Agents

The demo includes some example agent URLs you can try:

- **Hacker News Agent**: `https://copilot-backend-agents.azurewebsites.net/hackernews`
  - Provides information about Hacker News stories and discussions

## Using Your Own Agent

To use your own A2A agent:

1. Enter your agent's URL in the "A2A Agent URL" field
2. (Optional) Enter a user ID
3. Click "Connect to Agent"

Your agent must be A2A protocol compliant and accessible from your browser (CORS enabled).

## URL Parameters

You can also pass the agent URL as a query parameter:

```
http://localhost:3000/demo/?agent=https://your-agent.example.com
```

## Themes

The demo includes 8 built-in themes:
- Default (Purple gradient)
- Blue
- Green
- Red
- Purple
- Teal
- Orange
- Pink

Click any theme color to instantly switch the chat appearance.

## Development

The demo source code is in:
- `demo/index.html` - Demo UI and layout
- `demo/app.tsx` - React application logic
- `src/components/ChatWindow` - The main chat component

## Building for Production

To build the library for production use:

```bash
npm run build:lib
```

This creates optimized bundles in the `dist/lib` directory.