import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAppStore, PLAN_AMOUNTS, PLAN_LABELS, PLAN_LIMITS, PlanKey } from '../../store/appStore';
import orangeMoneyImg from '../../assets/orange-money.png';
import waveImg from '../../assets/wave.png';
import './admin.css';

function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

const PLANS: { key: PlanKey; color: string }[] = [
  { key: 'starter',    color: '#6c757d' },
  { key: 'standard',  color: '#0d6efd' },
  { key: 'premium',   color: '#198754' },
  { key: 'enterprise',color: '#6f42c1' },
];

export default function SettingsScreen() {
  const { user } = useAuthStore();
  const location = useLocation();
  const {
    subscription, members, joinCode,
    monthlyCotisationAmount, updateMonthlyCotisationAmount,
    applySubscriptionActivation,
  } = useAppStore();

  const [editCotis,  setEditCotis]  = useState(false);
  const [cotisInput, setCotisInput] = useState('');
  const [showRenew,  setShowRenew]  = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>(subscription.plan);
  const [paying,     setPaying]     = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [toast,      setToast]      = useState('');

  // Show success toast when returning from PayTech
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('payment') === 'success') {
      const plan = (params.get('plan') as PlanKey) || 'starter';
      applySubscriptionActivation(plan);
      setToast('Paiement reçu ! Abonnement activé.');
      setTimeout(() => setToast(''), 4000);
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.search, location.pathname, applySubscriptionActivation]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const daysLeft = Math.ceil(
    (new Date(subscription.nextBillingDate).getTime() - Date.now()) / 86400000
  );

  const handleSaveCotis = () => {
    const val = Number(cotisInput);
    if (!val || val < 100) return;
    updateMonthlyCotisationAmount(val);
    setEditCotis(false);
    showToast('Montant de cotisation mis à jour');
  };

  const handleCopyCode = () => {
    if (!joinCode) return;
    navigator.clipboard.writeText(joinCode).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  const handlePayTech = async () => {
    setPaying(true);
    try {
      const res = await fetch('/api/paytech/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          associationId: user?.associationId,
          plan:          selectedPlan,
          amount:        PLAN_AMOUNTS[selectedPlan],
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.redirect_url) {
        throw new Error(json.error || 'Erreur PayTech');
      }
      window.location.href = json.redirect_url;
    } catch (err: any) {
      showToast('Erreur : ' + (err.message || 'Paiement impossible pour le moment'));
      setPaying(false);
    }
  };

  return (
    <div className="screen">
      {toast && <div className="toast">{toast}</div>}

      <div className="screen-header">
        <div>
          <h1 className="screen-title">Paramètres</h1>
          <p className="screen-subtitle">Gérez votre association</p>
        </div>
      </div>

      {/* ── Subscription card ── */}
      <div className={`sub-card ${daysLeft <= 7 ? 'sub-card-warn' : ''}`}>
        <div className="sub-card-top">
          <div>
            <p className="sub-plan">{PLAN_LABELS[subscription.plan] ?? subscription.plan}</p>
            <p className="sub-amount">{PLAN_AMOUNTS[subscription.plan]?.toLocaleString('fr-FR') ?? '—'} FCFA / mois</p>
          </div>
          <span className={`sub-status-badge ${subscription.status === 'active' ? 'active' : subscription.status === 'trial' ? 'trial' : 'expired'}`}>
            {subscription.status === 'active' ? '● Actif' : subscription.status === 'trial' ? '● Essai' : '● Expiré'}
          </span>
        </div>
        <div className="sub-next">
          <div>
            <p className="sub-next-label">
              {subscription.status === 'trial' ? 'Période d\'essai jusqu\'au' : 'Prochain renouvellement'}
            </p>
            <p className="sub-next-date">
              {fmtDate(subscription.nextBillingDate)}
              <span className={`days-left-chip ${daysLeft <= 7 ? 'urgent' : ''}`}>{daysLeft}j restants</span>
            </p>
          </div>
          <button className="sub-renew-btn" onClick={() => setShowRenew(true)}>
            {subscription.status === 'trial' ? 'S\'abonner' : 'Changer de plan'}
          </button>
        </div>
        {daysLeft <= 7 && (
          <div className="sub-warning">⚠️ Votre abonnement expire bientôt. Renouvelez pour continuer à utiliser l'app.</div>
        )}
      </div>

      {/* ── Association info ── */}
      <div className="settings-card">
        <h3 className="settings-card-title">Association</h3>
        <div className="settings-row">
          <span className="settings-key">Nom</span>
          <span className="settings-value">{user?.associationName}</span>
        </div>
        <div className="settings-row">
          <span className="settings-key">Dirigeant</span>
          <span className="settings-value">{user?.name}</span>
        </div>
        <div className="settings-row">
          <span className="settings-key">Téléphone</span>
          <span className="settings-value">{user?.phone}</span>
        </div>
        <div className="settings-row">
          <span className="settings-key">Membres actifs</span>
          <span className="settings-value">{members.filter(m => m.status === 'active').length}</span>
        </div>

        {/* Join code */}
        <div className="settings-row" style={{ alignItems: 'center' }}>
          <span className="settings-key">Code d'adhésion</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              className="join-code-display"
              style={{
                fontFamily: 'monospace', fontWeight: 800, fontSize: 18,
                letterSpacing: 4, color: 'var(--green-dark)',
                background: 'var(--green-light)', padding: '4px 10px',
                borderRadius: 8, border: '1.5px solid var(--green)',
              }}
            >
              {joinCode || '——'}
            </span>
            <button
              className="link-btn"
              style={{ fontSize: 12 }}
              onClick={handleCopyCode}
              disabled={!joinCode}
            >
              {codeCopied ? '✅ Copié' : '📋 Copier'}
            </button>
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>
          Partagez ce code avec vos membres pour qu'ils puissent rejoindre l'association.
        </p>
      </div>

      {/* ── Cotisation settings ── */}
      <div className="settings-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="settings-card-title" style={{ margin: 0 }}>Cotisation mensuelle</h3>
          {!editCotis && (
            <button className="link-btn" onClick={() => { setCotisInput(String(monthlyCotisationAmount)); setEditCotis(true); }} aria-label="Modifier le montant de cotisation">
              Modifier
            </button>
          )}
        </div>
        {editCotis ? (
          <div>
            <div className="form-group">
              <label className="form-label">Montant (FCFA)</label>
              <input
                className="form-input"
                type="number"
                min="100"
                value={cotisInput}
                autoFocus
                onChange={e => setCotisInput(e.target.value)}
              />
            </div>
            <div className="modal-actions" style={{ marginTop: 12 }}>
              <button className="btn-ghost" onClick={() => setEditCotis(false)}>Annuler</button>
              <button className="btn-primary" onClick={handleSaveCotis} disabled={!cotisInput || Number(cotisInput) < 100}>
                Enregistrer
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="settings-row">
              <span className="settings-key">Montant</span>
              <span className="settings-value" style={{ fontWeight: 800, color: 'var(--green-dark)', fontSize: 16 }}>
                {monthlyCotisationAmount.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
            <div className="settings-row">
              <span className="settings-key">Fréquence</span>
              <span className="settings-value">Mensuelle</span>
            </div>
          </>
        )}
      </div>

      {/* ── Payment methods ── */}
      <div className="settings-card">
        <h3 className="settings-card-title">Moyens de paiement acceptés</h3>
        <div className="settings-row">
          <span className="settings-key" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={orangeMoneyImg} alt="Orange Money" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
            Orange Money
          </span>
          <span className="badge badge-paid">Actif</span>
        </div>
        <div className="settings-row">
          <span className="settings-key" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={waveImg} alt="Wave" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
            Wave
          </span>
          <span className="badge badge-paid">Actif</span>
        </div>
        <div className="settings-row">
          <span className="settings-key">💵 Espèces</span>
          <span className="badge badge-paid">Actif</span>
        </div>
      </div>

      {/* ── Plan selection modal ── */}
      {showRenew && (
        <div className="modal-overlay" onClick={() => !paying && setShowRenew(false)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Choisir un plan</h2>
            <p style={{ color: 'var(--gray-500)', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
              Paiement sécurisé via Orange Money ou Wave
            </p>

            <div className="plan-grid">
              {PLANS.map(({ key, color }) => (
                <button
                  key={key}
                  type="button"
                  className={`plan-card ${selectedPlan === key ? 'plan-card-active' : ''}`}
                  onClick={() => setSelectedPlan(key)}
                  style={selectedPlan === key ? { borderColor: color, boxShadow: `0 0 0 2px ${color}33` } : {}}
                >
                  <span className="plan-name" style={{ color: selectedPlan === key ? color : undefined }}>
                    {PLAN_LABELS[key]}
                  </span>
                  <span className="plan-price">{PLAN_AMOUNTS[key].toLocaleString('fr-FR')} <small>FCFA/mois</small></span>
                  <span className="plan-limit">{PLAN_LIMITS[key]}</span>
                  {subscription.plan === key && (
                    <span className="plan-current-badge">Plan actuel</span>
                  )}
                </button>
              ))}
            </div>

            <div className="renew-summary" style={{ marginTop: 16 }}>
              <div className="renew-row">
                <span>Plan sélectionné</span>
                <strong>{PLAN_LABELS[selectedPlan]}</strong>
              </div>
              <div className="renew-row">
                <span>Durée</span>
                <strong>30 jours</strong>
              </div>
              <div className="renew-row renew-total">
                <span>Total</span>
                <strong>{PLAN_AMOUNTS[selectedPlan].toLocaleString('fr-FR')} FCFA</strong>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn-ghost" onClick={() => setShowRenew(false)} disabled={paying}>
                Annuler
              </button>
              <button className="btn-primary" onClick={handlePayTech} disabled={paying}>
                {paying
                  ? <span className="btn-loading"><span className="spinner" /> Redirection...</span>
                  : `Payer ${PLAN_AMOUNTS[selectedPlan].toLocaleString('fr-FR')} FCFA`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
