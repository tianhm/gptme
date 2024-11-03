import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { createApiClient } from '../utils/api';

const ApiContext = createContext<ReturnType<typeof createApiClient> & {
  setBaseUrl: (url: string) => void;
} | null>(null);

export const ApiProvider = ({ 
  children, 
  baseUrl 
}: { 
  children: ReactNode;
  baseUrl?: string;
}) => {
  const [client, setClient] = useState(() => createApiClient(baseUrl));

  const setBaseUrl = useCallback((url: string) => {
    client.setBaseUrl(url);
    setClient(client);
  }, [client]);

  return (
    <ApiContext.Provider value={{ ...client, setBaseUrl }}>
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