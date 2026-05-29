import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import AppLogo from '../../assets/AppLogo';
import './layouts.css';

const navItems = [
  { to: '/admin',          label: 'Tableau de bord', icon: '🏠', end: true },
  { to: '/admin/members',  label: 'Membres',          icon: '👥' },
  { to: '/admin/finance',  label: 'Finances',          icon: '💰' },
  { to: '/admin/settings', label: 'Paramètres',        icon: '⚙️' },
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const { fetchAll } = useAppStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (user?.associationId) fetchAll(user.associationId);
  }, [user?.associationId, fetchAll]);

  const handleLogout = () => { logout(); navigate('/login'); };
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="admin-layout">
      {/* Mobile overlay */}
      {menuOpen && <div className="sidebar-overlay" onClick={closeMenu} />}

      {/* Sidebar */}
      <aside className={`sidebar ${menuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-wrap">
            <AppLogo size={44} showText={false} />
          </div>
          <div>
            <p className="sidebar-app-name">Ndiggël</p>
            <span className="sidebar-role-badge">Dirigeant</span>
          </div>
        </div>

        <div className="sidebar-assoc">
          <p className="sidebar-assoc-name">{user?.associationName ?? 'Association'}</p>
          <span className="badge-active">Abonnement actif</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeMenu}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{user?.name?.charAt(0) ?? 'A'}</div>
            <div>
              <p className="user-name">{user?.name}</p>
              <p className="user-phone">{user?.phone}</p>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>🚪 Déconnexion</button>
        </div>
      </aside>

      {/* Content wrapper (header + main) */}
      <div className="admin-content-wrap">
        {/* Mobile header — hidden on desktop */}
        <header className="mobile-admin-header">
          <button className="mobile-menu-btn" onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? '✕' : '☰'}
          </button>
          <AppLogo size={26} showText={false} />
          <span className="mobile-admin-title">Ndiggël App</span>
        </header>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
