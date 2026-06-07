import { useState, useEffect } from 'react';
import { useToast } from './useToast.js';

export function useAppShell() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileView, setIsMobileView] = useState(() => window.innerWidth <= 768);
  const { toasts, toast, dismissToast } = useToast();

  useEffect(() => {
    const onResize = () => setIsMobileView(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return { activeTab, setActiveTab, isMobileView, toasts, toast, dismissToast };
}
