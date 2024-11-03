import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import MenuBar from "@/components/MenuBar";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import { useApi } from "@/contexts/ApiContext";

// Types based on the API response
interface Message {
  role: string;
  content: string;
  timestamp: string;
  files?: string[];
  pinned?: boolean;
  hide?: boolean;
}

interface ConversationResponse {
  log: Message[];
  logfile: string;
  branches?: Record<string, Message[]>;
}

// Demo conversations (read-only)
const demoConversations = [
  {
    id: "demo-1",
    name: "Project Setup",
    lastUpdated: "2 hours ago",
    messageCount: 12,
  },
  {
    id: "demo-2",
    name: "Debug Session",
    lastUpdated: "Yesterday",
    messageCount: 8,
  },
  {
    id: "demo-3",
    name: "File Operations",
    lastUpdated: "3 days ago",
    messageCount: 15,
  },
];

const demoMessages = {
  "demo-1": [
    {
      id: "1",
      isBot: true,
      content: `Hello! I'm gptme, your terminal assistant. I can help you with:

\`\`\`bash
ls -la
git status
npm install
\`\`\`

\`\`\`example.py
# example.py
def hello():
    print("Hello, World!")
\`\`\`

How can I assist you today?`,
    },
  ],
  "demo-2": [
    {
      id: "1",
      isBot: true,
      content: "Welcome to the Debug Session! How can I help you debug your code today?",
    },
  ],
  "demo-3": [
    {
      id: "1",
      isBot: true,
      content: "Let's work on file operations. What would you like to do with your files?",
    },
  ],
};

export default function Index() {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string>("demo-1");
  const api = useApi();

  // Fetch conversations from API with proper caching
  const { data: apiConversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.getConversations(),
    enabled: api.isConnected,
    staleTime: 30000, // Consider data fresh for 30 seconds
    cacheTime: 5 * 60 * 1000, // Keep unused data in cache for 5 minutes
  });

  // Fetch messages for selected conversation with proper typing and caching
  const { data: conversationData } = useQuery<ConversationResponse>({
    queryKey: ['conversation', selectedConversation],
    queryFn: async () => {
      const response = await api.getConversation(selectedConversation);
      return response as ConversationResponse;
    },
    enabled: api.isConnected && selectedConversation && !selectedConversation.startsWith('demo-'),
    staleTime: 5000, // Consider data fresh for 5 seconds
    cacheTime: 5 * 60 * 1000, // Keep unused data in cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  // Send message mutation
  const { mutate: sendMessage } = useMutation({
    mutationFn: (message: string) => 
      api.sendMessage(selectedConversation, { role: 'user', content: message }),
  });

  const handleSend = (message: string) => {
    if (!selectedConversation || selectedConversation.startsWith('demo-')) {
      return;
    }
    sendMessage(message);
  };

  // Combine demo and API conversations
  const allConversations = [
    ...demoConversations,
    ...apiConversations.map((conv: any) => ({
      id: conv.name,
      name: conv.name,
      lastUpdated: new Date(conv.modified * 1000).toLocaleString(),
      messageCount: conv.messages,
    }))
  ];

  // Get current messages based on selected conversation
  const currentMessages = selectedConversation?.startsWith('demo-')
    ? demoMessages[selectedConversation as keyof typeof demoMessages] || []
    : conversationData?.log 
      ? conversationData.log.map((msg: Message, index: number) => ({
          id: `${selectedConversation}-${index}`,
          isBot: msg.role === 'assistant',
          content: msg.content,
        }))
      : [];

  return (
    <div className="h-screen flex flex-col">
      <MenuBar />
      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar
          isOpen={leftSidebarOpen}
          onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
          conversations={allConversations}
          selectedConversationId={selectedConversation}
          onSelectConversation={setSelectedConversation}
        />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {currentMessages.map((msg) => (
              <ChatMessage 
                key={msg.id} 
                isBot={msg.isBot} 
                content={msg.content} 
              />
            ))}
          </div>
          <ChatInput 
            onSend={handleSend} 
            isReadOnly={!selectedConversation || selectedConversation.startsWith('demo-')}
          />
        </main>
        <RightSidebar
          isOpen={rightSidebarOpen}
          onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
        />
      </div>
    </div>
  );
}