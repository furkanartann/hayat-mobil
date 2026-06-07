import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CollapsibleCard({ title, icon: Icon, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="glass collapsible-card" style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '16px' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          background: 'var(--bg-card)',
          borderBottom: isOpen ? '1px solid var(--border-color)' : 'none',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '15px', color: 'var(--text-main)' }}>
          {Icon && <Icon style={{ color: 'var(--primary)', width: '18px', height: '18px' }} />}
          <span>{title}</span>
        </div>
        <ChevronDown
          style={{
            width: '20px',
            height: '20px',
            color: 'var(--text-muted)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
          }}
        />
      </div>
      {isOpen && (
        <div className="collapsible-content" style={{ padding: '16px', background: '#ffffff', borderTop: '1px solid var(--border-color)' }}>
          {children}
        </div>
      )}
    </div>
  );
}
