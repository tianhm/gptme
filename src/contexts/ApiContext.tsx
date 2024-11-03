import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';
import { createApiClient, ApiClient } from '../utils/api';

const ApiContext = createContext<ApiClient & {
  setBaseUrl: (url: string) => void;
} | null>(null);

export const ApiProvider = ({ 
  children, 
  baseUrl 
}: { 
  children: ReactNode;
  baseUrl?: string;
}) => {
  const [client, setClient] = useState<ApiClient>(() => createApiClient(baseUrl));

  const setBaseUrl = useCallback(async (url: string) => {
    const newClient = createApiClient(url);
    await newClient.checkConnection();
    setClient(newClient);
  }, []);

  // Initial connection check
  useEffect(() => {
    client.checkConnection();
  }, [client]);

  return (
    <ApiContext.Provider value={{
      ...client,
      checkConnection: client.checkConnection.bind(client),
      getConversations: client.getConversations.bind(client),
      getConversation: client.getConversation.bind(client),
      createConversation: client.createConversation.bind(client),
      sendMessage: client.sendMessage.bind(client),
      generateResponse: client.generateResponse.bind(client),
      setBaseUrl,
    }}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};