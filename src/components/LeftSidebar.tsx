import { PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConversationList from "./ConversationList";

interface Props {
  isOpen: boolean;
  onToggle: () => void;
}

export default function LeftSidebar({ isOpen, onToggle }: Props) {
  return (
    <div
      className={`border-r transition-all duration-300 ${
        isOpen ? "w-80" : "w-0"
      } overflow-hidden`}
    >
      <div className="h-12 border-b flex items-center justify-between px-4">
        <h2 className="font-semibold">Conversations</h2>
        <Button variant="ghost" size="icon" onClick={onToggle}>
          <PanelLeftOpen className="h-5 w-5" />
        </Button>
      </div>
      <ConversationList />
    </div>
  );
}