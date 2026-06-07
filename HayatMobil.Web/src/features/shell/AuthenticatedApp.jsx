
﻿import React from 'react';
import { CloudRain, Globe, LogOut, Navigation, Wifi } from 'lucide-react';
import { HAYAT_MOBIL_LOGO } from '../../lib/constants.js';
import { getAvailableTabs, formatRoleLabel } from '../../lib/roles.js';
import { formatWeatherCondition } from '../../lib/weather.js';
import { tabMeta } from '../../lib/constants.js';
import { networkQualityColor } from '../../hooks/useNetworkQuality.js';
import { useApp } from '../../context/AppContext.jsx';
import DashboardTab from '../dashboard/DashboardTab.jsx';
import TicketsTab from '../tickets/TicketsTab.jsx';
import MapTab from '../map/MapTab.jsx';
import InventoryTab from '../inventory/InventoryTab.jsx';
import MissingTab from '../missing/MissingTab.jsx';
import AdminTab from '../admin/AdminTab.jsx';
import NonDashboardDisasterBanner from './NonDashboardDisasterBanner.jsx';
import MissingPersonNavSearch from '../../components/MissingPersonNavSearch.jsx';

export default function AuthenticatedApp() {
  const app = useApp();
  return (
    <>
    {app.showLocationPrompt && (
      <div className="location-prompt-overlay" onClick={app.handleDismissLocationPrompt}>
        <div className="location-prompt-card" onClick={(e) => e.stopPropagation()}>
          <div className="location-prompt-icon">
            <Navigation size={28} />
          </div>
          <h3>{app.t('Konum izni', 'Location permission')}</h3>
          <p>
            {app.t(
              'Haritada konumunuzu göstermek, SOS talebine koordinat eklemek ve canlı hava bilgisi almak için konum iznine ihtiyacımız var.',
              'We need location access to show you on the map, attach coordinates to SOS requests, and fetch live weather.'
            )}
          </p>
          {app.locationStatus === 'denied' && (
            <p className="location-prompt-warn">
              {app.t(
                'İzin reddedildi. Telefon ayarlarından Chrome için konumu açın veya aşağıdan tekrar deneyin.',
                'Permission denied. Enable location for Chrome in phone settings, or try again below.'
              )}
            </p>
          )}
          {app.locationNeedsHttps && (
            <p className="location-prompt-warn">
              {app.t(
                'Not: Telefonda http:// adresinde tarayıcı konum iznini engelleyebilir. Mümkünse PC üzerinden aynı ağda test edin veya siteyi HTTPS ile yayınlayın.',
                'Note: On phones, http:// URLs may block location. Test on PC or serve the site over HTTPS.'
              )}
            </p>
          )}
          <div className="location-prompt-actions">
            <button type="button" className="btn btn-primary" onClick={app.handleAllowLocation}>
              <Navigation size={16} />
              {app.t('Konumu Aç', 'Enable Location')}
            </button>
            <button type="button" className="btn btn-secondary location-prompt-later" onClick={app.handleDismissLocationPrompt}>
              {app.t('Sonra', 'Not now')}
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="app-layout">
      {/* Left Sidebar for Desktop */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src={HAYAT_MOBIL_LOGO}
              alt="Hayat Mobil"
              className="brand-logo"
            />
            <span style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '0.05em', color: 'var(--primary)' }}>HAYAT-MOBİL</span>
          </div>
          <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            {app.t('Afet Yönetim ve Saha Koordinasyon Sistemi', 'Disaster Management & Field Coordination System')}
          </p>
        </div>

        <nav className="sidebar-menu">
          {getAvailableTabs(app.user.userType).map((tabKey) => {
            const meta = tabMeta[tabKey];
            if (!meta) return null;
            const Icon = meta.icon;
            return (
              <div 
                key={tabKey}
                className={`sidebar-item ${app.activeTab === tabKey ? 'active' : ''}`} 
                onClick={() => app.setActiveTab(tabKey)}
              >
                <Icon style={{ width: '18px', height: '18px' }} />
                <span>{app.t(meta.labelTR, meta.labelEN)}</span>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #ff8c00, #ff6600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white' }}>
              {app.user.fullName.split(' ').map(n=>n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{app.user.fullName}</div>
              <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600' }}>{formatRoleLabel(app.user.userType, app.lang)}</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', padding: '0 16px 16px 16px' }}>
            <button 
              onClick={() => app.setLang(app.lang === 'TR' ? 'EN' : 'TR')}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', gap: '4px', justifyContent: 'center', color: '#f8fafc', background: 'rgba(255,255,255,0.06)', border: 'none' }}
            >
              <Globe style={{ width: '14px', height: '14px' }} />
              {app.lang}
            </button>
            
            <button 
              onClick={app.handleLogout}
              className="btn btn-secondary" 
              style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              <LogOut style={{ width: '14px', height: '14px', color: 'var(--rose)' }} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main panel containing content and mobile header */}
      <div className="main-panel">
        
        {/* Desktop Header */}
        <header className="main-header">
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>
            {app.activeTab === 'dashboard' && app.user.userType === 'Afetzede' ? app.t('Afetzede Paneli', 'Civilian Dashboard') :
             app.activeTab === 'dashboard' && app.user.userType === 'PM' ? app.t('Kriz Komuta Paneli', 'Crisis Command Panel') :
             app.activeTab === 'dashboard' && app.user.userType === 'SaglikParamedik' ? app.t('Paramedik Müdahale Paneli', 'Paramedic Response Panel') :
             app.activeTab === 'dashboard' && app.user.userType === 'Doktor' ? app.t('Doktor Klinik Paneli', 'Doctor Clinical Panel') :
             app.activeTab === 'dashboard' && app.user.userType === 'Lojistik' ? app.t('Lojistik Dağıtım Paneli', 'Logistics Dispatch Panel') :
             app.activeTab === 'dashboard' && app.user.userType === 'AramaKurtarma' ? app.t('Arama Kurtarma Paneli', 'Search & Rescue Panel') :
             app.activeTab === 'dashboard' && app.user.userType === 'Muhendis' ? app.t('Altyapı & Sensör İzleme Paneli', 'Infrastructure & Sensor Monitoring') :
             app.activeTab === 'dashboard' && app.user.userType === 'IT' ? app.t('BT & Sistem İzleme Paneli', 'IT & Systems Monitoring') :
             app.activeTab === 'dashboard' && app.user.userType === 'Guvenlik' ? app.t('Güvenlik Kontrol Paneli', 'Security Control Panel') :
             app.activeTab === 'dashboard' ? app.t('Operasyon Kontrol Paneli', 'Operational Dashboard') :
             app.activeTab === 'tickets' ? app.t('Yardım Talepleri & Triyaj', 'Assistance Tickets & Triage') :
             app.activeTab === 'map' ? app.t('Saha Operasyon Haritası', 'Field Operations Map') :
             app.activeTab === 'inventory' ? app.t('Envanter & Dağıtım Takibi', 'Inventory & Dispatch') :
             app.activeTab === 'missing' ? app.t('Kayıp İlanları & Bilgilendirme', 'Missing Persons & Info') :
             app.t('Sistem Yönetim Araçları', 'System Admin Tools')}
          </h2>
          
          <div className="main-header-actions">
            <MissingPersonNavSearch variant="desktop" />
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
              <span
                style={{ display: 'flex', gap: '4px', alignItems: 'center' }}
                title={app.liveWeather
                  ? (app.liveWeather.locationLabel
                    ? app.t(`Konumunuza göre canlı hava — ${app.liveWeather.locationLabel} (Open-Meteo)`, `Live weather for ${app.liveWeather.locationLabel} (Open-Meteo)`)
                    : app.t('Konumunuza göre canlı hava (Open-Meteo)', 'Live weather for your location (Open-Meteo)'))
                  : app.t('Konum yok — PM afet senaryosu veya varsayılan', 'No location — PM disaster scenario or default')}
              >
                <CloudRain style={{ width: '16px', height: '16px', color: 'var(--primary)' }} />
                {app.displayWeather.weatherTemp}°C {formatWeatherCondition(app.displayWeather.weatherCondition)}{app.weatherLocationSuffix}
                {!app.liveWeather && (
                  <span style={{ fontSize: '10px', opacity: 0.7 }}>({app.t('senaryo', 'scenario')})</span>
                )}
              </span>
              {app.displayWeather.weatherRisk !== 'Normal' && app.displayWeather.weatherRisk !== 'Yok' && (
                <span className="badge badge-red" style={{ padding: '3px 6px' }}>
                  RISK: {formatWeatherCondition(app.displayWeather.weatherRisk)}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '13px', color: 'var(--text-main)' }}>
              <span
                style={{ display: 'flex', gap: '4px', alignItems: 'center', color: networkQualityColor(app.displayNetworkQuality) }}
                title={app.liveNetworkQuality != null
                  ? app.t('Canlı bağlantı ölçümü (gecikme + cihaz ağı)', 'Live connection measure (latency + device network)')
                  : app.t('Ölçüm yok — PM afet senaryosu', 'No measure — PM disaster scenario')}
              >
                <Wifi style={{ width: '16px', height: '16px' }} />
                {app.t('Ağ Kalitesi:', 'Network Quality:')} %{app.displayNetworkQuality}
              </span>
            </div>

            {app.user.userType === 'Afetzede' && (
              <span className={`badge ${app.user.safetyStatus === 'Safe' ? 'badge-green' : app.user.safetyStatus === 'In_Danger' ? 'badge-red' : 'badge-grey'}`} style={{ padding: '6px 12px' }}>
                {app.user.safetyStatus === 'Safe' ? app.t('DURUM: GÜVENDE', 'STATUS: SAFE') : app.user.safetyStatus === 'In_Danger' ? app.t('DURUM: TEHLİKEDE', 'STATUS: IN DANGER') : app.t('DURUM: BİLİNMİYOR', 'STATUS: UNKNOWN')}
              </span>
            )}
          </div>
        </header>

        {/* Mobile Header (Hidden on Desktop) */}
        <div className="mobile-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', alignItems: 'center', fontSize: '12px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: '#94a3b8' }}>
              <span style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                <CloudRain style={{ width: '13px', height: '13px', color: 'var(--primary)' }} />
                {app.displayWeather.weatherTemp}°C {formatWeatherCondition(app.displayWeather.weatherCondition)}{app.weatherLocationSuffix}
              </span>
              {app.displayWeather.weatherRisk !== 'Normal' && app.displayWeather.weatherRisk !== 'Yok' && (
                <span className="badge badge-red" style={{ padding: '2px 4px', fontSize: '10px' }}>
                  RISK: {formatWeatherCondition(app.displayWeather.weatherRisk)}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span
                style={{ display: 'flex', gap: '3px', alignItems: 'center', color: networkQualityColor(app.displayNetworkQuality) }}
                title={app.liveNetworkQuality != null
                  ? app.t('Canlı bağlantı', 'Live connection')
                  : app.t('Senaryo değeri', 'Scenario value')}
              >
                <Wifi style={{ width: '13px', height: '13px' }} />
                %{app.displayNetworkQuality}
              </span>
              <button 
                onClick={() => app.setLang(app.lang === 'TR' ? 'EN' : 'TR')}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '11px', display: 'flex', gap: '2px', alignItems: 'center', cursor: 'pointer' }}
              >
                <Globe style={{ width: '11px', height: '11px' }} />
                {app.lang}
              </button>
            </div>
          </div>

          <div className="mobile-header-user-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flexShrink: 1 }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #ff8c00, #ff6600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white' }}>
                {app.user.fullName.split(' ').map(n=>n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{app.user.fullName}</div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600', textTransform: 'uppercase' }}>
                    {formatRoleLabel(app.user.userType, app.lang)}
                  </span>
                  {app.user.userType === 'Afetzede' && (
                    <span className={`badge ${app.user.safetyStatus === 'Safe' ? 'badge-green' : app.user.safetyStatus === 'In_Danger' ? 'badge-red' : 'badge-grey'}`} style={{ fontSize: '9px', padding: '1px 4px' }}>
                      {app.user.safetyStatus === 'Safe' ? app.t('Güvende', 'Safe') : app.user.safetyStatus === 'In_Danger' ? app.t('Tehlikede', 'In Danger') : app.t('Bilinmiyor', 'Unknown')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={app.handleLogout}
              className="mobile-header-logout"
              aria-label={app.t('Çıkış', 'Log out')}
            >
              <LogOut style={{ width: '16px', height: '16px', color: 'var(--rose)' }} />
            </button>
          </div>

          {app.user.userType === 'Afetzede' && (
            <div className="mobile-header-search-row">
              <MissingPersonNavSearch variant="mobile" />
            </div>
          )}
        </div>

        <NonDashboardDisasterBanner />

        {/* Scrollable Main Content Area */}
        <div className={`main-content${app.activeTab === 'dashboard' ? ' main-content--dashboard' : ''}${app.activeTab === 'map' ? ' main-content--map' : ''}`}>
          <DashboardTab />
          <TicketsTab />
          <MapTab />
          <InventoryTab />
          <MissingTab />
          <AdminTab />
        </div>

      {/* Navigation Tab Bar */}
      <nav className="bottom-nav">
        {getAvailableTabs(app.user.userType).map((tabKey) => {
          const meta = tabMeta[tabKey];
          if (!meta) return null;
          const Icon = meta.icon;
          return (
            <div 
              key={tabKey}
              onClick={() => app.setActiveTab(tabKey)} 
              className={`bottom-nav-item ${app.activeTab === tabKey ? 'active' : ''}`}
            >
              <Icon className="bottom-nav-icon" />
              <span className="bottom-nav-label">{app.t(meta.labelTR, meta.labelEN)}</span>
            </div>
          );
        })}
      </nav>

    </div>
  </div>
    </>
  );
}
