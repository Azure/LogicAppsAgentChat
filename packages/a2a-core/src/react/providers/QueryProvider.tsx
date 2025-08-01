import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a stable query client with optimized defaults for chat applications
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Keep data fresh for 5 minutes
        staleTime: 5 * 60 * 1000,
        // Cache for 10 minutes
        gcTime: 10 * 60 * 1000,
        // Retry failed requests up to 3 times
        retry: 3,
        // Don't refetch on window focus for chat data
        refetchOnWindowFocus: false,
        // Keep previous data while fetching new data
        placeholderData: (previousData: any) => previousData,
      },
      mutations: {
        // Retry failed mutations once
        retry: 1,
      },
    },
  });

// Singleton instance
let queryClient: QueryClient | null = null;

export function getQueryClient() {
  if (!queryClient) {
    queryClient = createQueryClient();
  }
  return queryClient;
}

interface A2AQueryProviderProps {
  children: React.ReactNode;
  client?: QueryClient;
}

export function A2AQueryProvider({ children, client }: A2AQueryProviderProps) {
  const queryClientInstance = client || getQueryClient();

  return <QueryClientProvider client={queryClientInstance}>{children}</QueryClientProvider>;
}
