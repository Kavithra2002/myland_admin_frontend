import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchSiteSettings, updateSiteSettings } from '../api/siteSettings.js';

const SiteSettingsContext = createContext(null);
const CACHE_KEY = 'myland-blog-page-enabled';

function readCachedEnabled() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw === 'false') return false;
    if (raw === 'true') return true;
  } catch {
    /* ignore */
  }
  return true;
}

function writeCachedEnabled(enabled) {
  try {
    localStorage.setItem(CACHE_KEY, enabled ? 'true' : 'false');
  } catch {
    /* ignore */
  }
}

export function SiteSettingsProvider({ children }) {
  const [blogPageEnabled, setBlogPageEnabledState] = useState(readCachedEnabled);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchSiteSettings()
      .then((settings) => {
        if (cancelled) return;
        writeCachedEnabled(settings.blogPageEnabled);
        setBlogPageEnabledState(settings.blogPageEnabled);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      blogPageEnabled,
      loading,
      setBlogPageEnabled: async (enabled) => {
        const previous = blogPageEnabled;
        writeCachedEnabled(enabled);
        setBlogPageEnabledState(enabled);
        try {
          const next = await updateSiteSettings({ blogPageEnabled: enabled });
          writeCachedEnabled(next.blogPageEnabled);
          setBlogPageEnabledState(next.blogPageEnabled);
          return next;
        } catch (err) {
          writeCachedEnabled(previous);
          setBlogPageEnabledState(previous);
          throw err;
        }
      },
    }),
    [blogPageEnabled, loading]
  );

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);
  if (!context) throw new Error('useSiteSettings must be used within SiteSettingsProvider');
  return context;
}
