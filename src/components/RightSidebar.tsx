import { PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  isOpen: boolean;
  onToggle: () => void;
}

export default function RightSidebar({ isOpen, onToggle }: Props) {
  return (
    <div
      className={`border-l transition-all duration-300 ${
        isOpen ? "w-80" : "w-0"
      } overflow-hidden`}
    >
      <div className="h-12 border-b flex items-center justify-between px-4">
        <h2 className="font-semibold">Details</h2>
        <Button variant="ghost" size="icon" onClick={onToggle}>
          <PanelRightOpen className="h-5 w-5" />
        </Button>
      </div>
      <div className="p-4">
        <div className="text-sm text-muted-foreground">
          Select a file or tool to view details
        </div>
      </div>
    </div>
  );
}