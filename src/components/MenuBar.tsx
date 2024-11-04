import { Terminal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { ConnectionButton } from "./ConnectionButton";
import { useApi } from "@/contexts/ApiContext";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

import type { FC } from "react";

export const MenuBar: FC = () => {
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
    <div className="h-12 border-b flex items-center justify-between px-4">
      <div className="flex items-center space-x-2">
        <Terminal className="w-6 h-6 text-gptme-600" />
        <span className="font-semibold text-lg">gptme</span>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleNewConversation}
          disabled={!api.isConnected}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Conversation
        </Button>
        <ConnectionButton />
        <ThemeToggle />
      </div>
    </div>
  );
}