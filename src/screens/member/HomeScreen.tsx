import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import orangeMoneyImg from '../../assets/orange-money.png';
import waveImg from '../../assets/wave.png';
import './member.css';

function MethodLabel({ m }: { m: string }) {
  if (m === 'orange_money') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><img src={orangeMoneyImg} alt="" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} /> Orange Money</span>;
  if (m === 'wave')         return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><img src={waveImg} alt="" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} /> Wave</span>;
  return <span>💵 Espèces</span>;
}
function fmtDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { cotisations, members, currentPeriod, monthlyCotisationAmount } = useAppStore();

  const myCotisations  = cotisations.filter(c => c.memberId === user?.id);
  const currentCotis   = myCotisations.find(c => c.period === currentPeriod);
  const isPaid         = currentCotis?.status === 'paid';
  const totalPaid      = myCotisations.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);
  const recentPayments = myCotisations.filter(c => c.status === 'paid').slice(0, 3);

  // Association-wide progress
  const activeMembers      = members.filter(m => m.status === 'active');
  const currentAllCotis    = cotisations.filter(c => c.period === currentPeriod);
  const assocPaidCount     = currentAllCotis.filter(c => c.status === 'paid').length;
  const assocCollectRate   = activeMembers.length > 0 ? Math.round((assocPaidCount / activeMembers.length) * 100) : 0;

  const firstName = user?.name?.split(' ')[0] ?? 'Membre';

  return (
    <div>
      {/* Hero */}
      <div className="hero-card">
        <div className="hero-top-row">
          <div>
            <p className="hero-greeting">{greeting()},</p>
            <p className="hero-name">{firstName} 👋</p>
          </div>
          <div className={`hero-status-pill ${isPaid ? 'paid' : 'due'}`}>
            {isPaid ? '✅ Payé' : '⏳ À payer'}
          </div>
        </div>
        <p className="hero-balance-label">Total cotisations payées</p>
        <p className="hero-balance">{totalPaid.toLocaleString('fr-FR')} FCFA</p>
        <div className="hero-assoc">{user?.associationName}</div>
      </div>

      {/* Current cotisation */}
      <div className={`cotis-card ${isPaid ? 'cotis-paid' : 'cotis-due'}`}>
        <div className={`cotis-icon ${isPaid ? 'paid' : 'due'}`}>{isPaid ? '✅' : '⏳'}</div>
        <div style={{ flex: 1 }}>
          <p className="cotis-label">Cotisation du mois</p>
          <p className={`cotis-status ${isPaid ? 'paid' : 'due'}`}>{isPaid ? 'Payée' : 'À régler'}</p>
          <p className="cotis-period">{currentPeriod} · {monthlyCotisationAmount.toLocaleString('fr-FR')} FCFA</p>
        </div>
        {!isPaid && <Link to="/member/pay" className="btn-pay-now">Payer</Link>}
      </div>

      {/* Association progress */}
      <div className="assoc-progress-card">
        <div className="assoc-progress-header">
          <p className="assoc-progress-title">Collecte de l'association</p>
          <span className="assoc-progress-pct">{assocCollectRate}%</span>
        </div>
        <div className="assoc-progress-bar">
          <div className="assoc-progress-fill" style={{ width: `${assocCollectRate}%` }} />
        </div>
        <p className="assoc-progress-sub">{assocPaidCount} / {activeMembers.length} membres ont payé pour {currentPeriod}</p>
      </div>

      {/* Quick actions */}
      <div className="quick-actions">
        <Link to="/member/pay" className="action-card">
          <div className="action-icon" style={{ background: 'rgba(139,53,214,0.12)' }}>💳</div>
          <p className="action-label">Payer</p>
        </Link>
        <Link to="/member/history" className="action-card">
          <div className="action-icon" style={{ background: 'rgba(45,184,102,0.12)' }}>📋</div>
          <p className="action-label">Historique</p>
        </Link>
        <Link to="/member/profile" className="action-card">
          <div className="action-icon" style={{ background: 'rgba(59,130,246,0.12)' }}>👤</div>
          <p className="action-label">Profil</p>
        </Link>
      </div>

      {/* Recent payments */}
      <div className="m-section">
        <div className="m-section-header">
          <h2 className="m-section-title">Derniers paiements</h2>
          <Link to="/member/history" className="link-btn-sm">Tout voir →</Link>
        </div>
        {recentPayments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <p className="empty-state-text">Aucun paiement enregistré</p>
          </div>
        ) : (
          <div className="m-list-card">
            {recentPayments.map(c => (
              <div key={c.id} className="m-list-item">
                <div className="m-list-icon paid-bg">✅</div>
                <div className="m-list-info">
                  <p className="m-list-name">{c.period}</p>
                  <p className="m-list-meta"><MethodLabel m={c.method} /> · {fmtDate(c.date)}</p>
                </div>
                <div className="m-list-amount paid-text">{c.amount.toLocaleString('fr-FR')} FCFA</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
