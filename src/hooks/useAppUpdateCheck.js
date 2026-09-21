import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

const RELEASES_API = 'https://api.github.com/repos/invencaosts/Synfonia-Front/releases/latest';

const parseVersion = (v) => (v || '').replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);

const isNewer = (latest, current) => {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
};

export const useAppUpdateCheck = () => {
  const [updateInfo, setUpdateInfo] = useState(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelado = false;

    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const info = await App.getInfo();
        const currentVersion = info.version;

        const res = await fetch(RELEASES_API);
        if (!res.ok) return;
        const release = await res.json();
        const latestVersion = release.tag_name;
        const asset = (release.assets || []).find((a) => a.name.endsWith('.apk'));

        if (!cancelado && asset && isNewer(latestVersion, currentVersion)) {
          setUpdateInfo({
            currentVersion,
            latestVersion: latestVersion.replace(/^v/, ''),
            downloadUrl: asset.browser_download_url,
            releaseUrl: release.html_url
          });
        }
      } catch (err) {
        console.error('Erro ao checar atualização:', err);
      }
    })();

    return () => { cancelado = true; };
  }, []);

  return updateInfo;
};
