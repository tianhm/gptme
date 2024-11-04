import { PanelLeftOpen, PanelLeftClose, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConversationList } from "./ConversationList";
import { useApi } from "@/contexts/ApiContext";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import type { Conversation } from "@/types/conversation";

interface Props {
  isOpen: boolean;
  onToggle: () => void;
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

import type { FC } from "react";

export const LeftSidebar: FC<Props> = ({
  isOpen,
  onToggle,
  conversations,
  selectedConversationId,
  onSelectConversation,
}) => {
  const api = useApi();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleNewConversation = async () => {
    try {
      const newId = Date.now().toString();
      await api.createConversation(newId, []);
      toast({
        title: "New conversation created",
        description: "Starting a fresh conversation",
      });
      navigate(`/?conversation=${newId}`);
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create new conversation",
      });
    }
  };

  return (
    <div className="relative h-full">
      <div
        className={`border-r transition-all duration-300 ${
          isOpen ? "w-80" : "w-0"
        } overflow-hidden h-full`}
      >
        <div className="h-12 border-b flex items-center justify-between px-4">
          <h2 className="font-semibold">Conversations</h2>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewConversation}
              disabled={!api.isConnected}
            >
              <Plus className="w-4 h-4 mr-2" />
              New
            </Button>
            <Button variant="ghost" size="icon" onClick={onToggle}>
              <PanelLeftClose className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversationId}
          onSelect={onSelectConversation}
        />
      </div>
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="absolute top-2 -right-10"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};