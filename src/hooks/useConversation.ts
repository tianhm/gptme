import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/contexts/ApiContext";
import { Message } from "@/types/message";
import { useToast } from "@/components/ui/use-toast";

interface ConversationResponse {
  log: Message[];
  logfile: string;
  branches?: Record<string, Message[]>;
}

export function useConversation(conversationId: string) {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: conversationData } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      if (conversationId.startsWith('demo-')) {
        return { log: [], logfile: '' };
      }
      const response = await api.getConversation(conversationId);
      if (!response || typeof response !== 'object' || !('log' in response) || !('logfile' in response)) {
        throw new Error('Invalid conversation data received');
      }
      return response as ConversationResponse;
    },
    enabled: api.isConnected && conversationId && !conversationId.startsWith('demo-'),
    staleTime: 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const { mutateAsync: sendMessage } = useMutation({
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

  return {
    conversationData,
    sendMessage,
  };
}