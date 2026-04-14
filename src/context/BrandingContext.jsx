import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { settingsApi, publicApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export const BrandingContext = createContext({});

const DEFAULT_BRANDING = {
    company_name: 'Zentrix CRM',
    logo_url: '',
    logo_icon: 'Z',
    primary_color: '#6366f1',
    sidebar_color: '#0a1628',
    accent_color: '#06b6d4',
    favicon_url: '',
    tagline: 'Real Estate Intelligence Platform',
    powered_by: true,      // show "Powered by Zentrix CRM"
    custom_domain: '',
    login_banner_text: '',
    footer_text: '',
    support_email: '',
    support_phone: '',
};

export function BrandingProvider({ children }) {
    const { user } = useAuth();
    const [branding, setBranding] = useState(() => {
        try {
            const cached = sessionStorage.getItem('zentrix_branding');
            return cached ? { ...DEFAULT_BRANDING, ...JSON.parse(cached) } : DEFAULT_BRANDING;
        } catch { return DEFAULT_BRANDING; }
    });
    const [loaded, setLoaded] = useState(false);

    const fetchBranding = useCallback(async () => {
        try {
            let settings;
            if (user) {
                settings = await settingsApi.get();
            } else {
                // Public fetch based on domain/subdomain
                const hostname = window.location.hostname;
                if (hostname === 'localhost' || hostname.includes('zentrixcrm.com')) {
                    // Only fetch if it's a subdomain (e.g. sikandar.zentrix...)
                    const parts = hostname.split('.');
                    if ((hostname === 'localhost' && parts.length < 2) || (hostname.includes('zentrixcrm.com') && parts.length < 3)) {
                        setBranding(DEFAULT_BRANDING);
                        setLoaded(true);
                        return;
                    }
                }
                const publicData = await publicApi.getBranding(hostname);
                if (publicData.is_default) {
                    setBranding(DEFAULT_BRANDING);
                    setLoaded(true);
                    return;
                }
                settings = publicData;
            }

            const wb = {
                company_name: settings.company_name || DEFAULT_BRANDING.company_name,
                logo_url: settings.logo_url || DEFAULT_BRANDING.logo_url,
                logo_icon: settings.logo_icon || (settings.company_name ? settings.company_name[0].toUpperCase() : 'Z'),
                primary_color: settings.primary_color || DEFAULT_BRANDING.primary_color,
                sidebar_color: settings.sidebar_color || DEFAULT_BRANDING.sidebar_color,
                accent_color: settings.accent_color || DEFAULT_BRANDING.accent_color,
                favicon_url: settings.favicon_url || DEFAULT_BRANDING.favicon_url,
                tagline: settings.tagline || DEFAULT_BRANDING.tagline,
                powered_by: settings.powered_by !== false,
                custom_domain: settings.custom_domain || '',
                login_banner_text: settings.login_banner_text || '',
                footer_text: settings.footer_text || '',
                support_email: settings.support_email || DEFAULT_BRANDING.support_email,
                support_phone: settings.support_phone || DEFAULT_BRANDING.support_phone,
                pwa_enabled: settings.pwa_enabled !== false,
            };
            setBranding(wb);
            sessionStorage.setItem('zentrix_branding', JSON.stringify(wb));

        } catch (err) {
            console.error('[BRANDING] Failed to fetch:', err);
        } finally {
            setLoaded(true);
        }
    }, [user]);

    // Apply branding side-effects (Title, Favicon, PWA Manifest)
    useEffect(() => {
        if (!loaded || !branding) return;

        const wb = branding;

        // Dynamically update favicon
        if (wb.favicon_url) {
            const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
            link.rel = 'icon';
            link.href = wb.favicon_url;
            if (!link.parentNode) document.head.appendChild(link);
        }

        // Update document title
        document.title = wb.company_name || 'Zentrix CRM';

        // ─── Dynamic PWA Manifest ─────────────────────────────────
        const manifestLink = document.querySelector("link[rel='manifest']");
        
        if (wb.pwa_enabled) {
            const manifestURL = `/api/public/manifest.json?hostname=${encodeURIComponent(window.location.hostname)}`;
            const link = manifestLink || document.createElement('link');
            link.rel = 'manifest';
            link.href = manifestURL;
            if (!link.parentNode) document.head.appendChild(link);
        } else {
            if (manifestLink) manifestLink.remove();
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(regs => {
                    for (let reg of regs) reg.unregister();
                });
            }
        }
    }, [branding, loaded]);

    useEffect(() => {
        fetchBranding();
    }, [fetchBranding]);

    const updateBranding = useCallback(async (updates) => {
        try {
            await settingsApi.update(updates);
            const merged = { ...branding, ...updates };
            setBranding(merged);
            sessionStorage.setItem('zentrix_branding', JSON.stringify(merged));
            document.title = merged.company_name || 'Zentrix CRM';
            return true;
        } catch (err) {
            console.error('[BRANDING] Update failed:', err);
            throw err;
        }
    }, [branding]);

    return (
        <BrandingContext.Provider value={{ branding, loaded, updateBranding, refreshBranding: fetchBranding }}>
            {children}
        </BrandingContext.Provider>
    );
}

export const useBranding = () => useContext(BrandingContext);
export { DEFAULT_BRANDING };
