export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: string;
  files?: string[];
  pinned?: boolean;
  hide?: boolean;
}