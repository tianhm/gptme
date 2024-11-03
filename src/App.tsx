import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ApiProvider } from "./contexts/ApiContext";
import Index from "./pages/Index";

const queryClient = new QueryClient();

const App = () => {
  // You can configure this based on environment variables or user settings
  const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider baseUrl={apiUrl}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ApiProvider>
    </QueryClientProvider>
  );
};

export default App;