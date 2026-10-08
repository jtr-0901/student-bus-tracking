import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import QRScanner from '../components/QRScanner';
import toast from 'react-hot-toast';

export default function ConductorDashboard() {
  const { user } = useApp();
  const [tab, setTab] = useState('list');
  const [students, setStudents] = useState([]);
  const [scannedStudent, setScannedStudent] = useState(null);
  const [scanAction, setScanAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState('');

  const loadStudents = useCallback(async () => {
    try {
      const res = await axios.get('/api/students?busId=b1');
      setStudents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const handleQRScan = useCallback(async (data) => {
    const student = students.find(s => s.id === data.studentId);
    if (!student) {
      toast.error('Student not found in this bus!');
      return;
    }
    setScannedStudent(student);
    setScanAction(null);
    toast.success(`✅ QR scanned: ${student.name}`);
  }, [students]);

  const markStudent = async (action) => {
    if (!scannedStudent || processing) return;
    setProcessing(true);
    try {
      const res = await axios.post('/api/students/scan', { studentId: scannedStudent.id, action });
      // Update local state
      setStudents(prev => prev.map(s => s.id === scannedStudent.id ? res.data.student : s));
      setScannedStudent(res.data.student);
      setScanAction(action);
      const msg = action === 'board' ? `${scannedStudent.name} marked as Boarded ✅` : `${scannedStudent.name} marked as Dropped 🏠`;
      toast.success(msg);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    } finally {
      setProcessing(false);
    }
  };

  const manualScan = (student) => {
    setScannedStudent(student);
    setScanAction(null);
    setTab('scanner');
    toast(`Student selected: ${student.name}`, { icon: '✅' });
  };

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.class.toLowerCase().includes(search.toLowerCase()) ||
    s.stopName.toLowerCase().includes(search.toLowerCase())
  );

  const boarded = students.filter(s => s.boardingStatus === 'boarded').length;
  const dropped = students.filter(s => s.dropStatus === 'dropped').length;

  return (
    <div className="page-container">
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem' }}>🎫 Conductor Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Scan QR codes to mark student attendance</p>
      </div>

      {/* Stats */}
      <div className="grid-4">
        {[
          { label: 'Total Students', value: students.length, icon: '👥', color: '#2563eb' },
          { label: 'On Bus',         value: boarded,          icon: '✅', color: '#10b981' },
          { label: 'Not Boarded',    value: students.length - boarded, icon: '⏳', color: '#f59e0b' },
          { label: 'Dropped Off',    value: dropped,           icon: '🏠', color: '#a78bfa' },
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

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>
          📋 Student List
        </button>
        <button className={`tab-btn ${tab === 'scanner' ? 'active' : ''}`} onClick={() => setTab('scanner')}>
          📷 QR Scanner
        </button>
      </div>

      {tab === 'list' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <h4>👥 Students on Bus b1</h4>
            <input
              type="text"
              className="input"
              placeholder="🔍 Search students..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: 240 }}
            />
          </div>
          {loading ? (
            <div className="empty-state"><div className="loader" /></div>
          ) : (
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Class</th>
                    <th>Stop</th>
                    <th>Boarding</th>
                    <th>Drop</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(student => (
                    <tr key={student.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'var(--grad-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.875rem', flexShrink: 0,
                          }}>
                            {student.name[0]}
                          </div>
                          <span style={{ fontWeight: 600 }}>{student.name}</span>
                        </div>
                      </td>
                      <td><span className="badge badge-info">{student.class}</span></td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{student.stopName}</td>
                      <td>
                        <span className={`badge ${student.boardingStatus === 'boarded' ? 'badge-success' : 'badge-muted'}`}>
                          {student.boardingStatus === 'boarded' ? '✅ Boarded' : '⏳ Not Boarded'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${student.dropStatus === 'dropped' ? 'badge-success' : 'badge-muted'}`}>
                          {student.dropStatus === 'dropped' ? '🏠 Dropped' : '—'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => manualScan(student)}
                            title="Select for manual scan action"
                          >
                            📱 Select
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'scanner' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* QR Scanner */}
          <div className="glass-card">
            <h4 style={{ marginBottom: '1.5rem' }}>📷 Scan QR Code</h4>
            <QRScanner onScan={handleQRScan} />
            <div className="divider" />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Point camera at student's QR code.<br />
              Or select a student from the list tab.
            </p>
          </div>

          {/* Scan Result */}
          <div className="glass-card">
            <h4 style={{ marginBottom: '1.5rem' }}>✅ Scan Result</h4>
            {!scannedStudent ? (
              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                <span className="empty-state-icon">📱</span>
                <p>Scan a student's QR code to see their details here</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Student card */}
                <div style={{
                  background: 'var(--grad-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'center',
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'var(--grad-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem', flexShrink: 0,
                  }}>
                    {scannedStudent.name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{scannedStudent.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Class {scannedStudent.class} · {scannedStudent.stopName}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      <span className={`badge ${scannedStudent.boardingStatus === 'boarded' ? 'badge-success' : 'badge-muted'}`} style={{ fontSize: '0.7rem' }}>
                        {scannedStudent.boardingStatus === 'boarded' ? '✅ Boarded' : '⏳ Not Boarded'}
                      </span>
                    </div>
                  </div>
                </div>

                {scanAction && (
                  <div style={{
                    background: 'rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem',
                    textAlign: 'center',
                    color: '#34d399',
                    fontWeight: 600,
                  }}>
                    {scanAction === 'board' ? '✅ Student marked as Boarded!' : '🏠 Student marked as Dropped!'}
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    className="btn btn-success"
                    style={{ flex: 1 }}
                    onClick={() => markStudent('board')}
                    disabled={processing || scannedStudent.boardingStatus === 'boarded'}
                  >
                    {processing ? <span className="loader" style={{ width: 14, height: 14, borderWidth: 2 }} /> : '✅'}
                    {scannedStudent.boardingStatus === 'boarded' ? 'Already Boarded' : 'Mark Boarded'}
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => markStudent('drop')}
                    disabled={processing || scannedStudent.dropStatus === 'dropped'}
                  >
                    {processing ? <span className="loader" style={{ width: 14, height: 14, borderWidth: 2 }} /> : '🏠'}
                    {scannedStudent.dropStatus === 'dropped' ? 'Already Dropped' : 'Mark Dropped'}
                  </button>
                </div>

                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setScannedStudent(null); setScanAction(null); }}
                  style={{ alignSelf: 'center' }}
                >
                  🔄 Scan Another
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR Display Section - show QR codes for each student */}
      {tab === 'list' && (
        <div className="glass-card">
          <h4 style={{ marginBottom: '1rem' }}>🎫 Student QR Codes (Print & Distribute)</h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Each student's unique QR code for attendance tracking
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '1rem',
          }}>
            {students.slice(0, 8).map(student => (
              <div key={student.id} style={{
                background: 'white',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                textAlign: 'center',
                boxShadow: 'var(--shadow-sm)',
              }}>
                {student.qrCode && (
                  <img src={student.qrCode} alt={student.name} style={{ width: '100%', maxWidth: 140, display: 'block', margin: '0 auto' }} />
                )}
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ fontWeight: 700, color: '#1a2740', fontSize: '0.875rem' }}>{student.name}</div>
                  <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>Class {student.class}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
