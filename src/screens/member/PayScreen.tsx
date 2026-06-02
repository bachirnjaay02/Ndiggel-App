import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import orangeMoneyImg from '../../assets/orange-money.png';
import waveImg from '../../assets/wave.png';
import './member.css';

type Method = 'orange_money' | 'wave';

export default function PayScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user }  = useAuthStore();
  const { monthlyCotisationAmount, currentPeriod, cotisations } = useAppStore();

  const [method,  setMethod]  = useState<Method | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const paymentStatus = searchParams.get('payment');
  const periodParam   = searchParams.get('period');

  const alreadyPaid = cotisations.some(
    c => c.memberId === user?.id && c.period === currentPeriod && c.status === 'paid'
  );

  const handlePay = async () => {
    if (!method || !user) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/paytech/cotisation', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          memberId:      user.id,
          memberName:    user.name,
          associationId: user.associationId,
          amount:        monthlyCotisationAmount,
          period:        currentPeriod,
          method,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur serveur');
      window.location.href = json.redirect_url;
    } catch (e: any) {
      setError(e.message || 'Erreur lors de l\'initialisation du paiement');
      setLoading(false);
    }
  };

  // Success — either from PayTech redirect or already paid
  if (paymentStatus === 'success' || (alreadyPaid && paymentStatus !== 'cancel')) {
    return (
      <div className="success-screen">
        <div className="success-icon">✅</div>
        <h2 className="success-title">Paiement réussi !</h2>
        <p className="success-text">
          Votre cotisation de <strong>{periodParam ?? currentPeriod}</strong> ({monthlyCotisationAmount.toLocaleString('fr-FR')} FCFA) a été enregistrée.
        </p>
        <button className="btn-full btn-full-primary" onClick={() => navigate('/member')}>
          Retour à l'accueil
        </button>
      </div>
    );
  }

  // Loading / redirecting to PayTech
  if (loading) {
    return (
      <div className="pay-loading-screen">
        <div className="spinner-pay" />
        <p className="pay-loading-title">Redirection vers le paiement…</p>
        <p className="pay-loading-sub">via {method === 'orange_money' ? 'Orange Money' : 'Wave'}</p>
      </div>
    );
  }

  // Method selection
  return (
    <div>
      <h1 className="pay-title">Payer la cotisation</h1>

      <div className="amount-card">
        <p className="amount-label">Montant à payer</p>
        <p className="amount-value">{monthlyCotisationAmount.toLocaleString('fr-FR')} FCFA</p>
        <p className="amount-period">{currentPeriod}</p>
      </div>

      {paymentStatus === 'cancel' && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          Paiement annulé. Vous pouvez réessayer.
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <h2 className="pay-method-title">Choisir le moyen de paiement</h2>

      <div className="method-list">
        <div className={`method-card ${method === 'orange_money' ? 'selected' : ''}`} onClick={() => setMethod('orange_money')}>
          <img src={orangeMoneyImg} alt="Orange Money" className="method-logo-img" />
          <div>
            <p className="method-name">Orange Money</p>
            <p className="method-desc">Paiement sécurisé · Sénégal</p>
          </div>
          <div className="method-check">{method === 'orange_money' ? '✓' : ''}</div>
        </div>

        <div className={`method-card ${method === 'wave' ? 'selected' : ''}`} onClick={() => setMethod('wave')}>
          <img src={waveImg} alt="Wave" className="method-logo-img" />
          <div>
            <p className="method-name">Wave</p>
            <p className="method-desc">Paiement sécurisé · 0% frais</p>
          </div>
          <div className="method-check">{method === 'wave' ? '✓' : ''}</div>
        </div>
      </div>

      <button
        className="btn-full btn-full-primary"
        onClick={handlePay}
        disabled={!method}
      >
        Payer {monthlyCotisationAmount.toLocaleString('fr-FR')} FCFA →
      </button>
    </div>
  );
}
