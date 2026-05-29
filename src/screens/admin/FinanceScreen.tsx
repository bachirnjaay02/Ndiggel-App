import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import orangeMoneyImg from '../../assets/orange-money.png';
import waveImg from '../../assets/wave.png';
import './admin.css';

type Tab = 'cotisations' | 'depenses' | 'epargne';

function fmtAmount(n: number) { return n.toLocaleString('fr-FR') + ' FCFA'; }
function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function MethodLabel({ m }: { m: string }) {
  if (m === 'orange_money') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><img src={orangeMoneyImg} alt="" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover', verticalAlign: 'middle' }} /> Orange Money</span>;
  if (m === 'wave')         return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><img src={waveImg} alt="" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover', verticalAlign: 'middle' }} /> Wave</span>;
  return <span>💵 Espèces</span>;
}

export default function FinanceScreen() {
  const {
    cotisations, expenses, savings, currentPeriod,
    addExpense, deleteExpense, addSaving, deleteSaving,
  } = useAppStore();

  const [tab, setTab]                 = useState<Tab>('cotisations');
  const [periodFilter, setPeriodFilter] = useState(currentPeriod);
  const [showExpModal, setShowExpModal] = useState(false);
  const [showSavModal, setShowSavModal] = useState(false);
  const [expForm, setExpForm]         = useState({ description: '', amount: '', category: 'Réunion' });
  const [savForm, setSavForm]         = useState({ description: '', amount: '', type: 'deposit' as 'deposit' | 'withdrawal' });
  const [deleteId, setDeleteId]       = useState<string | null>(null);
  const [deleteType, setDeleteType]   = useState<'expense' | 'saving'>('expense');

  const allPeriods = Array.from(new Set(cotisations.map(c => c.period))).sort((a, b) => b.localeCompare(a));

  const totalCollected = cotisations.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);
  const totalExpenses  = expenses.reduce((sum, e) => sum + e.amount, 0);
  const savingsBalance = savings.reduce((sum, s) => s.type === 'deposit' ? sum + s.amount : sum - s.amount, 0);

  const filteredCotisations = cotisations.filter(c => c.period === periodFilter);
  const paidCount = filteredCotisations.filter(c => c.status === 'paid').length;
  const collectionRate = filteredCotisations.length > 0 ? Math.round((paidCount / filteredCotisations.length) * 100) : 0;

  const handleAddExpense = () => {
    if (!expForm.description || !expForm.amount) return;
    addExpense(expForm.description, Number(expForm.amount), expForm.category);
    setExpForm({ description: '', amount: '', category: 'Réunion' });
    setShowExpModal(false);
  };

  const handleAddSaving = () => {
    if (!savForm.description || !savForm.amount) return;
    addSaving(savForm.description, Number(savForm.amount), savForm.type);
    setSavForm({ description: '', amount: '', type: 'deposit' });
    setShowSavModal(false);
  };

  const confirmDelete = (id: string, type: 'expense' | 'saving') => {
    setDeleteId(id); setDeleteType(type);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    if (deleteType === 'expense') deleteExpense(deleteId);
    else deleteSaving(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <div>
          <h1 className="screen-title">Finances</h1>
          <p className="screen-subtitle">Vue d'ensemble des flux</p>
        </div>
      </div>

      {/* Summary */}
      <div className="finance-summary">
        <div className="summary-item">
          <p className="summary-amount" style={{ color: 'var(--green)' }}>{fmtAmount(totalCollected)}</p>
          <p className="summary-label">Collecté</p>
        </div>
        <div className="summary-divider" />
        <div className="summary-item">
          <p className="summary-amount" style={{ color: '#ef4444' }}>{fmtAmount(totalExpenses)}</p>
          <p className="summary-label">Dépenses</p>
        </div>
        <div className="summary-divider" />
        <div className="summary-item">
          <p className="summary-amount" style={{ color: 'var(--purple)' }}>{fmtAmount(savingsBalance)}</p>
          <p className="summary-label">Économies</p>
        </div>
      </div>

      {/* Balance */}
      <div className="balance-card">
        <p className="balance-label">Solde net</p>
        <p className={`balance-amount ${totalCollected - totalExpenses >= 0 ? 'positive' : 'negative'}`}>
          {totalCollected - totalExpenses >= 0 ? '+' : ''}{fmtAmount(totalCollected - totalExpenses)}
        </p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${tab === 'cotisations' ? 'active' : ''}`} onClick={() => setTab('cotisations')}>Cotisations</button>
        <button className={`tab-btn ${tab === 'depenses'    ? 'active' : ''}`} onClick={() => setTab('depenses')}>Dépenses</button>
        <button className={`tab-btn ${tab === 'epargne'     ? 'active' : ''}`} onClick={() => setTab('epargne')}>Économies</button>
      </div>

      {/* ── Cotisations tab ── */}
      {tab === 'cotisations' && (
        <div className="section">
          {/* Period picker */}
          <div className="period-picker">
            {allPeriods.map(p => (
              <button
                key={p}
                className={`period-chip ${periodFilter === p ? 'period-chip-active' : ''}`}
                onClick={() => setPeriodFilter(p)}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Progress */}
          <div className="collect-progress-card" style={{ marginBottom: 16 }}>
            <div className="collect-progress-top">
              <span className="collect-progress-pct">{collectionRate}%</span>
              <span className="collect-progress-count">{paidCount} / {filteredCotisations.length} payés</span>
            </div>
            <div className="collect-progress-bar">
              <div className="collect-progress-fill" style={{ width: `${collectionRate}%` }} />
            </div>
          </div>

          <div className="list-card">
            {filteredCotisations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <p className="empty-state-text">Aucune cotisation pour cette période</p>
              </div>
            ) : (
              filteredCotisations.map(c => (
                <div key={c.id} className="list-item">
                  <div className="list-avatar">{c.memberName.charAt(0)}</div>
                  <div className="list-info">
                    <p className="list-name">{c.memberName}</p>
                    <p className="list-meta">{c.date ? <><MethodLabel m={c.method} /> · {fmtDate(c.date)}</> : 'Non payé'}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span className={`badge badge-${c.status}`}>
                      {c.status === 'paid' ? 'Payé' : c.status === 'pending' ? 'En attente' : 'En retard'}
                    </span>
                    {c.status === 'paid' && (
                      <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>
                        +{c.amount.toLocaleString('fr-FR')}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Dépenses tab ── */}
      {tab === 'depenses' && (
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">Dépenses</h2>
            <button className="btn-primary" onClick={() => setShowExpModal(true)}>+ Ajouter</button>
          </div>
          <div className="list-card">
            {expenses.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <p className="empty-state-text">Aucune dépense enregistrée</p>
              </div>
            ) : (
              expenses.map(e => (
                <div key={e.id} className="list-item">
                  <div className="list-avatar" style={{ background: '#fee2e230', color: '#ef4444', fontSize: 18 }}>💸</div>
                  <div className="list-info">
                    <p className="list-name">{e.description}</p>
                    <p className="list-meta">{e.category} · {fmtDate(e.date)}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <div className="list-amount expense">-{e.amount.toLocaleString('fr-FR')}</div>
                    <button className="btn-xs btn-xs-danger" onClick={() => confirmDelete(e.id, 'expense')}>Supprimer</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Épargne tab ── */}
      {tab === 'epargne' && (
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">Économies</h2>
            <button className="btn-primary" onClick={() => setShowSavModal(true)}>+ Mouvement</button>
          </div>
          <div className="stat-card stat-purple" style={{ marginBottom: 16 }}>
            <p className="stat-label">Solde actuel</p>
            <p className="stat-value">{fmtAmount(savingsBalance)}</p>
          </div>
          <div className="list-card">
            {savings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏦</div>
                <p className="empty-state-text">Aucun mouvement enregistré</p>
              </div>
            ) : (
              savings.map(s => (
                <div key={s.id} className="list-item">
                  <div className="list-avatar" style={{
                    background: s.type === 'deposit' ? '#d1fae5' : '#fee2e2',
                    color: s.type === 'deposit' ? '#22c55e' : '#ef4444',
                    fontSize: 18, fontWeight: 700,
                  }}>
                    {s.type === 'deposit' ? '↑' : '↓'}
                  </div>
                  <div className="list-info">
                    <p className="list-name">{s.description}</p>
                    <p className="list-meta">{fmtDate(s.date)} · {s.type === 'deposit' ? 'Dépôt' : 'Retrait'}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <div className={`list-amount ${s.type === 'deposit' ? 'paid' : 'expense'}`}>
                      {s.type === 'deposit' ? '+' : '-'}{s.amount.toLocaleString('fr-FR')}
                    </div>
                    <button className="btn-xs btn-xs-danger" onClick={() => confirmDelete(s.id, 'saving')}>Supprimer</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Add expense modal ── */}
      {showExpModal && (
        <div className="modal-overlay" onClick={() => setShowExpModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Ajouter une dépense</h2>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" placeholder="Ex: Location salle" autoFocus value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Montant (FCFA)</label>
              <input className="form-input" type="number" min="0" placeholder="0" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Catégorie</label>
              <select className="form-select" value={expForm.category} onChange={e => setExpForm(f => ({ ...f, category: e.target.value }))}>
                <option>Réunion</option>
                <option>Administration</option>
                <option>Aide sociale</option>
                <option>Transport</option>
                <option>Autre</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setShowExpModal(false)}>Annuler</button>
              <button className="btn-primary" onClick={handleAddExpense} disabled={!expForm.description || !expForm.amount}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add saving modal ── */}
      {showSavModal && (
        <div className="modal-overlay" onClick={() => setShowSavModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Mouvement d'épargne</h2>
            <div className="form-group">
              <label className="form-label">Type</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {(['deposit', 'withdrawal'] as const).map(t => (
                  <button key={t} className={`type-toggle ${savForm.type === t ? 'type-toggle-active' : ''}`} onClick={() => setSavForm(f => ({ ...f, type: t }))}>
                    {t === 'deposit' ? '↑ Dépôt' : '↓ Retrait'}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" placeholder="Ex: Cotisations accumulées" value={savForm.description} onChange={e => setSavForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Montant (FCFA)</label>
              <input className="form-input" type="number" min="0" placeholder="0" value={savForm.amount} onChange={e => setSavForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setShowSavModal(false)}>Annuler</button>
              <button className="btn-primary" onClick={handleAddSaving} disabled={!savForm.description || !savForm.amount}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🗑️</div>
              <h2 className="modal-title">Supprimer cet élément ?</h2>
              <p style={{ color: '#666', fontSize: 14 }}>Cette action est irréversible.</p>
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setDeleteId(null)}>Annuler</button>
              <button className="btn-danger" onClick={handleDelete}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
