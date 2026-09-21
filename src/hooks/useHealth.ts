import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client.js';

export interface HealthResponse {
  status: 'ok' | 'error';
  db: 'ok' | 'error';
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiClient.get<HealthResponse>('/health'),
    refetchInterval: 30_000,
  });
}
