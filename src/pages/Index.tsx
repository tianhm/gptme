import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MenuBar from "@/components/MenuBar";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import { useApi } from "@/contexts/ApiContext";
import { Message } from "@/types/message";

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

const demoMessages: Record<string, Message[]> = {
  "demo-1": [
    {
      role: "assistant",
      content: "Hello! I'm gptme, your coding assistant. I can help you set up and manage your Python projects. What kind of project would you like to create?"
    },
    {
      role: "user",
      content: "I want to create a new web scraping project with Python. Can you help me set it up?"
    },
    {
      role: "assistant",
      content: `I'll help you set up a web scraping project. Here's a basic project structure:

\`\`\`
my_scraper/
├── requirements.txt
├── README.md
├── src/
│   ├── __init__.py
│   └── scraper.py
└── tests/
    ├── __init__.py
    └── test_scraper.py
\`\`\`

Let's start with the requirements.txt file:

\`\`\`txt
requests==2.31.0
beautifulsoup4==4.12.2
pytest==7.4.0
\`\`\`

Would you like me to help you implement the scraper.py file next?`
    },
    {
      role: "user",
      content: "Yes, please show me how to implement a basic scraper using BeautifulSoup."
    },
    {
      role: "assistant",
      content: `Here's a basic web scraper implementation:

\`\`\`python
# src/scraper.py
import requests
from bs4 import BeautifulSoup

class WebScraper:
    def __init__(self, base_url):
        self.base_url = base_url
        self.session = requests.Session()
    
    def fetch_page(self, url):
        try:
            response = self.session.get(url)
            response.raise_for_status()
            return response.text
        except requests.RequestException as e:
            print(f"Error fetching {url}: {e}")
            return None
    
    def parse_html(self, html):
        if html is None:
            return None
        return BeautifulSoup(html, 'html.parser')
    
    def scrape_url(self, url):
        html = self.fetch_page(url)
        return self.parse_html(html)
\`\`\`

Would you like me to show you how to write tests for this scraper?`
    }
  ],
  "demo-2": [
    {
      role: "assistant",
      content: "Welcome to the Debug Session! How can I help you debug your code today?",
    },
  ],
  "demo-3": [
    {
      role: "assistant",
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
      ? conversationData.log 
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
            {currentMessages.map((msg, index) => (
              <ChatMessage 
                key={index} 
                message={msg}
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
