import React, { useRef, useState, useEffect } from 'react';
import { Search, Users } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import CivilianLookupDetail from './CivilianLookupDetail.jsx';
import {
  careSummaryText,
  formatDistanceKm,
  lookupResultKey,
  lookupResultTitle,
  missingStatusLabel,
  safetyStatusClass,
  safetyStatusLabel,
  sosSummaryText,
} from '../lib/civilianLookup.js';

export default function MissingPersonNavSearch({ variant = 'desktop' }) {
  const app = useApp();
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (app.user?.userType !== 'Afetzede') return null;

  const isMobile = variant === 'mobile';
  const hasQuery = app.civilianSearch.trim().length >= 2;
  const showDropdown = open && hasQuery && (app.civilianLookupResults.length > 0 || app.civilianLookupLoading);

  const handleSelect = (item) => {
    app.setCivilianLookupDetail(item);
    setOpen(false);
  };

  const handleShowMap = (item) => {
    if (app.focusLookupOnMap?.(item)) {
      app.setActiveTab('map');
      app.setCivilianLookupDetail(null);
    }
  };

  return (
    <>
      <div
        ref={wrapRef}
        className={`nav-missing-search nav-missing-search--${variant}`}
      >
        <div className="nav-missing-search__field">
          <Search className="nav-missing-search__icon" size={isMobile ? 14 : 15} aria-hidden />
          <input
            type="search"
            className="nav-missing-search__input"
            placeholder={app.t('Yakın ara (isim)…', 'Search family…')}
            value={app.civilianSearch}
            onChange={(e) => {
              app.setCivilianSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            aria-label={app.t('Yakın durumu ara', 'Search family status')}
          />
          <button
            type="button"
            className="nav-missing-search__go"
            onClick={() => app.setActiveTab('missing')}
            title={app.t('Kayıp ilanları', 'Missing persons')}
          >
            <Users size={isMobile ? 14 : 15} />
          </button>
        </div>

        {showDropdown && (
          <div className="nav-missing-search__dropdown" role="listbox">
            {app.civilianLookupLoading && (
              <div className="nav-missing-search__status">{app.t('Aranıyor…', 'Searching…')}</div>
            )}
            {!app.civilianLookupLoading && app.civilianLookupResults.length === 0 && (
              <div className="nav-missing-search__status">{app.t('Sonuç yok', 'No results')}</div>
            )}
            {app.civilianLookupResults.map((item) => {
              const title = lookupResultTitle(item);
              const sos = sosSummaryText(item.sos, app.t);
              const care = careSummaryText(item.care, app.t);
              return (
                <button
                  key={lookupResultKey(item)}
                  type="button"
                  className="nav-missing-search__result nav-missing-search__result--rich"
                  onClick={() => handleSelect(item)}
                >
                  <div className="nav-missing-search__result-top">
                    <strong>{title}</strong>
                    <div className="nav-missing-search__result-badges">
                      {item.kind === 'user' && (
                        <span className={`badge ${safetyStatusClass(item.safetyStatus)}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                          {safetyStatusLabel(item.safetyStatus, app.t)}
                        </span>
                      )}
                      {(item.missingReport || item.kind === 'missing') && (
                        <span className="badge badge-red" style={{ fontSize: '9px', padding: '1px 5px' }}>
                          {missingStatusLabel(item.missingReport?.status ?? item.status, app.t)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="nav-missing-search__result-sub">
                    {formatDistanceKm(item.distanceKm, app.t)}
                    {sos ? ` · ${sos}` : care ? ` · ${care}` : ''}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {app.civilianLookupDetail && (
        <CivilianLookupDetail
          item={app.civilianLookupDetail}
          onClose={() => app.setCivilianLookupDetail(null)}
          onShowMap={handleShowMap}
          t={app.t}
        />
      )}
    </>
  );
}
