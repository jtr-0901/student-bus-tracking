import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import MapView from '../components/MapView';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { user, busData, sosAlerts, setSosAlerts } = useApp();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [buses, setBuses] = useState([]);
  const [students, setStudents] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [users, setUsers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add student modal state
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', class: '', busId: 'b1', stopName: '' });

  const loadAll = useCallback(async () => {
    try {
      const [statsRes, busRes, studRes, fbRes, usersRes, driversRes] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/buses'),
        axios.get('/api/students'),
        axios.get('/api/feedback'),
        axios.get('/api/admin/users'),
        axios.get('/api/drivers'),
      ]);
      setStats(statsRes.data);
      setBuses(busRes.data);
      setStudents(studRes.data);
      setFeedback(fbRes.data);
      setUsers(usersRes.data);
      setDrivers(driversRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const resolveSOS = async (alertId) => {
    try {
      await axios.put(`/api/sos/${alertId}/resolve`);
      setSosAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'resolved' } : a));
      toast.success('SOS alert resolved');
    } catch { toast.error('Failed to resolve SOS'); }
  };

  const addStudent = async () => {
    if (!newStudent.name || !newStudent.class || !newStudent.stopName) {
      return toast.error('Please fill all fields');
    }
    try {
      const res = await axios.post('/api/students', newStudent);
      setStudents(prev => [...prev, res.data]);
      setAddStudentOpen(false);
      setNewStudent({ name: '', class: '', busId: 'b1', stopName: '' });
      toast.success('Student added successfully');
    } catch { toast.error('Failed to add student'); }
  };

  const deleteStudent = async (id) => {
    if (!confirm('Delete this student?')) return;
    try {
      await axios.delete(`/api/students/${id}`);
      setStudents(prev => prev.filter(s => s.id !== id));
      toast.success('Student removed');
    } catch { toast.error('Failed to delete student'); }
  };

  const activeSOS = sosAlerts.filter(a => a.status === 'active');
  const avgRating = feedback.length ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1) : 0;
  const liveBus = buses[0] ? { ...buses[0], ...(busData[buses[0]?.id] || {}) } : null;

  return (
    <div className="page-container">
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem' }}>🏫 Admin Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>School management overview</p>
      </div>

      {/* SOS Alert Banner */}
      {activeSOS.length > 0 && (
        <div className="alert alert-sos">
          <span style={{ fontSize: '1.5rem' }}>🆘</span>
          <div style={{ flex: 1 }}>
            <strong>ACTIVE SOS ALERT!</strong>
            <p style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}>
              Bus {activeSOS[0].busNumber} - Driver: {activeSOS[0].driverName} ({activeSOS[0].driverPhone})
            </p>
            {activeSOS[0].location && (
              <p style={{ fontSize: '0.8rem', marginTop: '0.125rem' }}>
                Location: {activeSOS[0].location.lat?.toFixed(4)}, {activeSOS[0].location.lng?.toFixed(4)}
              </p>
            )}
          </div>
          <button className="btn btn-sm btn-danger" onClick={() => resolveSOS(activeSOS[0].id)}>
            Resolve
          </button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid-4">
          {[
            { label: 'Active Buses',     value: `${stats.activeBuses}/${stats.totalBuses}`, icon: '🚌', color: '#2563eb' },
            { label: 'Students Today',   value: `${stats.boardedStudents}/${stats.totalStudents}`, icon: '👥', color: '#10b981' },
            { label: 'Active SOS',       value: activeSOS.length, icon: '🆘', color: activeSOS.length > 0 ? '#ef4444' : '#6b7280' },
            { label: 'Avg Rating',       value: `${avgRating}⭐`, icon: '⭐', color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{ background: s.color + '22' }}>
                <span style={{ fontSize: '1.5rem' }}>{s.icon}</span>
              </div>
              <div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ flexWrap: 'wrap' }}>
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'buses', label: '🚌 Buses & Map' },
          { id: 'students', label: '👥 Students' },
          { id: 'sos', label: `🆘 SOS ${activeSOS.length > 0 ? `(${activeSOS.length})` : ''}` },
          { id: 'feedback', label: '⭐ Feedback' },
          { id: 'users', label: '👤 Users' },
        ].map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="grid-2">
            {/* Bus Status */}
            <div className="glass-card">
              <h4 style={{ marginBottom: '1rem' }}>🚌 Fleet Status</h4>
              {buses.map(bus => (
                <div key={bus.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem', borderRadius: 'var(--radius-md)',
                  background: 'rgba(255,255,255,0.04)', marginBottom: '0.5rem',
                }}>
                  <span style={{ fontSize: '1.5rem' }}>🚌</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{bus.number}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{bus.route}</div>
                  </div>
                  <span className={`badge ${bus.tripActive ? 'badge-success' : 'badge-muted'}`}>
                    {bus.tripActive ? '🟢 Active' : '⚪ Idle'}
                  </span>
                </div>
              ))}
            </div>

            {/* Driver Status */}
            <div className="glass-card">
              <h4 style={{ marginBottom: '1rem' }}>👤 Drivers</h4>
              {drivers.map(d => (
                <div key={d.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem', borderRadius: 'var(--radius-md)',
                  background: 'rgba(255,255,255,0.04)', marginBottom: '0.5rem',
                }}>
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${d.name}`}
                    alt={d.name}
                    style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{d.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.phone} · {d.busNumber}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>⭐ {d.rating}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{d.experience}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Feedback */}
          <div className="glass-card">
            <h4 style={{ marginBottom: '1rem' }}>⭐ Recent Feedback</h4>
            {feedback.slice(0, 3).map(f => (
              <div key={f.id} style={{ padding: '0.875rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                  <span style={{ color: 'var(--accent)', fontSize: '0.875rem' }}>{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(f.createdAt).toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{f.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buses & Map Tab */}
      {tab === 'buses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <MapView
            busLocation={liveBus?.tripActive ? liveBus?.currentLocation : null}
            routeStops={buses[0]?.routeStops || []}
            height="420px"
          />
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Bus Number</th>
                  <th>Route</th>
                  <th>Driver</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th>Speed</th>
                </tr>
              </thead>
              <tbody>
                {buses.map(bus => {
                  const d = drivers.find(dr => dr.busId === bus.id);
                  const live = busData[bus.id] || {};
                  return (
                    <tr key={bus.id}>
                      <td><strong>{bus.number}</strong></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{bus.route}</td>
                      <td>{d?.name || '—'}</td>
                      <td>{students.filter(s => s.busId === bus.id).length}/{bus.capacity}</td>
                      <td>
                        <span className={`badge ${bus.tripActive ? 'badge-success' : 'badge-muted'}`}>
                          {bus.tripActive ? '🟢 Active' : '⚪ Idle'}
                        </span>
                      </td>
                      <td>{live.speed != null ? `${live.speed} km/h` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Students Tab */}
      {tab === 'students' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4>👥 All Students ({students.length})</h4>
            <button className="btn btn-primary btn-sm" onClick={() => setAddStudentOpen(true)}>
              ＋ Add Student
            </button>
          </div>

          {/* Add Student Form */}
          {addStudentOpen && (
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'rgba(37,99,235,0.05)' }}>
              <h4 style={{ marginBottom: '1rem' }}>Add New Student</h4>
              <div className="grid-2" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="input" placeholder="Student name" value={newStudent.name} onChange={e => setNewStudent(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Class</label>
                  <input className="input" placeholder="e.g. 5-A" value={newStudent.class} onChange={e => setNewStudent(p => ({ ...p, class: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Bus</label>
                  <select className="input" value={newStudent.busId} onChange={e => setNewStudent(p => ({ ...p, busId: e.target.value }))}>
                    {buses.map(b => <option key={b.id} value={b.id}>{b.number}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Stop Name</label>
                  <input className="input" placeholder="Stop name" value={newStudent.stopName} onChange={e => setNewStudent(p => ({ ...p, stopName: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-success btn-sm" onClick={addStudent}>✅ Add Student</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setAddStudentOpen(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Class</th>
                  <th>Bus</th>
                  <th>Stop</th>
                  <th>Boarding</th>
                  <th>Drop</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td><span className="badge badge-info">{s.class}</span></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{buses.find(b => b.id === s.busId)?.number || s.busId}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{s.stopName}</td>
                    <td><span className={`badge ${s.boardingStatus === 'boarded' ? 'badge-success' : 'badge-muted'}`}>{s.boardingStatus === 'boarded' ? '✅ Yes' : '—'}</span></td>
                    <td><span className={`badge ${s.dropStatus === 'dropped' ? 'badge-success' : 'badge-muted'}`}>{s.dropStatus === 'dropped' ? '✅ Yes' : '—'}</span></td>
                    <td>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteStudent(s.id)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SOS Tab */}
      {tab === 'sos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sosAlerts.length === 0 ? (
            <div className="glass-card">
              <div className="empty-state">
                <span className="empty-state-icon">✅</span>
                <p>No SOS alerts. All clear!</p>
              </div>
            </div>
          ) : (
            sosAlerts.map(alert => (
              <div key={alert.id} style={{
                background: alert.status === 'active' ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${alert.status === 'active' ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem 1.5rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>🆘</span>
                      <strong style={{ color: alert.status === 'active' ? '#fca5a5' : 'var(--text-primary)' }}>
                        SOS from Bus {alert.busNumber}
                      </strong>
                      <span className={`badge ${alert.status === 'active' ? 'badge-danger' : 'badge-success'}`}>
                        {alert.status === 'active' ? '🔴 Active' : '✅ Resolved'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.875rem' }}>
                      <div><span style={{ color: 'var(--text-muted)' }}>Driver:</span> <strong>{alert.driverName}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Phone:</span> <strong>{alert.driverPhone}</strong></div>
                      {alert.location && (
                        <div style={{ gridColumn: '1/-1' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Location:</span>{' '}
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${alert.location.lat}&mlon=${alert.location.lng}&zoom=15`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--primary-light)' }}
                          >
                            {alert.location.lat?.toFixed(4)}, {alert.location.lng?.toFixed(4)} (View on Map →)
                          </a>
                        </div>
                      )}
                      <div><span style={{ color: 'var(--text-muted)' }}>Time:</span> {new Date(alert.createdAt).toLocaleString()}</div>
                      {alert.resolvedAt && <div><span style={{ color: 'var(--text-muted)' }}>Resolved:</span> {new Date(alert.resolvedAt).toLocaleString()}</div>}
                    </div>
                  </div>
                  {alert.status === 'active' && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <a href={`tel:${alert.driverPhone}`} className="btn btn-success btn-sm">📞 Call Driver</a>
                      <button className="btn btn-primary btn-sm" onClick={() => resolveSOS(alert.id)}>✅ Resolve</button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Feedback Tab */}
      {tab === 'feedback' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Summary */}
          <div className="glass-card">
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--accent)' }}>{avgRating}</div>
                <div style={{ color: 'var(--accent)', fontSize: '1.25rem' }}>{'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{feedback.length} reviews</div>
              </div>
              <div style={{ flex: 1 }}>
                {[5, 4, 3, 2, 1].map(star => {
                  const count = feedback.filter(f => f.rating === star).length;
                  const pct = feedback.length ? (count / feedback.length) * 100 : 0;
                  return (
                    <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
                      <span style={{ color: 'var(--accent)', fontSize: '0.875rem', width: 16 }}>{star}</span>
                      <span style={{ color: 'var(--accent)' }}>★</span>
                      <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 4, transition: 'width 1s ease' }} />
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: 20 }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {feedback.map(f => (
            <div key={f.id} className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${f.parentId}`}
                    alt="parent"
                    style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid var(--border)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {users.find(u => u.id === f.parentId)?.name || 'Anonymous Parent'}
                    </div>
                    <div style={{ color: 'var(--accent)', fontSize: '0.875rem' }}>{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(f.createdAt).toLocaleDateString()}</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>{f.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`}
                        alt={u.name}
                        style={{ width: 32, height: 32, borderRadius: '50%' }}
                      />
                      <strong>{u.name}</strong>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td><span className={`badge role-badge-${u.role}`}>{u.role}</span></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{u.phone || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
