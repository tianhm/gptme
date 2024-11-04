import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useApi } from "@/contexts/ApiContext";
import type { Message } from "@/types/message";
import { useToast } from "@/components/ui/use-toast";

interface ConversationResponse {
  log: Message[];
  logfile: string;
  branches?: Record<string, Message[]>;
}

interface UseConversationResult {
  conversationData: ConversationResponse | undefined;
  sendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  isSending: boolean;
}

export function useConversation(conversationId: string): UseConversationResult {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Cancel any pending queries when conversation changes
  useEffect(() => {
    return () => {
      queryClient.cancelQueries({ queryKey: ['conversation', conversationId] });
    };
  }, [conversationId, queryClient]);

  const { data: conversationData, isLoading, isFetching } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async ({ signal }) => {
      if (conversationId.startsWith('demo-')) {
        return { log: [], logfile: '' };
      }
      const response = await api.getConversation(conversationId);
      if (signal.aborted) {
        throw new Error('Query was cancelled');
      }
      if (!response || typeof response !== 'object' || !('log' in response) || !('logfile' in response)) {
        throw new Error('Invalid conversation data received');
      }
      return response as ConversationResponse;
    },
    enabled: api.isConnected && conversationId && !conversationId.startsWith('demo-'),
    staleTime: 30000, // Increase stale time to 30 seconds
    gcTime: 10 * 60 * 1000, // Increase cache time to 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { mutateAsync: sendMessage, isPending: isSending } = useMutation({
    mutationFn: async (message: string) => {
      // First, send the user's message
      await api.sendMessage(conversationId, { role: 'user', content: message });
      
      // Then, generate the AI's response
      await api.generateResponse(conversationId);
      
      // Finally, invalidate the conversation query to fetch the updated messages
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message or generate response",
      });
      console.error('Error sending message:', error);
    },
  });

  // Combine loading states to show loading indicator during initial load, background updates, and message sending
  const isLoadingState = isLoading || isFetching || isSending;

  return {
    conversationData,
    sendMessage,
    isLoading: isLoadingState,
    isSending,
  };
}