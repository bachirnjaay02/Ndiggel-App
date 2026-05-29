import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import AppLogo from '../../assets/AppLogo';
import './auth.css';

type RoleChoice = 'admin' | 'member' | null;

const TYPES = [
  'Dahira', 'Association sportive', 'Tontine / Natt',
  'Association culturelle', 'Groupement de femmes', 'Autre',
];

const formatPhone = (val: string) => {
  const digits = val.replace(/\D/g, '').slice(0, 9);
  const parts  = digits.match(/.{1,2}/g) || [];
  return parts.join(' ');
};

export default function RegisterScreen() {
  const navigate = useNavigate();
  const { register } = useAuthStore();

  const [step, setStep]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showPwd, setShowPwd]   = useState(false);

  // Step 1: role
  const [roleChoice, setRoleChoice] = useState<RoleChoice>(null);

  // Step 2 — admin: association to create
  const [assocName, setAssocName] = useState('');
  const [assocType, setAssocType] = useState('');
  const [assocCity, setAssocCity] = useState('');

  // Step 2 — member: join code + preview
  const [joinCode,  setJoinCode]  = useState('');
  const [assocPreview, setAssocPreview] = useState<{ id: string; name: string } | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  // Step 3: personal info
  const [name,     setName]     = useState('');
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');

  const totalSteps = 3;
  const progress   = `${(step / totalSteps) * 100}%`;

  const goBack = () => { setError(''); setStep(s => s - 1); };

  // ── Step 2 member: lookup association by join code ──
  const handleLookupCode = async () => {
    setError('');
    const code = joinCode.toUpperCase().trim();
    if (code.length < 4) { setError('Entrez le code d\'adhésion complet (ex: AB12CD)'); return; }
    setLookingUp(true);
    const { data, error: err } = await supabase
      .from('associations')
      .select('id, name')
      .eq('join_code', code)
      .single();
    setLookingUp(false);
    if (err || !data) { setError('Code invalide. Vérifiez le code fourni par votre dirigeant.'); return; }
    setAssocPreview(data);
  };

  // ── Step navigation ──
  const handleNext = () => {
    setError('');
    if (step === 1) {
      if (!roleChoice) { setError('Choisissez votre rôle pour continuer.'); return; }
      setStep(2);
    } else if (step === 2) {
      if (roleChoice === 'admin') {
        if (!assocName.trim() || !assocType || !assocCity.trim()) {
          setError('Remplissez tous les champs de l\'association.');
          return;
        }
      } else {
        if (!assocPreview) { setError('Recherchez et validez d\'abord votre code d\'adhésion.'); return; }
      }
      setStep(3);
    }
  };

  // ── Final submit ──
  const handleSubmit = async () => {
    setError('');
    if (!name.trim())                    { setError('Entrez votre nom complet.'); return; }
    if (phone.replace(/\s/g,'').length < 9) { setError('Entrez un numéro valide (ex: 77 123 45 67)'); return; }
    if (password.length < 6)             { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    if (password !== confirm)            { setError('Les mots de passe ne correspondent pas.'); return; }

    setLoading(true);
    try {
      const assocArg = roleChoice === 'admin'
        ? ({ mode: 'create' as const, name: assocName, type: assocType, city: assocCity })
        : ({ mode: 'join'   as const, joinCode });

      await register(roleChoice!, { name: name.trim(), phone, password }, assocArg);

      navigate(roleChoice === 'admin' ? '/admin' : '/member');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card auth-card-wide">

        <div className="auth-logo">
          <AppLogo size={56} showText={false} />
          <h1 className="logo-title">Créer un compte</h1>
          <p className="logo-subtitle">Étape {step} sur {totalSteps}</p>
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: progress }} />
        </div>

        {/* ── Step 1: Role ── */}
        {step === 1 && (
          <div className="auth-form">
            <p className="form-label" style={{ textAlign: 'center', marginBottom: 8 }}>
              Vous êtes…
            </p>
            <div className="role-grid">
              <button
                type="button"
                className={`role-card ${roleChoice === 'admin' ? 'role-card-active' : ''}`}
                onClick={() => setRoleChoice('admin')}
              >
                <span className="role-icon">🏛️</span>
                <span className="role-name">Dirigeant</span>
                <span className="role-desc">Créer et gérer une association</span>
              </button>
              <button
                type="button"
                className={`role-card ${roleChoice === 'member' ? 'role-card-active' : ''}`}
                onClick={() => setRoleChoice('member')}
              >
                <span className="role-icon">👤</span>
                <span className="role-name">Membre</span>
                <span className="role-desc">Rejoindre une association existante</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2a: Admin — Association info ── */}
        {step === 2 && roleChoice === 'admin' && (
          <div className="auth-form">
            <div className="form-group">
              <label className="form-label">Nom de l'association *</label>
              <input
                className="form-input"
                placeholder="Ex: Dahira Mouridiyya Dakar"
                value={assocName}
                onChange={e => setAssocName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Type *</label>
              <div className="type-grid">
                {TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`type-btn ${assocType === t ? 'type-btn-active' : ''}`}
                    onClick={() => setAssocType(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Ville *</label>
              <input
                className="form-input"
                placeholder="Ex: Dakar, Thiès, Touba..."
                value={assocCity}
                onChange={e => setAssocCity(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ── Step 2b: Membre — Join code ── */}
        {step === 2 && roleChoice === 'member' && (
          <div className="auth-form">
            <div className="form-group">
              <label className="form-label">Code d'adhésion *</label>
              <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: '0 0 8px' }}>
                Ce code de 6 caractères vous est fourni par le dirigeant de votre association.
              </p>
              <div className="join-code-wrap">
                <input
                  className="form-input join-code-input"
                  placeholder="Ex: AB12CD"
                  value={joinCode}
                  maxLength={6}
                  style={{ textTransform: 'uppercase', letterSpacing: 4, fontWeight: 700, fontSize: 18 }}
                  onChange={e => {
                    setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6));
                    setAssocPreview(null);
                    setError('');
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn-outline"
                  style={{ marginTop: 8 }}
                  onClick={handleLookupCode}
                  disabled={lookingUp || joinCode.length < 4}
                >
                  {lookingUp ? <span className="btn-loading"><span className="spinner" /> Recherche...</span> : 'Vérifier le code'}
                </button>
              </div>
            </div>

            {assocPreview && (
              <div className="recap-card" style={{ borderColor: 'var(--green)', background: 'var(--green-light)' }}>
                <p className="recap-title" style={{ color: 'var(--green-dark)' }}>✅ Association trouvée</p>
                <p style={{ fontWeight: 700, color: 'var(--green-dark)', fontSize: 15, margin: 0 }}>
                  {assocPreview.name}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Personal info ── */}
        {step === 3 && (
          <div className="auth-form">
            {roleChoice === 'member' && assocPreview && (
              <div className="recap-card" style={{ borderColor: 'var(--green)', marginBottom: 4 }}>
                <p className="recap-title">Association</p>
                <p style={{ fontWeight: 700, margin: 0 }}>{assocPreview.name}</p>
              </div>
            )}
            {roleChoice === 'admin' && (
              <div className="recap-card" style={{ borderColor: 'var(--green)', marginBottom: 4 }}>
                <p className="recap-title">Association à créer</p>
                <p style={{ fontWeight: 700, margin: 0 }}>{assocName} — {assocCity}</p>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Votre nom complet *</label>
              <input
                className="form-input"
                placeholder="Ex: Serigne Abdou Diop"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Numéro de téléphone *</label>
              <div className="phone-input-wrap">
                <span className="phone-prefix">🇸🇳 +221</span>
                <input
                  type="tel"
                  className="form-input phone-input"
                  placeholder="77 123 45 67"
                  value={phone}
                  onChange={e => setPhone(formatPhone(e.target.value))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mot de passe *</label>
              <div className="phone-input-wrap">
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Au moins 6 caractères"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 10px', color: '#888', fontSize: 18 }}
                >
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirmer le mot de passe *</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
              />
            </div>
          </div>
        )}

        {error && <p className="form-error">{error}</p>}

        {/* ── Actions ── */}
        {step < 3 ? (
          <button
            type="button"
            className="btn-primary"
            onClick={handleNext}
            disabled={step === 1 && !roleChoice}
          >
            Continuer →
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <span className="btn-loading"><span className="spinner" /> Création du compte...</span>
              : roleChoice === 'admin' ? "Créer l'association et mon compte" : 'Créer mon compte'}
          </button>
        )}

        {step > 1 && (
          <button type="button" className="btn-outline" onClick={goBack} disabled={loading}>
            ← Retour
          </button>
        )}

        <button type="button" className="btn-text" onClick={() => navigate('/login')}>
          Déjà un compte ? Se connecter
        </button>
      </div>
    </div>
  );
}
