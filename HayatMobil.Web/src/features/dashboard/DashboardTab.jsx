import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { getAvailableTabs } from '../../lib/roles.js';
import LiveMapSection from '../../components/map/LiveMapSection.jsx';
import DashboardBanners from './DashboardBanners.jsx';
import AfetzedeDashboard from './AfetzedeDashboard.jsx';
import MedicalActiveDutyBanner from './MedicalActiveDutyBanner.jsx';
import ParamedicDashboard from './ParamedicDashboard.jsx';
import DoctorDashboard from './DoctorDashboard.jsx';
import LogisticsDashboard from './LogisticsDashboard.jsx';
import PmDashboard from './PmDashboard.jsx';
import SearchRescueDashboard from './SearchRescueDashboard.jsx';
import SecurityDashboard from './SecurityDashboard.jsx';
import EngineerItDashboard from './EngineerItDashboard.jsx';
export default function DashboardTab() {
  const app = useApp();
  if (app.activeTab !== 'dashboard') return null;

  return (
    <div className="dashboard-tab animate-fade">
      {getAvailableTabs(app.user.userType).includes('map') && (
        <LiveMapSection
          variant="hero"
          refreshKey={`${app.activeTab}-${app.user.userType}`}
          layers={app.mapLayers}
          layerVisibility={app.mapLayerVisibility}
          onToggleLayer={(key) => app.setMapLayerVisibility((prev) => ({ ...prev, [key]: !prev[key] }))}
          userLocation={app.userLocation}
          flyToMeToken={app.flyToMeToken}
          onFlyToMe={() => app.setFlyToMeToken((n) => n + 1)}
          onSelectElement={app.handleMapSelectElement}
          onExpand={() => app.setActiveTab('map')}
          selectedElement={app.mapSelectedElement}
          onClearSelection={() => app.setMapSelectedElement(null)}
          activeRoute={app.activeMapRoute}
          routeLoading={app.mapRouteLoading}
          dispatchActive={app.mapDispatchActive}
          manualRouteTarget={app.manualRouteTarget}
          onCreateRoute={app.createRouteFromSelection}
          onClearRoute={app.clearManualRoute}
          zoneStatus={app.zoneStatus}
          locationStatus={app.locationStatus}
          onLocationRetry={app.handleLocationRetry}
          user={app.user}
          t={app.t}
          tickets={app.tickets}
          fallbackTickets={app.tickets}
          onNearestAssembly={() => app.navigateToNearestAssembly(app.mapLayers?.assemblyPoints, app.userLocation)}
        />
      )}

      <div className="dashboard-body">
        <DashboardBanners />
        <AfetzedeDashboard />
        <MedicalActiveDutyBanner />
        <ParamedicDashboard />
        <DoctorDashboard />
        <LogisticsDashboard />
        <PmDashboard />
        <SearchRescueDashboard />
        <SecurityDashboard />
        <EngineerItDashboard />
      </div>
    </div>
  );
}
