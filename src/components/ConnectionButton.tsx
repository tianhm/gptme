import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Network } from "lucide-react";
import { useApi } from "@/contexts/ApiContext";

export default function ConnectionButton() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000');
  const { toast } = useToast();
  const api = useApi();

  const handleConnect = async () => {
    try {
      await api.checkConnection();
      if (api.isConnected) {
        api.setBaseUrl(url);
        toast({
          title: "Connected",
          description: "Successfully connected to gptme instance",
        });
        setOpen(false);
      } else {
        throw new Error("Failed to connect");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Connection failed",
        description: "Could not connect to gptme instance. Make sure CORS is enabled on the server.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className={api.isConnected ? "text-gptme-600" : "text-muted-foreground"}
        >
          <Network className="w-4 h-4 mr-2" />
          {api.isConnected ? "Connected" : "Connect"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect to gptme</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="url" className="text-sm font-medium">Server URL</label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://127.0.0.1:5000"
            />
          </div>
          <Button onClick={handleConnect} className="w-full">
            Connect
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};