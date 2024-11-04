import { Bot, User } from "lucide-react";
import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import { useEffect, useState } from "react";
import hljs from 'highlight.js';

interface Props {
  isBot: boolean;
  content: string;
}

export default function ChatMessage({ isBot, content }: Props) {
  const [parsedContent, setParsedContent] = useState("");

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