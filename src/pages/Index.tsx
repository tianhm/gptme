import { useState } from "react";
import MenuBar from "@/components/MenuBar";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";

const initialMessages = [
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
];

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
  const [messages, setMessages] = useState(initialMessages);
  const [selectedConversation, setSelectedConversation] = useState<string | null>("1");

  const handleSend = (message: string) => {
    setMessages([
      ...messages,
      { id: Date.now().toString(), isBot: false, content: message },
    ]);
  };

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
            {messages.map((msg) => (
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