import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import AppLogo from '../../assets/AppLogo';
import './auth.css';

export default function LoginScreen() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 9);
    const parts  = digits.match(/.{1,2}/g) || [];
    return parts.join(' ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleaned = phone.replace(/\s/g, '');
    if (cleaned.length < 9) { setError('Entrez un numéro valide (ex: 77 123 45 67)'); return; }
    if (!password)           { setError('Entrez votre mot de passe'); return; }

    setLoading(true);
    try {
      await login(cleaned, password);
      const role = useAuthStore.getState().role;
      navigate(role === 'admin' ? '/admin' : '/member');
    } catch (err: any) {
      setError(err.message || 'Numéro ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <AppLogo size={90} textColor="dark" showText />
          <p className="logo-subtitle">Gestion des associations &amp; dahiras</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Numéro de téléphone</label>
            <div className="phone-input-wrap">
              <span className="phone-prefix">🇸🇳 +221</span>
              <input
                type="tel"
                className="form-input phone-input"
                placeholder="77 123 45 67"
                value={phone}
                onChange={e => setPhone(formatPhone(e.target.value))}
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <div className="phone-input-wrap">
              <input
                type={showPwd ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15 }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px', color: '#888', fontSize: 18 }}
              >
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <span className="btn-loading"><span className="spinner" /> Connexion...</span>
            ) : 'Se connecter'}
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <p className="auth-hint">
            Contactez votre administrateur pour obtenir vos identifiants.
          </p>
          <button className="btn-text" onClick={() => navigate('/register')}>
            Nouveau ? Créer un compte →
          </button>
        </div>
      </div>
    </div>
  );
}
