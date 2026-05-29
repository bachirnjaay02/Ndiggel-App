import { useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import AppLogo from '../../assets/AppLogo';
import './layouts.css';

const navItems = [
  { to: '/member',         label: 'Accueil',    icon: '🏠', end: true },
  { to: '/member/pay',     label: 'Payer',       icon: '💳' },
  { to: '/member/history', label: 'Historique',  icon: '📋' },
  { to: '/member/profile', label: 'Profil',      icon: '👤' },
];

export default function MemberLayout() {
  const { user } = useAuthStore();
  const { fetchAll } = useAppStore();

  useEffect(() => {
    if (user?.associationId) fetchAll(user.associationId);
  }, [user?.associationId, fetchAll]);

  return (
    <div className="member-layout">
      {/* Header */}
      <header className="member-header">
        <div className="member-header-logo">
          <AppLogo size={30} showText={false} />
          <span className="member-header-name">Ndiggël App</span>
        </div>
        <div className="member-header-notif">🔔</div>
      </header>

      {/* Content */}
      <main className="member-main">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="member-nav">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `member-nav-item ${isActive ? 'member-nav-item-active' : ''}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
