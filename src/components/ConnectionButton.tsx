import { useState } from "react";
import type { FC } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Network, Check, X } from "lucide-react";
import { useApi } from "@/contexts/ApiContext";
import { cn } from "@/lib/utils";

export const ConnectionButton: FC = () => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000');
  const { toast } = useToast();
  const api = useApi();

  const features = [
    "Create new conversations",
    "Access conversation history",
    "Generate AI responses",
    "Use custom models",
    "Save conversations locally"
  ];

  const handleConnect = async () => {
    try {
      const result = await api.checkConnection();
      
      if (result) {
        api.setBaseUrl(url);
        toast({
          title: "Connected",
          description: "Successfully connected to gptme instance",
        });
        setOpen(false);
      } else {
        throw new Error("Connection check failed - server may not be responding correctly");
      }
    } catch (error) {
      let errorMessage = "Could not connect to gptme instance.";
      if (error instanceof Error) {
        if (error.message.includes('NetworkError') || error.message.includes('CORS')) {
          errorMessage += " CORS issue detected - ensure the server has CORS enabled and is accepting requests from " + window.location.origin;
        } else {
          errorMessage += " Error: " + error.message;
        }
      }
      
      toast({
        variant: "destructive",
        title: "Connection failed",
        description: errorMessage,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className={api.isConnected ? "text-green-600" : "text-muted-foreground"}
        >
          <Network className="w-4 h-4 mr-2" />
          {api.isConnected ? "Connected" : "Connect"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect to gptme</DialogTitle>
          <DialogDescription>
            Connect to a gptme instance to enable advanced features and AI interactions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="url" className="text-sm font-medium">Server URL</label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://127.0.0.1:5000"
            />
          </div>
          
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Features enabled by connecting:</h4>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm">
                  {api.isConnected ? (
                    <Check className="w-4 h-4 mr-2 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 mr-2 text-gray-400" />
                  )}
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <Button 
            onClick={handleConnect} 
            className={cn(
              "w-full",
              api.isConnected && "bg-green-600 hover:bg-green-700"
            )}
          >
            {api.isConnected ? "Reconnect" : "Connect"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};