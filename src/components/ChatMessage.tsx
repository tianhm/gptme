import { Bot, ChevronRight, User } from "lucide-react";
import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import { useEffect, useState } from "react";
import hljs from 'highlight.js';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";

interface Props {
  isBot: boolean;
  content: string;
  role?: string;
}

export default function ChatMessage({ isBot, content, role }: Props) {
  const [parsedContent, setParsedContent] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const isSystem = role === 'system';

  useEffect(() => {
    // Configure marked with only valid options
    marked.setOptions({
      gfm: true,
      breaks: true,
      silent: true
    });

    marked.use(
      markedHighlight({
        langPrefix: 'hljs language-',
        highlight(code, lang) {
          if (lang && hljs.getLanguage(lang)) {
            try {
              return hljs.highlight(code, { language: lang }).value;
            } catch (err) {
              console.error('Failed to highlight:', err);
              return code;
            }
          }
          return code;
        }
      })
    );

    const processContent = async () => {
      try {
        // Parse markdown to HTML
        let result = await marked.parse(content, { async: true });

        // Wrap code blocks in details/summary
        result = result.replace(
          /<pre><code class="[^"]*language-([^"]+)">([\s\S]*?)<\/code><\/pre>/g,
          (_, lang, code) => `
            <details>
              <summary>${lang}</summary>
              <pre><code class="language-${lang}">${code}</code></pre>
            </details>
          `
        );

        setParsedContent(result);
      } catch (error) {
        console.error('Error parsing markdown:', error);
        setParsedContent(content);
      }
    };

    processContent();
  }, [content]);

  if (isSystem) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="py-4">
        <CollapsibleTrigger className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          <span>Show system message</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 pl-4 border-l-2 border-muted">
            <div className="prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: parsedContent }} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

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