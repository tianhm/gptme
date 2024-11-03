import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ApiProvider } from "./contexts/ApiContext";
import Index from "./pages/Index";
import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { createApiClient } from "./utils/api";

const queryClient = new QueryClient();

const AppContent = () => {
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

  useEffect(() => {
    const attemptInitialConnection = async () => {
      const api = createApiClient(apiUrl);
      const connected = await api.checkConnection();
      
      if (connected) {
        toast({
          title: "Connected",
          description: "Successfully connected to gptme instance",
        });
      }
    };

    attemptInitialConnection();
  }, [toast]);

  return (
    <ApiProvider baseUrl={apiUrl}>
      <BrowserRouter>
        <Index />
        <Toaster />
        <Sonner />
      </BrowserRouter>
    </ApiProvider>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;