import { useState } from 'react';
import { useApp } from '../context/AppContext';
import NotificationPanel from './NotificationPanel';

const BUS_ICON = '🚌';

export default function Navbar() {
  const { user, logout, unreadCount } = useApp();
  const [showNotif, setShowNotif] = useState(false);

  const roleColors = {
    admin: 'role-badge-admin',
    driver: 'role-badge-driver',
    conductor: 'role-badge-conductor',
    parent: 'role-badge-parent',
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-logo">
            <span style={{ fontSize: '1.25rem' }}>{BUS_ICON}</span>
          </div>
          <div>
            <span style={{ fontSize: '1rem', fontWeight: 800 }}>BusTrack</span>
            <span style={{ color: 'var(--accent)', fontWeight: 800 }}>Pro</span>
          </div>
        </div>

        <div className="navbar-actions">
          {/* Notification Bell */}
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setShowNotif(v => !v)}
            style={{ position: 'relative' }}
            title="Notifications"
          >
            🔔
            {unreadCount > 0 && (
              <span className="notif-badge" style={{ position: 'absolute', top: '-4px', right: '-4px' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user?.name}
              </span>
              <span className={`badge ${roleColors[user?.role]} badge`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem' }}>
                {user?.role?.toUpperCase()}
              </span>
            </div>
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`}
              alt="avatar"
              className="avatar"
              style={{ width: 36, height: 36 }}
            />
          </div>

          <button className="btn btn-ghost btn-sm" onClick={logout}>
            Sign Out
          </button>
        </div>
      </nav>

      {showNotif && <NotificationPanel onClose={() => setShowNotif(false)} />}
    </>
  );
}
