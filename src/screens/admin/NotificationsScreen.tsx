import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import type { NotificationType, NotificationTarget } from '../../store/appStore';
import './admin.css';

const TYPE_CONFIG: Record<NotificationType, { icon: string; label: string; defaultTitle: string }> = {
  reminder: { icon: '💰', label: 'Rappel de cotisation', defaultTitle: 'Rappel : Cotisation du mois' },
  update:   { icon: '📢', label: 'Annonce générale',     defaultTitle: 'Nouvelle annonce' },
  info:     { icon: 'ℹ️',  label: 'Information',          defaultTitle: 'Information importante' },
};

const TARGET_LABELS: Record<NotificationTarget, string> = {
  all:     '👥 Tous les membres actifs',
  pending: '⏳ Membres n\'ayant pas encore cotisé',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function NotificationsScreen() {
  const { notifications, sendNotification, deleteNotification } = useAppStore();

  const [showModal, setShowModal]         = useState(false);
  const [type, setType]                   = useState<NotificationType>('reminder');
  const [target, setTarget]               = useState<NotificationTarget>('all');
  const [title, setTitle]                 = useState('');
  const [message, setMessage]             = useState('');
  const [sending, setSending]             = useState(false);
  const [toast, setToast]                 = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const openModal = () => {
    setType('reminder');
    setTarget('all');
    setTitle(TYPE_CONFIG['reminder'].defaultTitle);
    setMessage('');
    setShowModal(true);
  };

  const handleTypeChange = (t: NotificationType) => {
    setType(t);
    setTitle(TYPE_CONFIG[t].defaultTitle);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      showToast('Veuillez remplir le titre et le message.');
      return;
    }
    setSending(true);
    try {
      await sendNotification(title.trim(), message.trim(), type, target);
      setShowModal(false);
      showToast('✅ Alerte envoyée avec succès !');
    } catch {
      showToast('Erreur lors de l\'envoi. Réessayez.');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteNotification(id);
    setConfirmDeleteId(null);
    showToast('Notification supprimée.');
  };

  const reminderCount = notifications.filter(n => n.type === 'reminder').length;
  const otherCount    = notifications.filter(n => n.type !== 'reminder').length;

  return (
    <div className="screen">
      {toast && <div className="toast">{toast}</div>}

      <div className="screen-header">
        <div>
          <h1 className="screen-title">Alertes & Notifications</h1>
          <p className="screen-subtitle">
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''} envoyée{notifications.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-primary" onClick={openModal}>
          + Envoyer une alerte
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="stat-card stat-green anim-fade-up">
          <p className="stat-label">Total envoyées</p>
          <p className="stat-value">{notifications.length}</p>
          <p className="stat-sub">notifications</p>
        </div>
        <div className="stat-card stat-orange anim-fade-up delay-1">
          <p className="stat-label">Rappels cotisation</p>
          <p className="stat-value">{reminderCount}</p>
          <p className="stat-sub">envoyés</p>
        </div>
        <div className="stat-card stat-purple anim-fade-up delay-2">
          <p className="stat-label">Annonces & Infos</p>
          <p className="stat-value">{otherCount}</p>
          <p className="stat-sub">envoyées</p>
        </div>
      </div>

      {/* Notifications list */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Historique des alertes</h2>
        </div>

        {notifications.length === 0 ? (
          <div className="list-card">
            <div className="empty-state">
              <div className="empty-state-icon">🔔</div>
              <p className="empty-state-text">Aucune alerte envoyée pour l'instant</p>
            </div>
          </div>
        ) : (
          <div className="notif-list">
            {notifications.map((n, i) => (
              <div
                key={n.id}
                className={`notif-item notif-${n.type}`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="notif-icon-wrap">{TYPE_CONFIG[n.type]?.icon ?? 'ℹ️'}</div>
                <div className="notif-body">
                  <div className="notif-row">
                    <p className="notif-title">{n.title}</p>
                    <span className={`notif-type-badge notif-type-${n.type}`}>
                      {TYPE_CONFIG[n.type]?.label}
                    </span>
                  </div>
                  <p className="notif-message">{n.message}</p>
                  <div className="notif-meta">
                    <span>{TARGET_LABELS[n.target]}</span>
                    <span>·</span>
                    <span>{fmtDate(n.createdAt)}</span>
                  </div>
                </div>
                <div className="notif-actions">
                  {confirmDeleteId === n.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-xs btn-xs-danger" onClick={() => handleDelete(n.id)}>
                        Suppr.
                      </button>
                      <button className="btn-xs btn-xs-ghost" onClick={() => setConfirmDeleteId(null)}>
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button className="btn-xs btn-xs-ghost" onClick={() => setConfirmDeleteId(n.id)}>
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compose modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => !sending && setShowModal(false)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">📣 Nouvelle alerte</h2>

            <div className="form-group">
              <label className="form-label">Type d'alerte</label>
              <div className="notif-type-picker">
                {(Object.keys(TYPE_CONFIG) as NotificationType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`notif-type-option ${type === t ? 'active' : ''}`}
                    onClick={() => handleTypeChange(t)}
                  >
                    <span style={{ fontSize: 18 }}>{TYPE_CONFIG[t].icon}</span>
                    <span>{TYPE_CONFIG[t].label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Destinataires</label>
              <select
                className="form-select"
                value={target}
                onChange={e => setTarget(e.target.value as NotificationTarget)}
              >
                <option value="all">👥 Tous les membres actifs</option>
                <option value="pending">⏳ Membres n'ayant pas encore cotisé ce mois</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Titre</label>
              <input
                className="form-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Rappel de cotisation Juin 2026"
                maxLength={80}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea
                className="form-input"
                style={{ minHeight: 90, resize: 'vertical' }}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Écrivez votre message ici…"
                maxLength={300}
              />
              <p style={{ fontSize: 11, color: 'var(--gray-400)', margin: '4px 0 0', textAlign: 'right' }}>
                {message.length}/300
              </p>
            </div>

            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setShowModal(false)} disabled={sending}>
                Annuler
              </button>
              <button className="btn-primary" onClick={handleSend} disabled={sending}>
                {sending ? 'Envoi en cours…' : '📣 Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
