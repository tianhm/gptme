import type { Message } from "@/types/message";
import type { FC } from "react";
import { useState, useMemo, useEffect } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { useConversation } from "@/hooks/useConversation";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Loader2 } from "lucide-react";

interface Props {
  selectedConversation: string;
  demoMessages: Record<string, Message[]>;
}

export const ConversationContent: FC<Props> = ({ selectedConversation, demoMessages }) => {
  const { conversationData, sendMessage, isLoading, isSending } = useConversation(selectedConversation);
  // Reset state when conversation changes
  const [showInitialSystem, setShowInitialSystem] = useState(false);
  
  // Reset checkbox state when conversation changes
  useEffect(() => {
    setShowInitialSystem(false);
  }, [selectedConversation]);

  // Memoize message processing to prevent unnecessary recalculations
  const { currentMessages, firstNonSystemIndex, hasInitialSystem } = useMemo(() => {
    const messages = selectedConversation?.startsWith('demo-')
      ? demoMessages[selectedConversation as keyof typeof demoMessages] || []
      : conversationData?.log 
        ? conversationData.log 
        : [];
    
    const firstNonSystem = messages.findIndex(msg => msg.role !== 'system');
    const hasInitialSystem = firstNonSystem > 0;
    
    return {
      currentMessages: messages,
      firstNonSystemIndex: firstNonSystem,
      hasInitialSystem
    };
  }, [selectedConversation, demoMessages, conversationData]);


  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      {hasInitialSystem && (
        <div className="flex items-center gap-2 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2 flex-1">
            <Checkbox 
              id="showInitialSystem"
              checked={showInitialSystem}
              onCheckedChange={(checked) => {
                if (!isLoading) {
                  setShowInitialSystem(checked as boolean);
                }
              }}
              disabled={isLoading}
            />
            <Label 
              htmlFor="showInitialSystem" 
              className={`text-sm text-muted-foreground hover:text-foreground ${isLoading ? 'opacity-50' : 'cursor-pointer'}`}
            >
              Show initial system messages
            </Label>
          </div>
          {isLoading && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
      )}
      <div className="flex-1 overflow-y-auto relative">
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {currentMessages.map((msg, index) => {
          const isInitialSystem = msg.role === 'system' && index < firstNonSystemIndex;
          // Only hide initial system messages when checkbox is unchecked
          if (isInitialSystem && !showInitialSystem) {
            return null;
          }
          
          return (
            <ChatMessage 
              key={index} 
              message={msg}
              isInitialSystem={isInitialSystem}
            />
          );
        })}
      </div>
      <ChatInput 
        onSend={sendMessage} 
        isReadOnly={!selectedConversation || selectedConversation.startsWith('demo-')}
        isSending={isSending}
      />
    </main>
  );
}