import type { Message, Attachment } from '../types';
import type { Part } from '../a2aclient/types';

export function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createMessage(
  content: string,
  sender: 'user' | 'assistant',
  attachments?: Attachment[]
): Message {
  return {
    id: generateMessageId(),
    content,
    sender,
    timestamp: new Date(),
    status: sender === 'user' ? 'sending' : 'sent',
    attachments
  };
}

export function formatPart(part: Part): string {
  switch (part.kind) {
    case 'text':
      return part.text;
    case 'file':
      return `[File: ${part.file.name || 'Unnamed'}]`;
    case 'data':
      return `[Data: ${JSON.stringify(part.data)}]`;
    default:
      return '[Unknown part type]';
  }
}

export function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'jsx': 'javascript',
    'py': 'python',
    'java': 'java',
    'cs': 'csharp',
    'cpp': 'cpp',
    'c': 'c',
    'h': 'c',
    'hpp': 'cpp',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'r': 'r',
    'sql': 'sql',
    'sh': 'bash',
    'bash': 'bash',
    'ps1': 'powershell',
    'yaml': 'yaml',
    'yml': 'yaml',
    'json': 'json',
    'xml': 'xml',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'md': 'markdown'
  };
  return languageMap[ext || ''] || '';
}

export function formatCodeContent(content: string, filename: string): string {
  const language = getLanguageFromFilename(filename);
  if (language) {
    return `\`\`\`${language}\n${content}\n\`\`\``;
  }
  return content;
}

export function createArtifactMessage(artifactName: string, content: string): Message {
  const isCodeFile = /\.(cs|js|ts|py|java|cpp|c|h)$/.test(artifactName);
  const formattedContent = isCodeFile ? formatCodeContent(content, artifactName) : content;
  
  return {
    id: generateMessageId(),
    content: `**${artifactName}**\n\n${formattedContent}`,
    sender: 'assistant',
    timestamp: new Date(),
    status: 'sent',
    metadata: { isArtifact: true, artifactName }
  };
}