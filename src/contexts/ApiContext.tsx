import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';
import { createApiClient, ApiClient } from '../utils/api';

interface ApiContextType extends ApiClient {
  setBaseUrl: (url: string) => Promise<void>;
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

  // Initial connection check
  useEffect(() => {
    client.checkConnection();
  }, [client]);

  return (
    <ApiContext.Provider value={{
      ...client,
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