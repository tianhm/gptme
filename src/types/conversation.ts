export interface Conversation {
  name: string;
  lastUpdated: Date;
  messageCount: number;
  readonly?: boolean;
}
