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
    // Configure marked with syntax highlighting
    marked.use(
      markedHighlight({
        langPrefix: 'hljs language-',
        highlight(code, lang) {
          if (!lang) return code;
          return `<pre><code class="language-${lang}">${code}</code></pre>`;
        }
      })
    );

    marked.setOptions({
      gfm: true,
      breaks: true
    });

    // Process the content and handle both sync/async cases
    const processContent = async () => {
      try {
        // First unescape any HTML entities in the markdown
        let processedContent = content.replace(/&([^;]+);/g, (match, entity) => {
          const textarea = document.createElement("textarea");
          textarea.innerHTML = match;
          return textarea.value;
        });

        // Parse the markdown
        let result = await Promise.resolve(marked.parse(processedContent));

        // Wrap code blocks in details elements with proper language summary
        result = result.replace(
          /<pre><code class="language-([^"]+)">([\s\S]*?)<\/code><\/pre>/g,
          function (match, lang, code) {
            // Extract filename if present (e.g., example.py -> py)
            const [language, ...filenameParts] = lang.split('.');
            const filename = filenameParts.join('.');
            
            // Special case for terminal-commands
            if (language === "terminal-commands") {
              return `<pre><code class="language-bash">${code}</code></pre>`;
            }

            // If we have a filename, use it in the summary
            const summary = filename || language;
            return `<details>
              <summary>${summary}</summary>
              <div>
                <pre><code class="language-${language}">${code}</code></pre>
              </div>
            </details>`;
          }
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