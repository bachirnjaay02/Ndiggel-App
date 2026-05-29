import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import orangeMoneyImg from '../../assets/orange-money.png';
import waveImg from '../../assets/wave.png';
import './admin.css';

function fmtAmount(n: number) { return n.toLocaleString('fr-FR') + ' FCFA'; }
function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}
function MethodLabel({ m }: { m: string }) {
  if (m === 'orange_money') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><img src={orangeMoneyImg} alt="" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} /> Orange Money</span>;
  if (m === 'wave')         return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><img src={waveImg} alt="" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} /> Wave</span>;
  return <span>💵 Espèces</span>;
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export default function DashboardScreen() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { members, cotisations, expenses, savings, subscription, currentPeriod, markMemberPaid } = useAppStore();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const activeMembers = members.filter(m => m.status === 'active');
  const currentCotisations = cotisations.filter(c => c.period === currentPeriod);
  const paidThisMonth = currentCotisations.filter(c => c.status === 'paid');
  const pendingMembers = activeMembers.filter(m => {
    const c = currentCotisations.find(c => c.memberId === m.id);
    return !c || c.status !== 'paid';
  });
  const totalCollected = paidThisMonth.reduce((sum, c) => sum + c.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const savingsBalance = savings.reduce((sum, s) => s.type === 'deposit' ? sum + s.amount : sum - s.amount, 0);
  const collectionRate = activeMembers.length > 0 ? Math.round((paidThisMonth.length / activeMembers.length) * 100) : 0;
  const recentPaid = cotisations.filter(c => c.status === 'paid').slice(0, 5);

  const subscriptionDaysLeft = Math.ceil(
    (new Date(subscription.nextBillingDate).getTime() - Date.now()) / 86400000
  );

  return (
    <div className="screen">
      <div className="screen-header">
        <div>
          <h1 className="screen-title">Tableau de bord</h1>
          <p className="screen-subtitle">{greeting()}, {user?.name?.split(' ')[0]} 👋</p>
        </div>
        <div className="assoc-badge">{user?.associationName}</div>
      </div>

      {subscriptionDaysLeft <= 7 && (
        <div className="alert alert-warning" onClick={() => navigate('/admin/settings')} style={{ cursor: 'pointer' }}>
          ⚠️ Abonnement expire dans <strong>{subscriptionDaysLeft} jour{subscriptionDaysLeft > 1 ? 's' : ''}</strong> — cliquez pour renouveler.
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card stat-green anim-fade-up" onClick={() => navigate('/admin/finance')} style={{ cursor: 'pointer' }}>
          <p className="stat-label">Collecté {currentPeriod}</p>
          <p className="stat-value">{fmtAmount(totalCollected)}</p>
          <p className="stat-sub">{paidThisMonth.length}/{activeMembers.length} membres payés</p>
        </div>
        <div className="stat-card stat-red anim-fade-up delay-1" onClick={() => navigate('/admin/members')} style={{ cursor: 'pointer' }}>
          <p className="stat-label">En attente</p>
          <p className="stat-value">{pendingMembers.length}</p>
          <p className="stat-sub">paiement{pendingMembers.length > 1 ? 's' : ''} non réglé{pendingMembers.length > 1 ? 's' : ''}</p>
        </div>
        <div className="stat-card stat-purple anim-fade-up delay-2" onClick={() => navigate('/admin/finance')} style={{ cursor: 'pointer' }}>
          <p className="stat-label">Économies</p>
          <p className="stat-value">{fmtAmount(savingsBalance)}</p>
          <p className="stat-sub">solde disponible</p>
        </div>
        <div className="stat-card stat-orange anim-fade-up delay-3" onClick={() => navigate('/admin/finance')} style={{ cursor: 'pointer' }}>
          <p className="stat-label">Dépenses totales</p>
          <p className="stat-value">{fmtAmount(totalExpenses)}</p>
          <p className="stat-sub">{expenses.length} opérations</p>
        </div>
      </div>

      {/* Collection progress */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Taux de collecte</h2>
          <span className="section-period">{currentPeriod}</span>
        </div>
        <div className="collect-progress-card">
          <div className="collect-progress-top">
            <span className="collect-progress-pct">{collectionRate}%</span>
            <span className="collect-progress-count">{paidThisMonth.length} / {activeMembers.length} membres</span>
          </div>
          <div className="collect-progress-bar">
            <div className="collect-progress-fill" style={{ width: `${collectionRate}%` }} />
          </div>
          {pendingMembers.length > 0 && (
            <p className="collect-progress-hint">
              {pendingMembers.map(m => m.name.split(' ')[0]).join(', ')} n'ont pas encore payé
            </p>
          )}
        </div>
      </div>

      {/* Pending members — quick mark paid */}
      {pendingMembers.length > 0 && (
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">À relancer</h2>
            <span className="badge badge-pending">{pendingMembers.length}</span>
          </div>
          <div className="list-card">
            {pendingMembers.map(member => {
              const c = currentCotisations.find(c => c.memberId === member.id);
              const status = c?.status ?? 'pending';
              return (
                <div key={member.id} className="list-item">
                  <div className="list-avatar">{member.name.charAt(0)}</div>
                  <div className="list-info">
                    <p className="list-name">{member.name}</p>
                    <p className="list-meta">{member.phone}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span className={`badge badge-${status}`}>
                      {status === 'pending' ? 'En attente' : 'En retard'}
                    </span>
                    {confirmId === member.id ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-xs btn-xs-green" onClick={() => { markMemberPaid(member.id, member.name, 'cash'); setConfirmId(null); }}>
                          ✓ Espèces
                        </button>
                        <button className="btn-xs btn-xs-ghost" onClick={() => setConfirmId(null)}>✕</button>
                      </div>
                    ) : (
                      <button className="btn-xs btn-xs-outline" onClick={() => setConfirmId(member.id)}>
                        Marquer payé
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent payments */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Derniers paiements</h2>
          <button className="link-btn" onClick={() => navigate('/admin/finance')}>Voir tout →</button>
        </div>
        <div className="list-card">
          {recentPaid.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💸</div>
              <p className="empty-state-text">Aucun paiement ce mois</p>
            </div>
          ) : (
            recentPaid.map(c => (
              <div key={c.id} className="list-item">
                <div className="list-avatar">{c.memberName.charAt(0)}</div>
                <div className="list-info">
                  <p className="list-name">{c.memberName}</p>
                  <p className="list-meta">{c.period} · <MethodLabel m={c.method} /> · {fmtDate(c.date)}</p>
                </div>
                <div className="list-amount paid">+{c.amount.toLocaleString('fr-FR')}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
