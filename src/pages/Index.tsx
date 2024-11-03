import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MenuBar from "@/components/MenuBar";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import { useApi } from "@/contexts/ApiContext";

interface Message {
  role: string;
  content: string;
  timestamp?: string;
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
  const queryClient = useQueryClient();

  // Fetch conversations from API with proper caching
  const { data: apiConversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.getConversations(),
    enabled: api.isConnected,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  // Fetch messages for selected conversation with proper typing and caching
  const { data: conversationData } = useQuery({
    queryKey: ['conversation', selectedConversation],
    queryFn: async () => {
      if (selectedConversation.startsWith('demo-')) {
        return { log: [], logfile: '' };
      }
      const response = await api.getConversation(selectedConversation);
      if (!response || typeof response !== 'object' || !('log' in response) || !('logfile' in response)) {
        throw new Error('Invalid conversation data received');
      }
      return response as ConversationResponse;
    },
    enabled: api.isConnected && selectedConversation && !selectedConversation.startsWith('demo-'),
    staleTime: 1000, // Keep data fresh for 1 second to prevent excessive refetching
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false, // Disable retries on failure
  });

  // Send message mutation
  const { mutate: sendMessage } = useMutation({
    mutationFn: (message: string) => 
      api.sendMessage(selectedConversation, { role: 'user', content: message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', selectedConversation] });
    },
  });

  const handleSend = (message: string) => {
    if (!selectedConversation || selectedConversation.startsWith('demo-')) {
      return;
    }
    sendMessage(message);
  };

  const handleSelectConversation = (id: string) => {
    if (id === selectedConversation) {
      return; // Don't switch if it's the same conversation
    }
    
    setSelectedConversation(id);
    
    if (!id.startsWith('demo-')) {
      // Prefetch the conversation data
      queryClient.prefetchQuery({
        queryKey: ['conversation', id],
        queryFn: async () => {
          const response = await api.getConversation(id);
          if (!response || typeof response !== 'object' || !('log' in response) || !('logfile' in response)) {
            throw new Error('Invalid conversation data received');
          }
          return response as ConversationResponse;
        },
      });
    }
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
          onSelectConversation={handleSelectConversation}
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