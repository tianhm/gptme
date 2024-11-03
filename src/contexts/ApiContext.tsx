import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';
import { createApiClient, ApiClient } from '../utils/api';

interface ApiContextType {
  baseUrl: string;
  isConnected: boolean;
  setBaseUrl: (url: string) => Promise<void>;
  checkConnection: () => Promise<boolean>;
  getConversations: () => Promise<any[]>;
  getConversation: (logfile: string) => Promise<any[]>;
  createConversation: (logfile: string, messages: any[]) => Promise<any>;
  sendMessage: (logfile: string, message: any) => Promise<any>;
  generateResponse: (logfile: string, model?: string) => Promise<any>;
}

const ApiContext = createContext<ApiContextType | null>(null);

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

  useEffect(() => {
    client.checkConnection();
  }, [client]);

  return (
    <ApiContext.Provider value={{
      baseUrl: client.baseUrl,
      isConnected: client.isConnected,
      setBaseUrl,
      checkConnection: client.checkConnection.bind(client),
      getConversations: client.getConversations.bind(client),
      getConversation: client.getConversation.bind(client),
      createConversation: client.createConversation.bind(client),
      sendMessage: client.sendMessage.bind(client),
      generateResponse: client.generateResponse.bind(client),
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