import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import MapView from '../components/MapView';
import toast from 'react-hot-toast';

export default function ParentDashboard() {
  const { user, busData, notifications, markNotificationRead } = useApp();
  const [tab, setTab] = useState('map');
  const [student, setStudent] = useState(null);
  const [bus, setBus] = useState(null);
  const [driver, setDriver] = useState(null);
  const [feedback, setFeedback] = useState({ rating: 5, message: '' });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [myFeedback, setMyFeedback] = useState(null);

  const loadData = useCallback(async () => {
    try {
      // Load student
      const studRes = await axios.get(`/api/students?parentId=${user.id}`);
      const s = studRes.data[0];
      setStudent(s);

      if (s?.busId) {
        // Load bus
        const busRes = await axios.get(`/api/buses/${s.busId}`);
        setBus(busRes.data);

        // Load driver
        const driversRes = await axios.get('/api/drivers');
        const d = driversRes.data.find(dr => dr.busId === s.busId);
        setDriver(d);

        // Load feedback
        const fbRes = await axios.get(`/api/feedback?parentId=${user.id}&busId=${s.busId}`);
        if (fbRes.data.length > 0) {
          setMyFeedback(fbRes.data[0]);
          setFeedback({ rating: fbRes.data[0].rating, message: fbRes.data[0].message });
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [user.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Live bus data from socket
  const liveBus = bus ? { ...bus, ...(busData[bus.id] || {}) } : null;
  const busLocation = liveBus?.currentLocation;

  const submitFeedback = async () => {
    if (!feedback.message.trim()) return toast.error('Please write a message');
    setSubmittingFeedback(true);
    try {
      await axios.post('/api/feedback', {
        busId: bus.id,
        driverId: driver?.id,
        rating: feedback.rating,
        message: feedback.message,
      });
      toast.success('Feedback submitted! Thank you 🙏');
      loadData();
    } catch {
      toast.error('Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const myNotifs = notifications.filter(n =>
    (n.targetUserId === 'all' || n.targetUserId === user.id) &&
    (n.studentId === student?.id || n.targetUserId === 'all')
  );

  const getStatusBadge = () => {
    if (!liveBus?.tripActive) return <span className="badge badge-muted">⏸ Trip Not Started</span>;
    if (student?.boardingStatus === 'boarded') return <span className="badge badge-success">✅ Boarded</span>;
    return <span className="badge badge-warning">⏳ Awaiting Boarding</span>;
  };

  return (
    <div className="page-container" style={{ paddingTop: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem' }}>👨‍👩‍👧 Parent Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Tracking {student?.name || '...'} · Bus {liveBus?.number || '...'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {liveBus?.tripActive && <><span className="live-dot" /><span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>LIVE</span></>}
          {getStatusBadge()}
        </div>
      </div>

      {/* Student Status Card */}
      {student && (
        <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.1), rgba(30,58,95,0.2))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{
              width: 64, height: 64,
              background: 'var(--grad-primary)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', flexShrink: 0,
            }}>
              👦
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{student.name}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Class {student.class} · Stop: {student.stopName}</p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <span className={`badge ${student.boardingStatus === 'boarded' ? 'badge-success' : 'badge-muted'}`}>
                  {student.boardingStatus === 'boarded' ? '✅ Boarded' : '🔵 Not Boarded'}
                </span>
                <span className={`badge ${student.dropStatus === 'dropped' ? 'badge-success' : 'badge-muted'}`}>
                  {student.dropStatus === 'dropped' ? '🏠 Dropped' : '📍 Not Dropped'}
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bus Number</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent)' }}>{liveBus?.number}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'map', label: '🗺️ Live Map' },
          { id: 'driver', label: '👤 Driver Info' },
          { id: 'notifications', label: `🔔 Alerts ${myNotifs.filter(n=>!n.read).length > 0 ? `(${myNotifs.filter(n=>!n.read).length})` : ''}` },
          { id: 'feedback', label: '⭐ Feedback' },
        ].map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'map' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <MapView
            busLocation={liveBus?.tripActive ? busLocation : null}
            routeStops={bus?.routeStops || []}
            height="450px"
          />
          {/* Bus Stats */}
          <div className="grid-3">
            {[
              { label: 'Speed', value: liveBus?.tripActive ? `${liveBus?.speed || 0} km/h` : '—', icon: '⚡' },
              { label: 'Status', value: liveBus?.tripActive ? 'En Route' : 'Parked', icon: '📍' },
              { label: 'Last Update', value: liveBus?.lastUpdate ? new Date(liveBus.lastUpdate).toLocaleTimeString() : '—', icon: '🕐' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div style={{ fontSize: '1.5rem' }}>{s.icon}</div>
                <div>
                  <div className="stat-value" style={{ fontSize: '1.2rem' }}>{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
          {/* Route Stops */}
          {bus?.routeStops && (
            <div className="glass-card">
              <h4 style={{ marginBottom: '1rem' }}>🛑 Route Stops</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {bus.routeStops.map((stop, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.5rem', borderRadius: 'var(--radius-sm)',
                    background: stop.name === student?.stopName ? 'rgba(37,99,235,0.1)' : 'transparent',
                    border: stop.name === student?.stopName ? '1px solid rgba(37,99,235,0.3)' : '1px solid transparent',
                  }}>
                    <div style={{
                      width: 28, height: 28,
                      borderRadius: '50%',
                      background: i === bus.routeStops.length - 1 ? 'var(--grad-success)' : 'var(--grad-primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700, color: 'white', flexShrink: 0,
                    }}>
                      {i === bus.routeStops.length - 1 ? '🏫' : i + 1}
                    </div>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{stop.name}</span>
                    {stop.name === student?.stopName && (
                      <span className="badge badge-info" style={{ marginLeft: 'auto' }}>Your Stop</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'driver' && driver && (
        <div className="glass-card">
          <h4 style={{ marginBottom: '1.5rem' }}>👤 Driver Information</h4>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div className="driver-card-pic">
              <img
                src={driver.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${driver.name}`}
                alt={driver.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{driver.name}</h3>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <span className="badge badge-success">⭐ {driver.rating}/5</span>
                <span className="badge badge-info">{driver.experience}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                {[
                  { label: '📞 Phone', value: driver.phone },
                  { label: '🪪 License', value: driver.licenseNumber },
                  { label: '🚌 Bus No.', value: driver.busNumber },
                  { label: '🛣️ Route', value: bus?.route },
                ].map(d => (
                  <div key={d.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{d.label}</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{d.value || '—'}</div>
                  </div>
                ))}
              </div>
              <a href={`tel:${driver.phone}`} className="btn btn-success" style={{ marginTop: '1rem' }}>
                📞 Call Driver
              </a>
            </div>
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4>🔔 Alerts & Notifications</h4>
          </div>
          {myNotifs.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📭</span>
              <p>No notifications yet</p>
            </div>
          ) : (
            <div>
              {myNotifs.map(n => (
                <div key={n.id} onClick={() => markNotificationRead(n.id)} style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid var(--border)',
                  background: n.read ? 'transparent' : 'rgba(37,99,235,0.05)',
                  cursor: 'pointer',
                  display: 'flex', gap: '0.75rem',
                }}>
                  <span style={{ fontSize: '1.5rem' }}>{n.type === 'sos' ? '🆘' : n.type === 'boarding' ? '🚌' : n.type === 'dropped' ? '🏠' : '📢'}</span>
                  <div>
                    <div style={{ fontWeight: n.read ? 500 : 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{n.title}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{n.message}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.25rem' }}>{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                  {!n.read && <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: 'var(--primary-light)', flexShrink: 0, marginTop: 6 }} />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'feedback' && (
        <div className="glass-card">
          <h4 style={{ marginBottom: '1.5rem' }}>⭐ Rate the Bus Service</h4>
          {myFeedback && (
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#34d399' }}>
              ✅ You have already submitted feedback. You can update it below.
            </div>
          )}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Your Rating</label>
            <div className="stars">
              {[1, 2, 3, 4, 5].map(s => (
                <span
                  key={s}
                  className={`star ${s <= feedback.rating ? 'filled' : ''}`}
                  onClick={() => setFeedback(f => ({ ...f, rating: s }))}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Your Message</label>
            <textarea
              className="input"
              placeholder="Share your experience about the bus service, driver behavior, punctuality, etc."
              value={feedback.message}
              onChange={e => setFeedback(f => ({ ...f, message: e.target.value }))}
              rows={4}
            />
          </div>
          <button className="btn btn-primary" onClick={submitFeedback} disabled={submittingFeedback}>
            {submittingFeedback ? <><span className="loader" style={{ width: 16, height: 16, borderWidth: 2 }} /> Submitting...</> : '📤 Submit Feedback'}
          </button>
        </div>
      )}
    </div>
  );
}
