
﻿import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import MapFullscreenView from '../../components/map/MapFullscreenView.jsx';

export default function MapTab() {
  const app = useApp();
  if (app.activeTab !== 'map') return null;
  return (
    <MapFullscreenView
      layers={app.mapLayers}
      layerVisibility={app.mapLayerVisibility}
      onToggleLayer={(key) => app.setMapLayerVisibility((prev) => ({ ...prev, [key]: !prev[key] }))}
      userLocation={app.userLocation}
      flyToMeToken={app.flyToMeToken}
      onFlyToMe={() => app.setFlyToMeToken((n) => n + 1)}
      onSelectElement={app.handleMapSelectElement}
      onMapClick={app.handleMapClick}
      pickMode={app.mapPickMode}
      pickPurpose={app.mapPickPurpose || 'disaster'}
      onNearestAssembly={() => app.navigateToNearestAssembly(app.mapLayers?.assemblyPoints, app.userLocation)}
      selectedElement={app.mapSelectedElement}
      onClearSelection={() => app.setMapSelectedElement(null)}
      activeRoute={app.activeMapRoute}
      routeLoading={app.mapRouteLoading}
      dispatchActive={app.mapDispatchActive}
      manualRouteTarget={app.manualRouteTarget}
      onCreateRoute={app.createRouteFromSelection}
      onClearRoute={app.clearManualRoute}
      zoneStatus={app.zoneStatus}
      user={app.user}
      units={app.units}
      tickets={app.tickets}
      locationStatus={app.locationStatus}
      onLocationRetry={app.handleLocationRetry}
      t={app.t}
      isMobileView={app.isMobileView}
      refreshKey={`map-${app.mapLayers?.units?.length ?? 0}-${app.mapLayers?.tickets?.length ?? 0}`}
      externalFlyToTarget={app.mapFlyToTarget}
    />
  );
}
