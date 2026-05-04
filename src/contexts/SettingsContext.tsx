import * as React from 'react';
import { supabase } from '@/services/supabase';

export interface PlatformSettings {
  [key: string]: string;
}

interface SettingsContextType {
  settings: PlatformSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = React.createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<PlatformSettings>({});
  const [loading, setLoading] = React.useState(true);

  const loadSettings = async () => {
    try {
      const { data } = await supabase.from('settings').select('key, value');
      const settingsObj: Record<string, string> = {};
      data?.forEach((s: { key: string; value: string }) => {
        settingsObj[s.key] = s.value;
      });
      setSettings(settingsObj);
      
      // Apply theme colors globally
      if (settingsObj.primary_color) {
        let primaryValue = settingsObj.primary_color;
        // Convert hex to HSL components if needed
        if (primaryValue.startsWith('#')) {
          const hex = primaryValue.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16) / 255;
          const g = parseInt(hex.substring(2, 4), 16) / 255;
          const b = parseInt(hex.substring(4, 6), 16) / 255;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          let h = 0, s = 0, l = (max + min) / 2;
          if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
              case r: h = (g - b) / d + (g < b ? 6 : 0); break;
              case g: h = (b - r) / d + 2; break;
              case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
          }
          primaryValue = `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
        }
        document.documentElement.style.setProperty('--primary', primaryValue);
      }
      
      // Apply favicon
      if (settingsObj.favicon_url) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        const faviconUrl = settingsObj.favicon_url;
        link.href = `${faviconUrl}${faviconUrl.includes('?') ? '&' : '?'}v=2`;
      }
    } catch (err) {
      console.error('Settings load error:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings: loadSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = React.useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
