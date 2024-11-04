import { Clock, MessageSquare } from "lucide-react";

interface Conversation {
  id: string;
  name: string;
  lastUpdated: string;
  messageCount: number;
}

interface Props {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

import type { FC } from "react";

export const ConversationList: FC<Props> = ({ conversations, selectedId, onSelect }) => {
  if (!conversations) {
    return null; // Or a loading state/placeholder
  }

  return (
    <div className="space-y-2 p-4">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className={`p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors ${
            selectedId === conv.id ? "bg-accent" : ""
          }`}
          onClick={() => onSelect(conv.id)}
        >
          <div className="font-medium mb-1">{conv.name}</div>
          <div className="flex items-center text-sm text-muted-foreground space-x-4">
            <span className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {conv.lastUpdated}
            </span>
            <span className="flex items-center">
              <MessageSquare className="w-4 h-4 mr-1" />
              {conv.messageCount}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}