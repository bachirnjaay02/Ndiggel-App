import React, { useState } from 'react';
import { useAppStore, Member, Cotisation } from '../../store/appStore';
import orangeMoneyImg from '../../assets/orange-money.png';
import waveImg from '../../assets/wave.png';
import './admin.css';

function fmtDateShort(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateJoined(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
}
function MethodBadge({ m }: { m: string }) {
  if (m === 'orange_money') return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><img src={orangeMoneyImg} alt="" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} /> Orange Money</span>;
  if (m === 'wave')         return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><img src={waveImg} alt="" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} /> Wave</span>;
  return <span>💵 Espèces</span>;
}

type MarkMethod = 'wave' | 'orange_money' | 'cash';

export default function MembersScreen() {
  const { members, cotisations, currentPeriod, addMember, removeMember, toggleMemberStatus, markMemberPaid } = useAppStore();

  const [search, setSearch]           = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm]               = useState({ name: '', phone: '', password: '' });
  const [detailMember, setDetailMember] = useState<Member | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [markMethod, setMarkMethod]   = useState<MarkMethod>('wave');
  const [toast, setToast]             = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search)
  );

  const getPayStatus = (memberId: string) => {
    const c = cotisations.find(c => c.memberId === memberId && c.period === currentPeriod);
    return c?.status ?? 'pending';
  };

  const getMemberHistory = (memberId: string): Cotisation[] =>
    cotisations.filter(c => c.memberId === memberId).sort((a, b) => b.date.localeCompare(a.date));

  const handleAdd = async () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    const pwd = form.password.trim() || form.phone.trim().replace(/\s/g,'');
    try {
      await addMember(form.name.trim(), form.phone.trim().replace(/\s/g,''), pwd);
      setForm({ name: '', phone: '', password: '' });
      setShowAddModal(false);
      showToast('Membre ajouté — mot de passe: ' + (form.password.trim() || 'numéro de téléphone'));
    } catch (err: any) {
      showToast('Erreur : ' + (err.message || 'Impossible d\'ajouter ce membre'));
    }
  };

  const handleDelete = (id: string) => {
    removeMember(id);
    setDeleteConfirm(null);
    setDetailMember(null);
    showToast('Membre supprimé');
  };

  const handleMarkPaid = (member: Member) => {
    markMemberPaid(member.id, member.name, markMethod);
    showToast(`${member.name.split(' ')[0]} marqué payé via ${markMethod === 'wave' ? 'Wave' : markMethod === 'orange_money' ? 'Orange Money' : 'Espèces'}`);
  };

  const activeCount   = members.filter(m => m.status === 'active').length;
  const inactiveCount = members.filter(m => m.status === 'inactive').length;

  return (
    <div className="screen">
      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

      <div className="screen-header">
        <div>
          <h1 className="screen-title">Membres</h1>
          <p className="screen-subtitle">{activeCount} actifs · {inactiveCount} inactifs</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>+ Ajouter</button>
      </div>

      <div className="search-bar">
        <span>🔍</span>
        <input
          placeholder="Rechercher par nom ou téléphone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button className="search-clear" onClick={() => setSearch('')}>✕</button>}
      </div>

      <div className="list-card">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <p className="empty-state-text">Aucun membre trouvé</p>
          </div>
        ) : (
          filtered.map(member => {
            const payStatus = getPayStatus(member.id);
            return (
              <div
                key={member.id}
                className="list-item list-item-clickable"
                onClick={() => setDetailMember(member)}
              >
                <div className="list-avatar" style={{ opacity: member.status === 'inactive' ? 0.45 : 1 }}>
                  {member.name.charAt(0)}
                </div>
                <div className="list-info">
                  <p className="list-name">
                    {member.name}
                    {member.status === 'inactive' && <span className="inactive-tag"> · Inactif</span>}
                  </p>
                  <p className="list-meta">{member.phone} · Inscrit {fmtDateJoined(member.joinedAt)}</p>
                </div>
                <span className={`badge badge-${payStatus}`}>
                  {payStatus === 'paid' ? 'Payé' : payStatus === 'pending' ? 'En attente' : 'En retard'}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* ── Member detail modal ── */}
      {detailMember && (
        <div className="modal-overlay" onClick={() => setDetailMember(null)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-member-header">
              <div className="modal-avatar">{detailMember.name.charAt(0)}</div>
              <div>
                <p className="modal-member-name">{detailMember.name}</p>
                <p className="modal-member-phone">{detailMember.phone}</p>
              </div>
              <span className={`badge ${detailMember.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                {detailMember.status === 'active' ? 'Actif' : 'Inactif'}
              </span>
            </div>

            {/* Mark paid */}
            {getPayStatus(detailMember.id) !== 'paid' && detailMember.status === 'active' && (
              <div className="mark-paid-section">
                <p className="mark-paid-label">Marquer payé pour {currentPeriod}</p>
                <div className="mark-paid-methods">
                  {(['wave', 'orange_money', 'cash'] as MarkMethod[]).map(m => (
                    <button
                      key={m}
                      className={`method-chip ${markMethod === m ? 'method-chip-active' : ''}`}
                      onClick={() => setMarkMethod(m)}
                    >
                      {m === 'wave' && <img src={waveImg} alt="" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} />}
                      {m === 'orange_money' && <img src={orangeMoneyImg} alt="" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} />}
                      {m === 'wave' ? 'Wave' : m === 'orange_money' ? 'Orange Money' : '💵 Espèces'}
                    </button>
                  ))}
                </div>
                <button className="btn-primary" style={{ width: '100%' }} onClick={() => { handleMarkPaid(detailMember); setDetailMember(null); }}>
                  ✓ Confirmer le paiement
                </button>
              </div>
            )}
            {getPayStatus(detailMember.id) === 'paid' && (
              <div className="paid-this-month-banner">✅ A payé pour {currentPeriod}</div>
            )}

            {/* Payment history */}
            <div className="modal-section-title">Historique des paiements</div>
            <div className="modal-history">
              {getMemberHistory(detailMember.id).length === 0 ? (
                <p style={{ color: '#aaa', fontSize: 14, textAlign: 'center', padding: '12px 0' }}>Aucun paiement enregistré</p>
              ) : (
                getMemberHistory(detailMember.id).map(c => (
                  <div key={c.id} className="history-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className={`hist-dot ${c.status === 'paid' ? 'hist-dot-green' : 'hist-dot-red'}`} />
                      <div>
                        <p className="hist-period">{c.period}</p>
                        <p className="hist-meta">{c.status === 'paid' ? <><MethodBadge m={c.method} /> · {fmtDateShort(c.date)}</> : 'Non payé'}</p>
                      </div>
                    </div>
                    <span className={`badge badge-${c.status}`}>
                      {c.status === 'paid' ? `+${c.amount.toLocaleString('fr-FR')}` : c.status === 'pending' ? 'En attente' : 'En retard'}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Actions */}
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => { toggleMemberStatus(detailMember.id); setDetailMember(null); showToast(detailMember.status === 'active' ? 'Membre désactivé' : 'Membre réactivé'); }}>
                {detailMember.status === 'active' ? 'Désactiver' : 'Réactiver'}
              </button>
              <button className="btn-danger-outline" onClick={() => setDeleteConfirm(detailMember.id)}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
              <h2 className="modal-title">Supprimer ce membre ?</h2>
              <p style={{ color: '#666', fontSize: 14 }}>Cette action est irréversible. Tout l'historique sera conservé.</p>
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setDeleteConfirm(null)}>Annuler</button>
              <button className="btn-danger" onClick={() => handleDelete(deleteConfirm)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add member modal ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Ajouter un membre</h2>
            <div className="form-group">
              <label className="form-label">Nom complet</label>
              <input
                className="form-input"
                placeholder="Prénom Nom"
                value={form.name}
                autoFocus
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Téléphone</label>
              <input
                className="form-input"
                placeholder="77 XXX XX XX"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mot de passe <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>(optionnel — par défaut: numéro de tél.)</span></label>
              <input
                className="form-input"
                type="password"
                placeholder="Laisser vide pour utiliser le téléphone"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setShowAddModal(false)}>Annuler</button>
              <button className="btn-primary" onClick={handleAdd} disabled={!form.name.trim() || !form.phone.trim()}>
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
