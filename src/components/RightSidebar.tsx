import { PanelRightOpen, PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  isOpen: boolean;
  onToggle: () => void;
}

import type { FC } from "react";

export const RightSidebar: FC<Props> = ({ isOpen, onToggle }) => {
  return (
    <div className="relative h-full">
      <div
        className={`border-l transition-all duration-300 ${
          isOpen ? "w-80" : "w-0"
        } overflow-hidden h-full`}
      >
        <div className="h-12 border-b flex items-center justify-between px-4">
          <h2 className="font-semibold">Details</h2>
          <Button variant="ghost" size="icon" onClick={onToggle}>
            <PanelRightClose className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-4">
          <div className="text-sm text-muted-foreground">
            Select a file or tool to view details
          </div>
        </div>
      </div>
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="absolute top-2 -left-10"
        >
          <PanelRightOpen className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}