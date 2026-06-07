import React from 'react';
import { formatMissingStatus } from '../../lib/statusLabels.js';
import { Navigation, PlusCircle } from 'lucide-react';
import CollapsibleCard from '../../components/CollapsibleCard.jsx';
import { useApp } from '../../context/AppContext.jsx';
export default function MissingTab() {
  const app = useApp();
  if (app.activeTab !== 'missing') return null;
  return (
          <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Create missing person report (Afetzede only) */}
            {app.user.userType === 'Afetzede' && (
            <CollapsibleCard title={app.t('Kayıp Şahıs Bildirimi Ekle', 'Report a Missing Person')} icon={PlusCircle} defaultOpen={false}>
              <form onSubmit={app.handleCreateMissing} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--grey)', marginBottom: '4px' }}>Kayıp Kişinin Adı Soyadı</label>
                    <input 
                      type="text" 
                      className="form-input"
                      value={app.newMissing.missingPersonName}
                      onChange={(e) => app.setNewMissing({ ...app.newMissing, missingPersonName: e.target.value })}
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--grey)', marginBottom: '4px' }}>Yaş</label>
                    <input 
                      type="number" 
                      className="form-input"
                      value={app.newMissing.age}
                      onChange={(e) => app.setNewMissing({ ...app.newMissing, age: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--grey)', marginBottom: '4px' }}>Fiziksel Özellikler / Kıyafet</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Boy, saç rengi, son görüldüğü kıyafetler..."
                    value={app.newMissing.physicalDescription}
                    onChange={(e) => app.setNewMissing({ ...app.newMissing, physicalDescription: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--grey)', marginBottom: '4px' }}>
                    {app.t('Son görüldüğü yer (isteğe bağlı)', 'Last seen location (optional)')}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={app.t('Örn: Fatih Camii yakını, X apartmanı...', 'e.g. Near city square, building name...')}
                    value={app.newMissing.lastSeenPlace}
                    onChange={(e) => app.setNewMissing({ ...app.newMissing, lastSeenPlace: e.target.value })}
                  />
                </div>

                <p className="civilian-form-hint">
                  <Navigation size={14} />
                  {app.userLocation?.lat != null
                    ? app.t('Harita konumunuz bildirime eklenecek.', 'Your map location will be attached to the report.')
                    : app.t('Mümkünse konum izni verin; koordinat otomatik eklenir.', 'Allow location if possible; coordinates are added automatically.')}
                </p>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '6px' }}>
                  <PlusCircle style={{ width: '16px', height: '16px' }} />
                  {app.t('Kayıp İlanı Yayınla', 'Post Missing Person Alert')}
                </button>
              </form>
            </CollapsibleCard>
            )}

            {/* List missing reports */}
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '10px' }}>
                {app.t('Kayıp Şahıs Bildirimleri', 'Active Missing Reports')}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {app.missingPersons.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--grey)', textAlign: 'center' }}>
                    {app.t('Bildirilmiş kayıp şahıs yok.', 'No missing reports.')}
                  </p>
                ) : (
                  app.missingPersons.map((mp) => {
                    const statusClass = mp.status === 'Missing' ? 'badge-red' : mp.status === 'Found' ? 'badge-green' : 'badge-grey';
                    return (
                      <div key={mp.reportId} className="glass missing-report-card">
                        <div className="missing-report-card__header">
                          <span className="missing-report-card__name">
                            {mp.missingPersonName} ({app.t('Yaş', 'Age')}: {mp.age || app.t('Bilinmiyor', 'Unknown')})
                          </span>
                          <span className={`badge ${statusClass}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                            {formatMissingStatus(mp.status, app.t)}
                          </span>
                        </div>
                        <p className="missing-report-card__desc">
                          <strong>{app.t('Açıklama:', 'Details:')}</strong> {mp.physicalDescription}
                        </p>
                        <div className="missing-report-card__meta">
                          <span>{app.t('İhbarcı:', 'Reporter:')} {mp.reporterName}</span>
                          <span>
                            {mp.lastKnownLat != null && mp.lastKnownLong != null
                              ? `${app.t('Konum', 'Location')}: ${mp.lastKnownLat.toFixed(3)}, ${mp.lastKnownLong.toFixed(3)}`
                              : app.t('Konum bilgisi yok', 'No location data')}
                          </span>
                        </div>

                        {/* Status update — arama kurtarma veya PM */}
                        {(app.user.userType === 'PM' || app.user.userType === 'AramaKurtarma') && mp.status === 'Missing' && (
                          <div className="missing-report-card__actions">
                            <button 
                              onClick={() => app.handleUpdateMissingStatus(mp.reportId, 'Found')}
                              className="btn btn-secondary" 
                              style={{ flex: 1, padding: '5px', fontSize: '11px', color: 'var(--emerald)', border: 'none' }}
                            >
                              {app.t('Bulundu Olarak İşaretle', 'Mark as Found')}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
  );
}
