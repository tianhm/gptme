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
  return demoConversations.find((conv) => conv.name === name);
}

export function useConversation(
  conversation: Conversation
): UseConversationResult {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      if (conversation.readonly) {
        const demo = getDemo(conversation.name);
        return {
          log: demo?.messages || [],
          logfile: conversation.name,
          branches: {}
        } as ConversationResponse;
      }

      try {
        const response = await api.getConversation(conversation.name);
        
        if (signal.aborted) {
          throw new Error("Query was cancelled");
        }

        // Transform the response to match ConversationResponse type
        if (Array.isArray(response)) {
          return {
            log: response,
            logfile: conversation.name,
            branches: {}
          } as ConversationResponse;
        }

        // If response is already in correct format, use it directly
        const typedResponse = response as ConversationResponse;
        
        if (!typedResponse?.log || !typedResponse?.logfile) {
          throw new Error("Invalid conversation data received");
        }

        return typedResponse;
      } catch (error) {
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
      await api.sendMessage(conversation.name, {
        role: "user",
        content: message,
      });
      await api.generateResponse(conversation.name);
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

  const isLoadingState = isLoading || isFetching || isSending;

  return {
    conversationData,
    sendMessage,
    isLoading: isLoadingState,
    isSending,
  };
}