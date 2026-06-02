import React, { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import './member.css';

const TYPE_ICONS: Record<string, string>  = { reminder: '💰', update: '📢', info: 'ℹ️' };
const TYPE_LABELS: Record<string, string> = { reminder: 'Rappel', update: 'Annonce', info: 'Info' };

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function getReadIds(userId: string): string[] {
  try { return JSON.parse(localStorage.getItem(`read_notifs_${userId}`) ?? '[]'); }
  catch { return []; }
}
function saveReadIds(userId: string, ids: string[]) {
  localStorage.setItem(`read_notifs_${userId}`, JSON.stringify(ids));
}

export default function MemberNotificationsScreen() {
  const { user } = useAuthStore();
  const { notifications, cotisations, currentPeriod } = useAppStore();

  const isPaid = cotisations.some(
    c => c.memberId === user?.id && c.period === currentPeriod && c.status === 'paid'
  );

  const visibleNotifs = useMemo(
    () => notifications.filter(n => !(n.target === 'pending' && isPaid)),
    [notifications, isPaid]
  );

  const [readIds, setReadIds] = useState<string[]>(() =>
    user?.id ? getReadIds(user.id) : []
  );

  // Mark all visible notifications as read on mount
  useEffect(() => {
    if (!user?.id) return;
    const ids = visibleNotifs.map(n => n.id);
    const merged = Array.from(new Set([...readIds, ...ids]));
    setReadIds(merged);
    saveReadIds(user.id, merged);
  }, [visibleNotifs]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div style={{ padding: '16px 0 16px' }}>
        <h1
          style={{
            fontSize: 22, fontWeight: 800, margin: '0 0 4px',
            background: 'var(--gradient)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}
        >
          Notifications
        </h1>
        <p style={{ fontSize: 13, color: 'var(--gray-400)', margin: 0 }}>
          {visibleNotifs.length} notification{visibleNotifs.length !== 1 ? 's' : ''}
        </p>
      </div>

      {visibleNotifs.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 60 }}>
          <div className="empty-state-icon">🔔</div>
          <p className="empty-state-text">Aucune notification pour l'instant</p>
        </div>
      ) : (
        <div className="m-notif-list">
          {visibleNotifs.map((n, i) => (
            <div
              key={n.id}
              className={`m-notif-item m-notif-${n.type}`}
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="m-notif-icon">{TYPE_ICONS[n.type] ?? 'ℹ️'}</div>
              <div className="m-notif-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                  <p className="m-notif-title">{n.title}</p>
                  <span className={`m-notif-badge m-notif-badge-${n.type}`}>
                    {TYPE_LABELS[n.type] ?? n.type}
                  </span>
                </div>
                <p className="m-notif-message">{n.message}</p>
                <p className="m-notif-date">{fmtDate(n.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
