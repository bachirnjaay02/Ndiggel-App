const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
};

export function register(config?: Config) {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;
      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);
      } else {
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl: string, config?: Config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      registration.onupdatefound = () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.onstatechange = () => {
          if (worker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // Nouvelle version disponible
              if (config?.onUpdate) config.onUpdate(registration);
              // Mise à jour silencieuse — active au prochain chargement
              worker.postMessage({ type: 'SKIP_WAITING' });
            } else {
              // Première installation — contenu disponible hors ligne
              if (config?.onSuccess) config.onSuccess(registration);
            }
          }
        };
      };
    })
    .catch((err) => console.error('[SW] Erreur enregistrement:', err));
}

function checkValidServiceWorker(swUrl: string, config?: Config) {
  fetch(swUrl, { headers: { 'Service-Worker': 'script' } })
    .then((res) => {
      const ct = res.headers.get('content-type');
      if (res.status === 404 || (ct != null && !ct.includes('javascript'))) {
        navigator.serviceWorker.ready.then((r) => r.unregister()).then(() => window.location.reload());
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => console.log('[SW] Pas de réseau — mode hors ligne activé'));
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((r) => r.unregister())
      .catch((err) => console.error(err.message));
  }
}
