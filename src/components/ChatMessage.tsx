import { Bot, User } from "lucide-react";

interface Props {
  isBot: boolean;
  content: string;
}

export default function ChatMessage({ isBot, content }: Props) {
  return (
    <div className={`py-8 ${isBot ? "bg-accent/50" : ""}`}>
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-start space-x-4">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isBot ? "bg-gptme-600 text-white" : "bg-blue-600 text-white"
            }`}
          >
            {isBot ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
          </div>
          <div className="flex-1 chat-message prose prose-sm dark:prose-invert">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}