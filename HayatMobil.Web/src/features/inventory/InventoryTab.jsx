import React from 'react';
import { Truck } from 'lucide-react';
import CollapsibleCard from '../../components/CollapsibleCard.jsx';
import { useApp } from '../../context/AppContext.jsx';
export default function InventoryTab() {
  const app = useApp();
  if (app.activeTab !== 'inventory') return null;
  return (
          <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Supplies distribution form (Visible to Logistics or Admin PM) */}
            {(app.user.userType === 'Lojistik' || app.user.userType === 'PM') && (
              <CollapsibleCard title={app.t('Malzeme Dağıtım Formu', 'Supply Distribution Dispatch')} icon={Truck} defaultOpen={false}>
                {app.renderDistributionForm()}
              </CollapsibleCard>
            )}

            {/* Inventory list */}
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '10px' }}>
                {app.t('Saha Envanter Listesi', 'Field Stock & Inventory')}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {app.inventory.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--grey)', textAlign: 'center' }}>
                    {app.t('Envanter listesi boş.', 'Inventory list empty.')}
                  </p>
                ) : (
                  app.inventory.map((item) => (
                    <div key={item.itemId} className="glass" style={{ borderRadius: '12px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: 'white' }}>
                          {item.itemName}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--grey)', marginTop: '2px' }}>
                          Category: {item.category} | Hub Serial: {item.unitSerial}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary)' }}>
                          {item.stockCount}
                        </span>
                        <div style={{ fontSize: '10px', color: 'var(--grey)' }}>{app.t('adet', 'items')}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
  );
}
