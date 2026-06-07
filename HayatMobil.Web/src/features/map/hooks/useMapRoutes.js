import { useCallback, useEffect, useState } from 'react';
import { elementRouteMeta } from '../../../lib/routing.js';
import {
  loadManualRouteTarget,
  saveManualRouteTarget,
} from '../../../lib/mapPersistence.js';
import { useDispatchRoute } from './useDispatchRoute.js';
import { useManualRoute } from './useManualRoute.js';

/** Panel ve harita sekmesi arasında paylaşılan rota durumu */
export function useMapRoutes({ user, userLocation, tickets }) {
  const [manualRouteTarget, setManualRouteTarget] = useState(() => (
    user?.userId ? loadManualRouteTarget(user.userId) : null
  ));

  useEffect(() => {
    if (!user?.userId) {
      setManualRouteTarget(null);
      return;
    }
    const stored = loadManualRouteTarget(user.userId);
    setManualRouteTarget(stored);
  }, [user?.userId]);

  useEffect(() => {
    if (!user?.userId) return;
    saveManualRouteTarget(user.userId, manualRouteTarget);
  }, [user?.userId, manualRouteTarget]);

  const { route: dispatchRoute, loading: dispatchRouteLoading } = useDispatchRoute({
    tickets,
    user,
    userLocation,
  });
  const dispatchActive = !!dispatchRoute;

  const { route: manualRoute, loading: manualRouteLoading } = useManualRoute({
    target: manualRouteTarget,
    user,
    userLocation,
    enabled: !dispatchActive,
  });

  const activeMapRoute = dispatchRoute ?? manualRoute;
  const mapRouteLoading = dispatchRouteLoading || (!dispatchActive && manualRouteLoading);

  const createRouteFromSelection = useCallback((selectedElement) => {
    const meta = selectedElement ? elementRouteMeta(selectedElement) : null;
    if (meta) setManualRouteTarget(meta);
  }, []);

  const clearManualRoute = useCallback(() => {
    setManualRouteTarget(null);
  }, []);

  const routeToElement = useCallback((selectedElement) => {
    const meta = selectedElement ? elementRouteMeta(selectedElement) : null;
    if (meta) setManualRouteTarget(meta);
  }, []);

  return {
    manualRouteTarget,
    setManualRouteTarget,
    routeToElement,
    activeMapRoute,
    mapRouteLoading,
    mapDispatchActive: dispatchActive,
    createRouteFromSelection,
    clearManualRoute,
  };
}
