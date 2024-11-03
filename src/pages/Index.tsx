import { useState } from "react";
import MenuBar from "@/components/MenuBar";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";

const conversationMessages = {
  "1": [
    {
      id: "1",
      isBot: true,
      content: `Hello! I'm gptme, your terminal assistant. I can help you with:

\`\`\`bash.terminal-commands
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
  "2": [
    {
      id: "1",
      isBot: true,
      content: "Welcome to the Debug Session! How can I help you debug your code today?",
    },
  ],
  "3": [
    {
      id: "1",
      isBot: true,
      content: "Let's work on file operations. What would you like to do with your files?",
    },
  ],
};

const conversations = [
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

export default function Index() {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string>("1");
  const [messagesByConversation, setMessagesByConversation] = useState(conversationMessages);

  const handleSend = (message: string) => {
    setMessagesByConversation((prev) => ({
      ...prev,
      [selectedConversation]: [
        ...(prev[selectedConversation] || []),
        { id: Date.now().toString(), isBot: false, content: message },
      ],
    }));
  };

  const currentMessages = messagesByConversation[selectedConversation] || [];

  return (
    <div className="h-screen flex flex-col">
      <MenuBar />
      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar
          isOpen={leftSidebarOpen}
          onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
          conversations={conversations}
          selectedConversationId={selectedConversation}
          onSelectConversation={setSelectedConversation}
        />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {currentMessages.map((msg) => (
              <ChatMessage key={msg.id} isBot={msg.isBot} content={msg.content} />
            ))}
          </div>
          <ChatInput onSend={handleSend} />
        </main>
        <RightSidebar
          isOpen={rightSidebarOpen}
          onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
        />
      </div>
    </div>
  );
}