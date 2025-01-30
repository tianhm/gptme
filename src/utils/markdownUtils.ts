import { marked } from "marked";
import hljs from "highlight.js";
import { markedHighlight } from "marked-highlight";
import type { Link } from "marked";

marked.use(markedHighlight({
    highlight: (code, lang) => {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(code, { language: lang }).value;
            } catch (err) {
                console.error("Error highlighting code:", err);
            }
        }
        return code; // Use the original code if language isn't found
    }
}));

const renderer = new marked.Renderer();

// Store the original link renderer
const originalLinkRenderer = renderer.link.bind(renderer);

// Customize the link renderer to add icons
renderer.link = ({ href, title, text }: Link) => {
    if (!href) return text;
    
    const linkHtml = originalLinkRenderer({ href, title, text });
    
    let iconSvg = '';
    
    if (href.includes('github.com')) {
        // GitHub icon
        iconSvg = '<svg class="inline-block ml-1 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>';
    } else if (href.includes('wikipedia.org')) {
        // Simple "W" icon for Wikipedia
        iconSvg = '<span class="inline-flex items-center justify-center ml-1 w-4 h-4 text-xs font-bold bg-gray-200 dark:bg-gray-700 rounded-full">W</span>';
    } else {
        // Generic external link icon for other links
        iconSvg = '<svg class="inline-block ml-1 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>';
    }
    
    // Insert the icon after the link
    return linkHtml.slice(0, -4) + iconSvg + '</a>';
};

export function processNestedCodeBlocks(content: string): { processedContent: string; langtags: string[] } {
    const langtags: string[] = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    let lastIndex = 0;
    let processedContent = '';

    while ((match = codeBlockRegex.exec(content)) !== null) {
        const [fullMatch, lang] = match;
        if (lang) langtags.push(lang);
        processedContent += content.slice(lastIndex, match.index) + fullMatch;
        lastIndex = match.index + fullMatch.length;
    }

    processedContent += content.slice(lastIndex);
    return { processedContent, langtags };
}

export function transformThinkingTags(content: string): string {
    return content.replace(
        /<thinking>([\s\S]*?)<\/thinking>/g,
        '<details><summary>💭 Thinking</summary>\n\n$1\n\n</details>'
    );
}

export function parseMarkdownContent(content: string): string {
    const transformedContent = transformThinkingTags(content);
    return marked(transformedContent, { renderer });
}