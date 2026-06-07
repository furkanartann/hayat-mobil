import { useState, useMemo, useCallback, useEffect } from 'react';
import { normalizeAuthError } from '../api/client.js';

export function useI18n() {
  const [lang, setLang] = useState('TR');

  useEffect(() => {
    document.documentElement.lang = lang === 'TR' ? 'tr' : 'en';
  }, [lang]);

  const t = useCallback((tr, en) => (lang === 'TR' ? tr : en), [lang]);

  const networkErrorMsg = useMemo(
    () => t('Sunucu bağlantı hatası.', 'Server connection error.'),
    [t]
  );
  const genericErrorMsg = useMemo(() => t('Hata oluştu.', 'An error occurred.'), [t]);

  const readApiError = useCallback(async (res) => {
    try {
      const data = await res.json();
      return normalizeAuthError(data?.error) || genericErrorMsg;
    } catch {
      return genericErrorMsg;
    }
  }, [genericErrorMsg]);

  return { lang, setLang, t, networkErrorMsg, genericErrorMsg, readApiError };
}
