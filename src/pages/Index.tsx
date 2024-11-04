import { type FC } from "react";
import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MenuBar } from "@/components/MenuBar";
import { LeftSidebar } from "@/components/LeftSidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { ConversationContent } from "@/components/ConversationContent";
import { useApi } from "@/contexts/ApiContext";
import type { Message } from "@/types/message";

interface ApiConversation {
  name: string;
  modified: number;
  messages: number;
}

interface Props {
  className?: string;
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

const Index: FC<Props> = () => {
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

  // Combine demo and API conversations
  const allConversations = [
    ...demoConversations,
    ...apiConversations.map((conv: ApiConversation) => ({
      id: conv.name,
      name: conv.name,
      lastUpdated: new Date(conv.modified * 1000).toLocaleString(),
      messageCount: conv.messages,
    }))
  ];

  const handleSelectConversation = useCallback((id: string) => {
    if (id === selectedConversation) {
      return;
    }
    // Cancel any pending queries for the previous conversation
    queryClient.cancelQueries({ queryKey: ['conversation', selectedConversation] });
    setSelectedConversation(id);
  }, [selectedConversation, queryClient]);

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
        <ConversationContent
          selectedConversation={selectedConversation}
          demoMessages={demoMessages}
        />
        <RightSidebar
          isOpen={rightSidebarOpen}
          onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
        />
      </div>
    </div>
  );
};

export default Index;
