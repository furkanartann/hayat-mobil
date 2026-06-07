import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch, hasAuthSession } from '../../../api/client.js';
import { LOCATION_PROMPT_KEY } from '../../../lib/constants.js';
import { loadLastLocation, saveLastLocation } from '../../../lib/mapPersistence.js';

export function useLocation({
  user, activeTab, patchAppData, invalidateAppData, mapLayersMe = null,
}) {
  const [flyToMeToken, setFlyToMeToken] = useState(0);
  const [locationStatus, setLocationStatus] = useState('unknown');
  const [userLocation, setUserLocation] = useState(() => (
    user?.userId ? loadLastLocation(user.userId) : null
  ));
  const hydratedUserIdRef = useRef(user?.userId ?? null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationPromptDone, setLocationPromptDone] = useState(() => {
    const stored = localStorage.getItem(LOCATION_PROMPT_KEY);
    return stored === 'allowed' || stored === 'dismissed';
  });
  const [liveWeather, setLiveWeather] = useState(null);

  const requestLocationCapture = useCallback((fresh = false) => {
    if (!user) return;
    if (!navigator.geolocation) {
      setLocationStatus('unavailable');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!hasAuthSession()) return;
        const { latitude, longitude, accuracy } = pos.coords;
        try {
          const nextLocation = { lat: latitude, lng: longitude, accuracy: accuracy ?? null };
          setUserLocation(nextLocation);
          if (user?.userId) saveLastLocation(user.userId, nextLocation);
          await apiFetch('/api/users/me/location', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude })
          });
          setLocationStatus('granted');
          localStorage.setItem(LOCATION_PROMPT_KEY, 'allowed');
          setLocationPromptDone(true);
          setShowLocationPrompt(false);
          setFlyToMeToken((n) => n + 1);
          if (!hasAuthSession()) return;
          const [resZ, resM] = await Promise.all([
            apiFetch('/api/users/me/zone-status'),
            (activeTab === 'map' || activeTab === 'dashboard') ? apiFetch('/api/map/layers') : Promise.resolve(null)
          ]);
          const patch = {};
          if (resZ?.ok) patch.zoneStatus = await resZ.json();
          if (resM?.ok) patch.mapLayers = await resM.json();
          if (Object.keys(patch).length > 0) patchAppData(patch);
          else invalidateAppData();
        } catch {
          // silent background location sync
        }
      },
      (err) => {
        if (err.code === 1) setLocationStatus('denied');
        else if (err.code === 3) setLocationStatus('timeout');
        else setLocationStatus('unavailable');
      },
      { enableHighAccuracy: true, maximumAge: fresh ? 0 : 10000, timeout: 20000 }
    );
  }, [user, activeTab, patchAppData, invalidateAppData]);

  useEffect(() => {
    if (!user) {
      hydratedUserIdRef.current = null;
      setLocationStatus('unknown');
      setUserLocation(null);
      setShowLocationPrompt(false);
      return;
    }

    if (hydratedUserIdRef.current !== user.userId) {
      hydratedUserIdRef.current = user.userId;
      const cached = loadLastLocation(user.userId);
      if (cached) setUserLocation(cached);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.userId || userLocation?.lat != null || userLocation?.lng != null) return;
    if (mapLayersMe?.lat == null || mapLayersMe?.lng == null) return;
    const fromServer = { lat: mapLayersMe.lat, lng: mapLayersMe.lng, accuracy: null };
    setUserLocation(fromServer);
    saveLastLocation(user.userId, fromServer);
  }, [user?.userId, mapLayersMe?.lat, mapLayersMe?.lng, userLocation?.lat, userLocation?.lng]);

  useEffect(() => {
    if (!user) {
      return;
    }
    if (!navigator.geolocation) {
      setLocationStatus('unavailable');
      return;
    }
    if (!locationPromptDone) return;

    requestLocationCapture(false);
    const intervalMs = activeTab === 'map' ? 30000 : 120000;
    const id = setInterval(() => requestLocationCapture(false), intervalMs);
    return () => clearInterval(id);
  }, [user, activeTab, locationPromptDone, requestLocationCapture]);

  useEffect(() => {
    if (!user || !navigator.geolocation || locationPromptDone) return;

    let timer;
    let permissionResult;

    const schedulePrompt = () => {
      timer = setTimeout(() => setShowLocationPrompt(true), 600);
    };

    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        permissionResult = result;
        if (result.state === 'granted') {
          localStorage.setItem(LOCATION_PROMPT_KEY, 'allowed');
          setLocationPromptDone(true);
          requestLocationCapture(true);
          return;
        }
        schedulePrompt();
        result.onchange = () => {
          if (result.state === 'granted') {
            localStorage.setItem(LOCATION_PROMPT_KEY, 'allowed');
            setLocationPromptDone(true);
            setShowLocationPrompt(false);
            requestLocationCapture(true);
          }
        };
      }).catch(schedulePrompt);
    } else {
      schedulePrompt();
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (permissionResult) permissionResult.onchange = null;
    };
  }, [user, locationPromptDone, requestLocationCapture]);

  useEffect(() => {
    if (!user || userLocation?.lat == null || userLocation?.lng == null) {
      setLiveWeather(null);
      return;
    }

    let cancelled = false;
    const fetchWeather = async () => {
      if (!hasAuthSession()) return;
      try {
        const res = await apiFetch(
          `/api/weather?lat=${encodeURIComponent(userLocation.lat)}&lng=${encodeURIComponent(userLocation.lng)}`
        );
        if (!cancelled && res.ok) setLiveWeather(await res.json());
      } catch {
        // sessiz — runtime-state yedegi kullanilir
      }
    };

    fetchWeather();
    const id = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user, userLocation?.lat, userLocation?.lng]);

  const handleAllowLocation = () => requestLocationCapture(true);

  const handleDismissLocationPrompt = () => {
    localStorage.setItem(LOCATION_PROMPT_KEY, 'dismissed');
    setLocationPromptDone(true);
    setShowLocationPrompt(false);
    requestLocationCapture(true);
  };

  const handleLocationRetry = () => {
    if (locationStatus === 'denied') {
      setShowLocationPrompt(true);
      return;
    }
    requestLocationCapture(true);
  };

  const locationNeedsHttps = typeof window !== 'undefined'
    && !window.isSecureContext
    && !window.location.hostname.includes('localhost');

  return {
    flyToMeToken, setFlyToMeToken,
    locationStatus, userLocation, showLocationPrompt, locationPromptDone, liveWeather,
    locationNeedsHttps,
    handleAllowLocation, handleDismissLocationPrompt, handleLocationRetry,
  };
}
