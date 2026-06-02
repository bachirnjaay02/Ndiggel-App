import { useEffect, useMemo, useState } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import AppLogo from '../../assets/AppLogo';
import './layouts.css';

function urlBase64ToUint8Array(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

async function subscribePush(memberId: string, associationId: string) {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  if (Notification.permission === 'denied') return;
  const publicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
  if (!publicKey) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, associationId, subscription: sub.toJSON() }),
    });
  } catch {}
}

const navItems = [
  { to: '/member',         label: 'Accueil',    icon: '🏠', end: true },
  { to: '/member/pay',     label: 'Payer',       icon: '💳' },
  { to: '/member/history', label: 'Historique',  icon: '📋' },
  { to: '/member/profile', label: 'Profil',      icon: '👤' },
];

export default function MemberLayout() {
  const { user } = useAuthStore();
  const { fetchAll, notifications, cotisations, currentPeriod } = useAppStore();
  const [showPushBanner, setShowPushBanner] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (user?.associationId) fetchAll(user.associationId);
  }, [user?.associationId, fetchAll]);

  // Vérifier si on doit proposer les notifications push
  useEffect(() => {
    if (!user?.id || !process.env.REACT_APP_VAPID_PUBLIC_KEY) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission === 'denied') return;
    if (Notification.permission === 'granted') {
      // Déjà accordé → s'abonner silencieusement
      subscribePush(user.id, user.associationId ?? '');
      return;
    }
    // 'default' → proposer via bannière (sauf si déjà refusé)
    const dismissed = localStorage.getItem('push_banner_dismissed');
    if (!dismissed) setShowPushBanner(true);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEnablePush = async () => {
    setShowPushBanner(false);
    const perm = await Notification.requestPermission();
    if (perm === 'granted' && user?.id) {
      subscribePush(user.id, user.associationId ?? '');
    }
  };

  const handleDismissBanner = () => {
    setShowPushBanner(false);
    localStorage.setItem('push_banner_dismissed', '1');
  };

  const isPaid = cotisations.some(
    c => c.memberId === user?.id && c.period === currentPeriod && c.status === 'paid'
  );

  // Relit localStorage à chaque changement de route (après visite de l'écran notifications)
  const [readIds, setReadIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      setReadIds(JSON.parse(localStorage.getItem(`read_notifs_${user?.id}`) ?? '[]'));
    } catch {
      setReadIds([]);
    }
  }, [location.pathname, user?.id]);

  const unreadCount = useMemo(
    () => notifications.filter(n => {
      if (n.target === 'pending' && isPaid) return false;
      return !readIds.includes(n.id);
    }).length,
    [notifications, isPaid, readIds],
  );

  return (
    <div className="member-layout">
      {/* Header */}
      <header className="member-header">
        <div className="member-header-logo">
          <AppLogo size={30} showText={false} />
          <span className="member-header-name">Ndiggël App</span>
        </div>
        <Link to="/member/notifications" className="member-header-notif">
          🔔
          {unreadCount > 0 && (
            <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </Link>
      </header>

      {/* Bannière permission push */}
      {showPushBanner && (
        <div className="push-banner">
          <span className="push-banner-icon">🔔</span>
          <p className="push-banner-text">Activez les notifications pour recevoir les rappels même quand l'app est fermée</p>
          <div className="push-banner-actions">
            <button className="push-banner-btn-yes" onClick={handleEnablePush}>Activer</button>
            <button className="push-banner-btn-no"  onClick={handleDismissBanner}>Plus tard</button>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="member-main">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="member-nav">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `member-nav-item ${isActive ? 'member-nav-item-active' : ''}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
