import { Terminal } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function MenuBar() {
  return (
    <div className="h-12 border-b flex items-center justify-between px-4">
      <div className="flex items-center space-x-2">
        <Terminal className="w-6 h-6 text-gptme-600" />
        <span className="font-semibold text-lg">gptme</span>
      </div>
      <ThemeToggle />
    </div>
  );
}