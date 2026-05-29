import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import orangeMoneyImg from '../../assets/orange-money.png';
import waveImg from '../../assets/wave.png';
import './member.css';

function methodName(m: string) {
  if (m === 'orange_money') return 'Orange Money';
  if (m === 'wave') return 'Wave';
  return 'Espèces';
}
function MethodIcon({ m }: { m: string }) {
  if (m === 'orange_money') return <img src={orangeMoneyImg} alt="Orange Money" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />;
  if (m === 'wave')         return <img src={waveImg} alt="Wave" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />;
  return <span style={{ fontSize: 20 }}>💵</span>;
}
function fmtDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function HistoryScreen() {
  const { user } = useAuthStore();
  const { cotisations } = useAppStore();

  const myPayments = cotisations
    .filter(c => c.memberId === user?.id && c.status === 'paid')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPaid = myPayments.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', margin: '0 0 16px' }}>
        Historique
      </h1>

      <div className="history-total">
        <p className="history-total-amount">{totalPaid.toLocaleString('fr-FR')} FCFA</p>
        <p className="history-total-label">{myPayments.length} paiement{myPayments.length > 1 ? 's' : ''} effectué{myPayments.length > 1 ? 's' : ''}</p>
      </div>

      {myPayments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p className="empty-state-text">Aucun paiement enregistré</p>
        </div>
      ) : (
        <div className="m-list-card">
          {myPayments.map(c => (
            <div key={c.id} className="m-list-item">
              <div className="m-list-icon" style={{ background: 'transparent', padding: 0, overflow: 'hidden' }}>
                <MethodIcon m={c.method} />
              </div>
              <div className="m-list-info">
                <p className="m-list-name">{c.period}</p>
                <p className="m-list-meta">{methodName(c.method)} · {fmtDate(c.date)}</p>
              </div>
              <div className="m-list-amount" style={{ color: '#22c55e' }}>
                +{c.amount.toLocaleString('fr-FR')} FCFA
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
