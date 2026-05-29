import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import './member.css';

function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function getStreak(paidPeriods: string[]): number {
  if (paidPeriods.length === 0) return 0;
  const MONTHS_FR = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
  const now = new Date();
  let streak = 0;
  for (let i = 0; i < 12; i++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const period = `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
    if (paidPeriods.includes(period)) streak++;
    else break;
  }
  return streak;
}

function loyaltyBadge(streak: number): { label: string; emoji: string; color: string } {
  if (streak >= 12) return { label: 'Légendaire',  emoji: '👑', color: '#f59e0b' };
  if (streak >= 6)  return { label: 'Fidèle',       emoji: '🌟', color: '#8b35d6' };
  if (streak >= 3)  return { label: 'Régulier',     emoji: '🔥', color: '#2db866' };
  if (streak >= 1)  return { label: 'Débutant',     emoji: '🌱', color: '#3b82f6' };
  return               { label: 'Inactif',      emoji: '💤', color: '#9ca3af' };
}

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { user, logout }  = useAuthStore();
  const { cotisations, members } = useAppStore();

  const myMember   = members.find(m => m.id === user?.id);
  const myPayments = cotisations.filter(c => c.memberId === user?.id && c.status === 'paid');
  const totalPaid  = myPayments.reduce((sum, c) => sum + c.amount, 0);
  const paidPeriods = myPayments.map(c => c.period);
  const streak     = getStreak(paidPeriods);
  const badge      = loyaltyBadge(streak);

  const monthsSince = myMember?.joinedAt
    ? Math.max(1, Math.round((Date.now() - new Date(myMember.joinedAt).getTime()) / (1000 * 60 * 60 * 24 * 30)))
    : 0;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div>
      {/* Hero */}
      <div className="profile-hero">
        <div className="profile-avatar">{user?.name?.charAt(0) ?? 'M'}</div>
        <p className="profile-name">{user?.name}</p>
        <p className="profile-phone">{user?.phone}</p>
        {/* Loyalty badge */}
        <div className="loyalty-badge" style={{ borderColor: badge.color, color: badge.color }}>
          <span>{badge.emoji}</span>
          <span>{badge.label}</span>
          {streak > 0 && <span className="streak-count">{streak} mois consécutifs</span>}
        </div>
      </div>

      {/* Stats */}
      <div className="profile-stats">
        <div className="profile-stat">
          <p className="profile-stat-value">{monthsSince}</p>
          <p className="profile-stat-label">Mois actif</p>
        </div>
        <div className="profile-stat">
          <p className="profile-stat-value">{myPayments.length}</p>
          <p className="profile-stat-label">Paiements</p>
        </div>
        <div className="profile-stat">
          <p className="profile-stat-value">{streak}</p>
          <p className="profile-stat-label">Streak 🔥</p>
        </div>
        <div className="profile-stat">
          <p className="profile-stat-value">{Math.round(totalPaid / 1000)}k</p>
          <p className="profile-stat-label">FCFA payés</p>
        </div>
      </div>

      {/* Payment calendar — last 6 months */}
      <div className="info-card">
        <p className="info-card-title">Historique récent</p>
        <div className="pay-calendar">
          {Array.from({ length: 6 }, (_, i) => {
            const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
            const MONTHS_FR = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
            const period = `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
            const paid   = paidPeriods.includes(period);
            return (
              <div key={period} className={`cal-month ${paid ? 'cal-paid' : 'cal-miss'}`}>
                <span className="cal-indicator">{paid ? '✓' : '·'}</span>
                <span className="cal-label">{MONTHS_FR[d.getMonth()].slice(0, 3)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Personal info */}
      <div className="info-card">
        <p className="info-card-title">Informations personnelles</p>
        <div className="info-row">
          <span className="info-key">Nom</span>
          <span className="info-value">{user?.name}</span>
        </div>
        <div className="info-row">
          <span className="info-key">Téléphone</span>
          <span className="info-value">{user?.phone}</span>
        </div>
        <div className="info-row">
          <span className="info-key">Membre depuis</span>
          <span className="info-value">{fmtDate(myMember?.joinedAt ?? '')}</span>
        </div>
        <div className="info-row">
          <span className="info-key">Statut</span>
          <span className="badge badge-paid">Actif</span>
        </div>
      </div>

      {/* Association */}
      <div className="info-card">
        <p className="info-card-title">Association</p>
        <div className="info-row">
          <span className="info-key">Nom</span>
          <span className="info-value">{user?.associationName}</span>
        </div>
        <div className="info-row">
          <span className="info-key">Rôle</span>
          <span className="info-value">Membre</span>
        </div>
        <div className="info-row">
          <span className="info-key">Total versé</span>
          <span className="info-value" style={{ color: 'var(--green-dark)', fontWeight: 700 }}>
            {totalPaid.toLocaleString('fr-FR')} FCFA
          </span>
        </div>
      </div>

      <button
        className="btn-full btn-full-outline"
        onClick={handleLogout}
        style={{ color: '#ef4444', borderColor: '#ef4444', marginTop: 8 }}
      >
        Se déconnecter
      </button>
    </div>
  );
}
