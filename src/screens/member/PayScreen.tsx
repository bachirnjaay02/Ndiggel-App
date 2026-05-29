import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import orangeMoneyImg from '../../assets/orange-money.png';
import waveImg from '../../assets/wave.png';
import './member.css';

type Step   = 'select' | 'pin' | 'loading' | 'success';
type Method = 'orange_money' | 'wave';

function genTxId() {
  return 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

export default function PayScreen() {
  const navigate = useNavigate();
  const { user }  = useAuthStore();
  const { monthlyCotisationAmount, currentPeriod, cotisations, addCotisation } = useAppStore();

  const [method,  setMethod]  = useState<Method | null>(null);
  const [step,    setStep]    = useState<Step>('select');
  const [pin,     setPin]     = useState(['', '', '', '']);
  const [pinErr,  setPinErr]  = useState('');
  const [txId,    setTxId]    = useState('');
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  const alreadyPaid = cotisations.some(
    c => c.memberId === user?.id && c.period === currentPeriod && c.status === 'paid'
  );

  const handlePinChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...pin];
    next[i] = val.slice(-1);
    setPin(next);
    if (val && i < 3) pinRefs.current[i + 1]?.focus();
    if (next.every(d => d !== '')) handleConfirmPin(next.join(''));
  };

  const handlePinKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[i] && i > 0) pinRefs.current[i - 1]?.focus();
  };

  const handleConfirmPin = async (code: string) => {
    if (code.length < 4) return;
    setPinErr('');
    // Simulate: any 4-digit PIN passes (except 0000)
    if (code === '0000') {
      setPinErr('PIN incorrect. Réessayez.');
      setPin(['', '', '', '']);
      pinRefs.current[0]?.focus();
      return;
    }
    setStep('loading');
    await new Promise(r => setTimeout(r, 2200));
    const id = genTxId();
    setTxId(id);
    addCotisation(user!.id, user!.name, monthlyCotisationAmount, method!);
    setStep('success');
  };

  // Already paid screen
  if (alreadyPaid && step === 'select') {
    return (
      <div className="success-screen">
        <div className="success-icon">✅</div>
        <h2 className="success-title">Déjà payé !</h2>
        <p className="success-text">Votre cotisation de {currentPeriod} a déjà été réglée. Merci pour votre ponctualité !</p>
        <button className="btn-full btn-full-outline" onClick={() => navigate('/member')}>Retour à l'accueil</button>
      </div>
    );
  }

  // Loading
  if (step === 'loading') {
    return (
      <div className="pay-loading-screen">
        <div className="spinner-pay" />
        <p className="pay-loading-title">Traitement en cours…</p>
        <p className="pay-loading-sub">via {method === 'orange_money' ? 'Orange Money' : 'Wave'}</p>
      </div>
    );
  }

  // Success
  if (step === 'success') {
    return (
      <div className="success-screen">
        <div className="success-icon">✅</div>
        <h2 className="success-title">Paiement réussi !</h2>
        <p className="success-text">
          Votre cotisation de <strong>{currentPeriod}</strong> ({monthlyCotisationAmount.toLocaleString('fr-FR')} FCFA)
          {' '}a été enregistrée.
        </p>
        <div className="receipt-card">
          <div className="receipt-row"><span>Méthode</span><strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}><img src={method === 'orange_money' ? orangeMoneyImg : waveImg} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />{method === 'orange_money' ? 'Orange Money' : 'Wave'}</strong></div>
          <div className="receipt-row"><span>Montant</span><strong>{monthlyCotisationAmount.toLocaleString('fr-FR')} FCFA</strong></div>
          <div className="receipt-row"><span>Période</span><strong>{currentPeriod}</strong></div>
          <div className="receipt-row"><span>Transaction</span><strong className="tx-id">{txId}</strong></div>
          <div className="receipt-row"><span>Date</span><strong>{new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
        </div>
        <button className="btn-full btn-full-primary" onClick={() => navigate('/member')}>Retour à l'accueil</button>
      </div>
    );
  }

  // PIN entry
  if (step === 'pin') {
    return (
      <div>
        <button className="back-btn" onClick={() => { setStep('select'); setPin(['', '', '', '']); setPinErr(''); }}>← Retour</button>
        <div className="pay-pin-screen">
          <div className={`pay-method-badge ${method}`}>
            <img src={method === 'orange_money' ? orangeMoneyImg : waveImg} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', marginRight: 8 }} />
            {method === 'orange_money' ? 'Orange Money' : 'Wave'}
          </div>
          <p className="pin-title">Entrez votre code PIN</p>
          <p className="pin-sub">{monthlyCotisationAmount.toLocaleString('fr-FR')} FCFA · {currentPeriod}</p>
          <div className="pin-inputs">
            {pin.map((d, i) => (
              <input
                key={i}
                ref={el => { pinRefs.current[i] = el; }}
                type="password"
                inputMode="numeric"
                maxLength={1}
                className={`pin-input ${d ? 'pin-filled' : ''}`}
                value={d}
                onChange={e => handlePinChange(i, e.target.value)}
                onKeyDown={e => handlePinKey(i, e)}
              />
            ))}
          </div>
          {pinErr && <p className="pin-error">{pinErr}</p>}
          <p className="pin-hint">💡 Entrez n'importe quel PIN (sauf 0000) pour simuler</p>
        </div>
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

      <h2 className="pay-method-title">Choisir le moyen de paiement</h2>

      <div className="method-list">
        <div className={`method-card ${method === 'orange_money' ? 'selected' : ''}`} onClick={() => setMethod('orange_money')}>
          <img src={orangeMoneyImg} alt="Orange Money" className="method-logo-img" />
          <div>
            <p className="method-name">Orange Money</p>
            <p className="method-desc">Paiement instantané · Sénégal</p>
          </div>
          <div className="method-check">{method === 'orange_money' ? '✓' : ''}</div>
        </div>

        <div className={`method-card ${method === 'wave' ? 'selected' : ''}`} onClick={() => setMethod('wave')}>
          <img src={waveImg} alt="Wave" className="method-logo-img" />
          <div>
            <p className="method-name">Wave</p>
            <p className="method-desc">Paiement instantané · 0% frais</p>
          </div>
          <div className="method-check">{method === 'wave' ? '✓' : ''}</div>
        </div>
      </div>

      <button
        className="btn-full btn-full-primary"
        onClick={() => { if (method) { setStep('pin'); setTimeout(() => pinRefs.current[0]?.focus(), 100); } }}
        disabled={!method}
      >
        Continuer →
      </button>
    </div>
  );
}
