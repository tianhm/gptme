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

<details>
<summary>Terminal Commands</summary>
<div>

\`\`\`bash
ls -la
git status
npm install
\`\`\`

</div>
</details>

<details>
<summary>File Operations</summary>
<div>

\`\`\`python
# example.py
def hello():
    print("Hello, World!")
\`\`\`

</div>
</details>

How can I assist you today?`,
  },
];

export default function Index() {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);

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
        />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                isBot={msg.isBot}
                content={msg.content}
              />
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