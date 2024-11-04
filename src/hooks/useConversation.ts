import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useApi } from "@/contexts/ApiContext";
import type { Message } from "@/types/message";
import { useToast } from "@/components/ui/use-toast";
import { Conversation } from "@/types/conversation";
import { demoConversations } from "@/democonversations";
import type { DemoConversation } from "@/democonversations";

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

function getDemo(name: string): DemoConversation | undefined {
  console.log(name);
  return demoConversations.find((conv) => conv.name === name);
}

export function useConversation(
  conversation: Conversation
): UseConversationResult {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Cancel any pending queries when conversation changes
  useEffect(() => {
    return () => {
      queryClient.cancelQueries({
        queryKey: ["conversation", conversation.name],
      });
    };
  }, [conversation.name, queryClient]);

  const {
    data: conversationData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["conversation", conversation.name, conversation.readonly],
    queryFn: async ({ signal }) => {
      // For readonly conversations, return demo data
      if (conversation.readonly) {
        const demo = getDemo(conversation.name);
        return {
          log: demo?.messages || [],
          logfile: conversation.name,
          branches: {}
        };
      }

      // For API conversations, fetch from server
      try {
        const response = await api.getConversation(conversation.name);
        
        // Handle cancellation
        if (signal.aborted) {
          throw new Error("Query was cancelled");
        }

        // Validate response shape
        if (!response?.log || !response?.logfile) {
          throw new Error("Invalid conversation data received");
        }

        return response as ConversationResponse;
      } catch (error) {
        // Enhance error message
        throw new Error(
          `Failed to fetch conversation: ${(error as Error).message}`
        );
      }
    },
    enabled: Boolean(
      conversation.name && (conversation.readonly || api.isConnected)
    ),
    staleTime: 30000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { mutateAsync: sendMessage, isPending: isSending } = useMutation({
    mutationFn: async (message: string) => {
      // First, send the user's message
      await api.sendMessage(conversation.name, {
        role: "user",
        content: message,
      });

      // Then, generate the AI's response
      await api.generateResponse(conversation.name);

      // Finally, invalidate the conversation query to fetch the updated messages
      queryClient.invalidateQueries({
        queryKey: ["conversation", conversation.name],
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message or generate response",
      });
      console.error("Error sending message:", error);
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
