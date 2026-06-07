import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAppData } from './fetchAppData.js';
import { EMPTY_APP_DATA } from './appDataDefaults.js';
import { getAppDataQueryKey } from './appDataQuery.js';
import { hasLiveFieldTelemetry } from '../../../lib/telemetry.js';

export function useAppQueries({ user, activeTab }) {
  const queryClient = useQueryClient();
  const queryKey = getAppDataQueryKey(user, activeTab);

  const { data = EMPTY_APP_DATA } = useQuery({
    queryKey,
    queryFn: () => {
      if (!user) return EMPTY_APP_DATA;
      const prev = queryClient.getQueryData(queryKey) ?? EMPTY_APP_DATA;
      return fetchAppData(user, activeTab, prev);
    },
    enabled: !!user,
    refetchInterval: 4000,
    placeholderData: (prev) => prev ?? EMPTY_APP_DATA,
  });

  const hasFieldTelemetry = useMemo(
    () => hasLiveFieldTelemetry(data.telemetry, data.sensors),
    [data.telemetry, data.sensors],
  );

  return {
    ...data,
    hasFieldTelemetry,
  };
}
