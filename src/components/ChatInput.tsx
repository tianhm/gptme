import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useApi } from "@/contexts/ApiContext";

interface Props {
  onSend: (message: string) => void;
  isReadOnly?: boolean;
}

export default function ChatInput({ onSend, isReadOnly }: Props) {
  const [message, setMessage] = useState("");
  const api = useApi();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSend(message);
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const placeholder = isReadOnly 
    ? "This is a demo conversation (read-only)" 
    : api.isConnected 
      ? "Send a message..." 
      : "Connect to gptme to send messages";

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t">
      <div className="max-w-3xl mx-auto flex space-x-4">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[60px]"
          disabled={!api.isConnected || isReadOnly}
        />
        <Button 
          type="submit" 
          className="bg-gptme-600 hover:bg-gptme-700"
          disabled={!api.isConnected || isReadOnly}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}