import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

export default function NotificationPanel({ onClose }) {
  const { notifications, user, markNotificationRead, markAllRead } = useApp();
  const panelRef = useRef(null);

  const myNotifs = notifications.filter(
    n => n.targetUserId === 'all' || n.targetUserId === user?.id
  );

  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const typeIcon = {
    sos: '🆘',
    boarding: '🚌',
    dropped: '🏠',
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
  };

  const timeSince = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: '72px',
        right: '1.5rem',
        width: '380px',
        maxWidth: 'calc(100vw - 2rem)',
        maxHeight: '80vh',
        background: '#0f172a',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)',
      }}>
        <h4 style={{ color: 'var(--text-primary)' }}>🔔 Notifications</h4>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {myNotifs.some(n => !n.read) && (
            <button className="btn btn-sm btn-ghost" onClick={markAllRead} style={{ fontSize: '0.75rem' }}>
              Mark all read
            </button>
          )}
          <button className="btn btn-sm btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
      </div>

      {/* List */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {myNotifs.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <span className="empty-state-icon">📭</span>
            <p>No notifications yet</p>
          </div>
        ) : (
          myNotifs.map(notif => (
            <div
              key={notif.id}
              onClick={() => !notif.read && markNotificationRead(notif.id)}
              style={{
                padding: '0.875rem 1.25rem',
                borderBottom: '1px solid var(--border)',
                background: notif.read ? 'transparent' : 'rgba(37,99,235,0.05)',
                cursor: notif.read ? 'default' : 'pointer',
                transition: 'var(--transition-fast)',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
              }}
            >
              <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>
                {typeIcon[notif.type] || '📢'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: notif.read ? 500 : 700,
                    color: notif.type === 'sos' ? '#fca5a5' : 'var(--text-primary)',
                  }}>
                    {notif.title}
                  </span>
                  {!notif.read && (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-light)', flexShrink: 0, marginTop: 3 }} />
                  )}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                  {notif.message}
                </p>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  {timeSince(notif.createdAt)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
