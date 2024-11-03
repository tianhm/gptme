import { createContext, useContext, ReactNode } from 'react';
import { createApiClient } from '../utils/api';

const ApiContext = createContext<ReturnType<typeof createApiClient> | null>(null);

export const ApiProvider = ({ 
  children, 
  baseUrl 
}: { 
  children: ReactNode;
  baseUrl?: string;
}) => {
  const client = createApiClient(baseUrl);
  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
};

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};