import { Bot, User } from "lucide-react";
import { marked } from "marked";
import { useEffect, useState } from "react";

interface Props {
  isBot: boolean;
  content: string;
}

export default function ChatMessage({ isBot, content }: Props) {
  const [parsedContent, setParsedContent] = useState("");

  useEffect(() => {
    // Configure marked to sanitize HTML and enable GFM (GitHub Flavored Markdown)
    marked.setOptions({
      gfm: true,
      breaks: true,
      sanitize: false, // We need this false to allow HTML tags like <details>
    });

    setParsedContent(marked(content));
  }, [content]);

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
          <div 
            className="flex-1 chat-message prose prose-sm dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: parsedContent }}
          />
        </div>
      </div>
    </div>
  );
}