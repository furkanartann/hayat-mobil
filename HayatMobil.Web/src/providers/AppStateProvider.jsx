import { apiFetch } from '../api/client.js';
import ToastStack from '../components/ToastStack.jsx';
import { AppContext } from '../context/AppContext.jsx';
import { useI18nContext } from '../context/I18nContext.jsx';
import { useShellContext } from '../context/ShellContext.jsx';
import { useAuthContext } from '../context/AuthContext.jsx';
import { useNetworkQuality } from '../hooks/useNetworkQuality.js';
import { useAppQueries } from '../features/shared/hooks/useAppQueries.js';
import { useInvalidateAppData, usePatchAppData } from '../features/shared/hooks/appDataQuery.js';
import { useLocation } from '../features/map/hooks/useLocation.js';
import { useMapUi } from '../features/map/hooks/useMapUi.js';
import { useMapRoutes } from '../features/map/hooks/useMapRoutes.js';
import { useDutyRoute } from '../features/map/hooks/useDutyRoute.js';
import { useTicketActions } from '../features/tickets/hooks/useTicketActions.js';
import { useMissingActions } from '../features/missing/hooks/useMissingActions.js';
import { useCivilianLookup } from '../features/missing/hooks/useCivilianLookup.js';
import { useMedicalActions } from '../features/dashboard/hooks/useMedicalActions.js';
import { useInventoryActions } from '../features/inventory/hooks/useInventoryActions.jsx';
import { useAdminActions } from '../features/admin/hooks/useAdminActions.js';

export function AppStateProvider({ children }) {
  const i18n = useI18nContext();
  const shell = useShellContext();
  const auth = useAuthContext();
  const invalidateAppData = useInvalidateAppData();
  const patchAppData = usePatchAppData(auth.user, shell.activeTab);

  const data = useAppQueries({ user: auth.user, activeTab: shell.activeTab });

  const location = useLocation({
    user: auth.user,
    activeTab: shell.activeTab,
    patchAppData,
    invalidateAppData,
    mapLayersMe: data.mapLayers?.me ?? null,
  });

  const civilianLookup = useCivilianLookup({
    user: auth.user,
    userLocation: location.userLocation,
  });

  const admin = useAdminActions({
    user: auth.user,
    t: i18n.t,
    toast: shell.toast,
    networkErrorMsg: i18n.networkErrorMsg,
    readApiError: i18n.readApiError,
    units: data.units,
    invalidateAppData,
    patchAppData,
  });

  const mapRoutes = useMapRoutes({
    user: auth.user,
    userLocation: location.userLocation,
    tickets: data.tickets,
  });

  const mapUi = useMapUi({
    t: i18n.t,
    toast: shell.toast,
    user: auth.user,
    units: data.units,
    tickets: data.tickets,
    setDisasterForm: admin.setDisasterForm,
    setEditDisasterForm: admin.setEditDisasterForm,
    setAssemblyPointForm: admin.setAssemblyPointForm,
    mapPickForZoneId: admin.mapPickForZoneId,
    setMapPickForZoneId: admin.setMapPickForZoneId,
    mapPickMode: admin.mapPickMode,
    setMapPickMode: admin.setMapPickMode,
    mapPickPurpose: admin.mapPickPurpose,
    setMapPickPurpose: admin.setMapPickPurpose,
    setManualRouteTarget: mapRoutes.setManualRouteTarget,
  });

  const dutyRoute = useDutyRoute({
    myActiveDuty: data.myActiveDuty,
    userLocation: location.userLocation,
    user: auth.user,
    units: data.units,
    sensors: data.sensors,
    missingPersons: data.missingPersons,
  });

  const tickets = useTicketActions({
    user: auth.user,
    t: i18n.t,
    toast: shell.toast,
    networkErrorMsg: i18n.networkErrorMsg,
    readApiError: i18n.readApiError,
    genericErrorMsg: i18n.genericErrorMsg,
    invalidateAppData,
  });

  const missing = useMissingActions({
    user: auth.user,
    t: i18n.t,
    toast: shell.toast,
    networkErrorMsg: i18n.networkErrorMsg,
    readApiError: i18n.readApiError,
    userLocation: location.userLocation,
    invalidateAppData,
  });

  const medical = useMedicalActions({
    user: auth.user,
    t: i18n.t,
    toast: shell.toast,
    networkErrorMsg: i18n.networkErrorMsg,
    genericErrorMsg: i18n.genericErrorMsg,
    invalidateAppData,
  });

  const inventory = useInventoryActions({
    user: auth.user,
    t: i18n.t,
    toast: shell.toast,
    networkErrorMsg: i18n.networkErrorMsg,
    tickets: data.tickets,
    inventory: data.inventory,
    staffList: data.staffList,
    invalidateAppData,
    handleUpdateTicketStatus: tickets.handleUpdateTicketStatus,
  });

  const liveNetworkQuality = useNetworkQuality(!!auth.user, apiFetch);
  const displayNetworkQuality = liveNetworkQuality ?? data.runtimeState.networkQuality;
  const displayWeather = location.liveWeather ?? data.runtimeState;
  const weatherLocationSuffix = location.liveWeather?.locationLabel
    ? `, ${location.liveWeather.locationLabel}`
    : '';

  const value = {
    ...i18n,
    ...shell,
    ...auth,
    ...data,
    ...civilianLookup,
    ...location,
    ...mapUi,
    ...mapRoutes,
    dutyRouteEta: dutyRoute.eta,
    dutyRouteLoading: dutyRoute.loading,
    ...tickets,
    ...missing,
    ...medical,
    ...inventory,
    ...admin,
    liveWeather: location.liveWeather,
    liveNetworkQuality,
    displayNetworkQuality,
    displayWeather,
    weatherLocationSuffix,
  };

  return (
    <AppContext.Provider value={value}>
      <ToastStack toasts={shell.toasts} onDismiss={shell.dismissToast} />
      {children}
    </AppContext.Provider>
  );
}
