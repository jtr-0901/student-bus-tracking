import { useState } from 'react';
import { useApp } from '../context/AppContext';
import toast from 'react-hot-toast';

const DEMO_CREDENTIALS = [
  { role: 'Admin',     email: 'admin@school.com',     password: 'admin123',     icon: '🏫', color: '#a78bfa' },
  { role: 'Driver',   email: 'driver@school.com',    password: 'driver123',    icon: '🚗', color: '#34d399' },
  { role: 'Conductor',email: 'conductor@school.com', password: 'conductor123', icon: '🎫', color: '#60a5fa' },
  { role: 'Parent 1', email: 'parent1@school.com',   password: 'parent123',    icon: '👨‍👩‍👧', color: '#f472b6' },
  { role: 'Parent 2', email: 'parent2@school.com',   password: 'parent123',    icon: '👪', color: '#fb923c' },
];

export default function Login() {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill in all fields');
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome, ${user.name}! 👋`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (cred) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setLoading(true);
    try {
      const user = await login(cred.email, cred.password);
      toast.success(`Welcome, ${user.name}! 👋`);
    } catch (err) {
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div className="animated-bg" />

      {/* Background decorations */}
      <div style={{
        position: 'fixed',
        top: '10%', right: '5%',
        fontSize: '8rem',
        opacity: 0.04,
        animation: 'float-bg 6s ease-in-out infinite alternate',
        userSelect: 'none',
      }}>🚌</div>
      <div style={{
        position: 'fixed',
        bottom: '15%', left: '5%',
        fontSize: '6rem',
        opacity: 0.04,
        animation: 'float-bg 8s ease-in-out infinite alternate-reverse',
        userSelect: 'none',
      }}>🛣️</div>

      <div style={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: 80, height: 80,
            background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
            borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.5rem',
            margin: '0 auto 1.5rem',
            boxShadow: '0 0 40px rgba(37,99,235,0.4)',
          }}>
            🚌
          </div>
          <h1 style={{ marginBottom: '0.5rem' }}>BusTrack <span style={{ color: 'var(--accent)' }}>Pro</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>School Bus Tracking System</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            Safe • Real-time • Reliable
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Sign In</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    fontSize: '1rem',
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading ? <><span className="loader" style={{ width: 18, height: 18, borderWidth: 2 }} /> Signing in...</> : '🔐 Sign In'}
            </button>
          </form>
        </div>

        {/* Quick Login */}
        <div className="glass-card" style={{ marginTop: '1.25rem', padding: '1.5rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Quick Demo Login
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {DEMO_CREDENTIALS.map(cred => (
              <button
                key={cred.role}
                onClick={() => quickLogin(cred)}
                disabled={loading}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid rgba(255,255,255,0.08)`,
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'var(--transition-fast)',
                  fontSize: '0.875rem',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>{cred.icon}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, color: cred.color }}>{cred.role}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cred.email}</div>
                  </div>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>→</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '1.5rem' }}>
          🔒 Secure • Powered by OpenStreetMap & Socket.io
        </p>
      </div>
    </div>
  );
}
