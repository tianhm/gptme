import { Clock, MessageSquare, Lock } from "lucide-react";
import type { Conversation } from "@/types/conversation";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getRelativeTimeString } from "@/utils/time";


interface Props {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

import type { FC } from "react";

export const ConversationList: FC<Props> = ({
  conversations,
  selectedId,
  onSelect,
}) => {
  if (!conversations) {
    return null; // Or a loading state/placeholder
  }

  // strip leading YYYY-MM-DD from name if present
  function stripDate(name: string) {
    const match = name.match(/^\d{4}-\d{2}-\d{2}[- ](.*)/);
    return match ? match[1] : name;
  }

  return (
    <div className="space-y-2 p-4 h-full overflow-y-auto">
      {conversations.map((conv) => (
        <div
          key={conv.name}
          className={`p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors ${
            selectedId === conv.name ? "bg-accent" : ""
          }`}
          onClick={() => onSelect(conv.name)}
        >
          <div className="font-medium mb-1">{stripDate(conv.name)}</div>
          <div className="flex items-center text-sm text-muted-foreground space-x-4">
            <Tooltip>
              <TooltipTrigger>
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {getRelativeTimeString(conv.lastUpdated)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {conv.lastUpdated.toLocaleString()}
              </TooltipContent>
            </Tooltip>
            <span className="flex items-center">
              <MessageSquare className="w-4 h-4 mr-1" />
              {conv.messageCount}
            </span>
            {conv.readonly && (
              <Tooltip>
                <TooltipTrigger>
                  <span className="flex items-center">
                    <Lock className="w-4 h-4" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  This conversation is read-only
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
