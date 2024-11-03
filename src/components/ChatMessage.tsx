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
    marked.use(
      markedHighlight({
        langPrefix: 'hljs language-',
        highlight(code, lang) {
          const decodedCode = decodeHTMLEntities(code);
          if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(decodedCode, { language: lang }).value;
          }
          return decodedCode;
        }
      })
    );

    marked.setOptions({
      gfm: true,
      breaks: true
    });

    const decodeHTMLEntities = (text: string) => {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = text;
      return textarea.value;
    };

    const processContent = async () => {
      try {
        const decodedContent = decodeHTMLEntities(content);
        let result = await Promise.resolve(marked.parse(decodedContent));

        // Modify the code block wrapping
        result = result.replace(
          /<pre><code class="[^"]*language-([^"]+)">([\s\S]*?)<\/code><\/pre>/g,
          function (match, lang, code) {
            return `<details>
              <summary>${lang}</summary>
              <pre><code class="language-${lang}">${code}</code></pre>
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