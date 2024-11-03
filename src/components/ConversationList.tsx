import { Clock, MessageSquare } from "lucide-react";

interface Conversation {
  id: string;
  name: string;
  lastUpdated: string;
  messageCount: number;
}

const conversations: Conversation[] = [
  {
    id: "1",
    name: "Project Setup",
    lastUpdated: "2 hours ago",
    messageCount: 12,
  },
  {
    id: "2",
    name: "Debug Session",
    lastUpdated: "Yesterday",
    messageCount: 8,
  },
  {
    id: "3",
    name: "File Operations",
    lastUpdated: "3 days ago",
    messageCount: 15,
  },
];

export default function ConversationList() {
  return (
    <div className="space-y-2 p-4">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className="p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
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