import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { EMPTY_APP_DATA } from './appDataDefaults.js';

export const APP_DATA_QUERY_KEY = 'appData';

export function getAppDataQueryKey(user, activeTab) {
  return [APP_DATA_QUERY_KEY, user?.userId ?? null, user?.userType ?? null, activeTab];
}

export function useInvalidateAppData() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [APP_DATA_QUERY_KEY] });
  }, [queryClient]);
}

export function usePatchAppData(user, activeTab) {
  const queryClient = useQueryClient();
  return useCallback((patch) => {
    queryClient.setQueryData(getAppDataQueryKey(user, activeTab), (old) => ({
      ...EMPTY_APP_DATA,
      ...old,
      ...patch,
    }));
  }, [queryClient, user, activeTab]);
}
