import { Message } from "@/types/message";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import { useConversation } from "@/hooks/useConversation";

interface Props {
  selectedConversation: string;
  demoMessages: Record<string, Message[]>;
}

export default function ConversationContent({ selectedConversation, demoMessages }: Props) {
  const { conversationData, sendMessage } = useConversation(selectedConversation);

  const currentMessages = selectedConversation?.startsWith('demo-')
    ? demoMessages[selectedConversation as keyof typeof demoMessages] || []
    : conversationData?.log 
      ? conversationData.log 
      : [];

  return (
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
        onSend={sendMessage} 
        isReadOnly={!selectedConversation || selectedConversation.startsWith('demo-')}
      />
    </main>
  );
}