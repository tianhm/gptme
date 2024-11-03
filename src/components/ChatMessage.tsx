import { Bot, User } from "lucide-react";
import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import { useEffect, useState } from "react";

interface Props {
  isBot: boolean;
  content: string;
}

export default function ChatMessage({ isBot, content }: Props) {
  const [parsedContent, setParsedContent] = useState("");

  useEffect(() => {
    // Configure marked with syntax highlighting and custom renderer
    marked.use(
      markedHighlight({
        langPrefix: 'hljs language-',
        highlight(code, lang) {
          // Extract filename if present (e.g., ```example.py)
          const [language, ...filenameParts] = lang.split('.');
          const filename = filenameParts.join('.');
          
          // If we have a filename, wrap the code in a details element
          if (filename) {
            return `<details>
              <summary>${filename}</summary>
              <div>
                <pre><code class="language-${language}">${code}</code></pre>
              </div>
            </details>`;
          }
          
          return `<pre><code class="language-${lang}">${code}</code></pre>`;
        }
      })
    );

    marked.setOptions({
      gfm: true,
      breaks: true
    });

    // Process the content
    const processed = marked(content);
    setParsedContent(processed);
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