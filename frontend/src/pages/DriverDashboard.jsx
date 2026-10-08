import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import MapView from '../components/MapView';
import toast from 'react-hot-toast';

export default function DriverDashboard() {
  const { user, socket, busData, setBusData } = useApp();
  const [driver, setDriver] = useState(null);
  const [bus, setBus] = useState(null);
  const [tripActive, setTripActive] = useState(false);
  const [location, setLocation] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [sosLoading, setSosLoading] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle | tracking | error
  const watchIdRef = useRef(null);
  const prevLocationRef = useRef(null);
  const lastUpdateRef = useRef(0);

  const loadData = useCallback(async () => {
    try {
      const driversRes = await axios.get('/api/drivers');
      const d = driversRes.data.find(dr => dr.userId === user.id);
      setDriver(d);
      if (d?.busId) {
        const busRes = await axios.get(`/api/buses/${d.busId}`);
        setBus(busRes.data);
        setTripActive(busRes.data.tripActive);
        setLocation(busRes.data.currentLocation);
      }
    } catch (err) {
      console.error(err);
    }
  }, [user.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Keep location in sync with busData from socket
  useEffect(() => {
    if (bus && busData[bus.id]) {
      const d = busData[bus.id];
      if (d.lat && d.lng) setLocation({ lat: d.lat, lng: d.lng });
    }
  }, [busData, bus]);

  // Start GPS tracking
  const startGPS = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported on this device');
      setGpsStatus('error');
      return;
    }

    setGpsStatus('tracking');
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, speed: spd } = pos.coords;
        const now = Date.now();
        if (now - lastUpdateRef.current < 2000) return; // throttle to 2s
        lastUpdateRef.current = now;

        const kmhSpeed = spd ? Math.round(spd * 3.6) : 0;
        setLocation({ lat, lng });
        setSpeed(kmhSpeed);

        // Update via socket
        if (socket?.connected && bus?.id) {
          socket.emit('driver_location_update', { busId: bus.id, lat, lng, speed: kmhSpeed, heading: 0 });
        }

        // Update via API (every 5s)
        if (now - lastUpdateRef.current > 5000 && bus?.id) {
          axios.post(`/api/buses/${bus.id}/location`, { lat, lng, speed: kmhSpeed }).catch(() => {});
        }

        prevLocationRef.current = { lat, lng };
      },
      (err) => {
        console.error('GPS error:', err);
        setGpsStatus('error');
        toast.error('GPS error: ' + err.message);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  }, [socket, bus]);

  // Stop GPS tracking
  const stopGPS = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsStatus('idle');
    setSpeed(0);
  }, []);

  // Simulate location movement (for testing without GPS)
  const simulateLocation = useCallback(() => {
    if (!bus?.id) return;
    const stops = bus.routeStops || [];
    if (stops.length === 0) return;

    let stopIdx = 0;
    setGpsStatus('tracking');
    toast('📍 Simulating GPS movement along route...', { icon: '🗺️' });

    const interval = setInterval(() => {
      if (stopIdx >= stops.length) {
        clearInterval(interval);
        setGpsStatus('idle');
        return;
      }
      const stop = stops[stopIdx];
      const lat = stop.lat + (Math.random() - 0.5) * 0.002;
      const lng = stop.lng + (Math.random() - 0.5) * 0.002;
      const spd = 20 + Math.floor(Math.random() * 20);

      setLocation({ lat, lng });
      setSpeed(spd);

      if (socket?.connected) {
        socket.emit('driver_location_update', { busId: bus.id, lat, lng, speed: spd, heading: 0 });
      }
      axios.post(`/api/buses/${bus.id}/location`, { lat, lng, speed: spd }).catch(() => {});

      stopIdx++;
    }, 3000);

    watchIdRef.current = interval;
  }, [socket, bus]);

  useEffect(() => () => { if (watchIdRef.current) { navigator.geolocation.clearWatch?.(watchIdRef.current); clearInterval?.(watchIdRef.current); } }, []);

  const startTrip = async () => {
    if (!bus?.id) return;
    try {
      await axios.post(`/api/buses/${bus.id}/trip/start`);
      setTripActive(true);
      setBus(b => ({ ...b, tripActive: true }));
      toast.success('🚌 Trip started! GPS tracking active.');
      startGPS();
    } catch { toast.error('Failed to start trip'); }
  };

  const stopTrip = async () => {
    if (!bus?.id) return;
    try {
      await axios.post(`/api/buses/${bus.id}/trip/stop`);
      setTripActive(false);
      setBus(b => ({ ...b, tripActive: false }));
      stopGPS();
      setSosSent(false);
      toast.success('✅ Trip ended successfully');
    } catch { toast.error('Failed to stop trip'); }
  };

  const sendSOS = async () => {
    if (!bus?.id || sosLoading) return;
    setSosLoading(true);
    try {
      await axios.post('/api/sos', {
        busId: bus.id,
        location: location,
        message: 'SOS! Emergency! Immediate assistance required!',
      });
      setSosSent(true);
      toast.error('🆘 SOS Alert sent to school, parents & police!', { duration: 8000 });
    } catch { toast.error('Failed to send SOS'); }
    finally { setSosLoading(false); }
  };

  const liveBus = bus ? { ...bus, ...(busData[bus?.id] || {}) } : bus;

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem' }}>🚗 Driver Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {driver?.name || user.name} · Bus {bus?.number || '...'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {tripActive && <><span className="live-dot" /><span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>TRIP ACTIVE</span></>}
          <span className={`badge ${gpsStatus === 'tracking' ? 'badge-success' : gpsStatus === 'error' ? 'badge-danger' : 'badge-muted'}`}>
            {gpsStatus === 'tracking' ? '📡 GPS On' : gpsStatus === 'error' ? '❌ GPS Error' : '📡 GPS Off'}
          </span>
        </div>
      </div>

      {/* SOS Button */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(220,38,38,0.15))',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          In case of emergency, press the SOS button to alert school, all parents & authorities
        </p>
        <button
          className="sos-button"
          onClick={sendSOS}
          disabled={sosLoading || sosSent || !tripActive}
          style={sosSent ? { background: 'linear-gradient(135deg, #6b7280, #4b5563)', animation: 'none' } : {}}
        >
          {sosLoading ? '⏳ SENDING...' : sosSent ? '✅ SOS SENT' : '🆘 SOS'}
        </button>
        {!tripActive && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem' }}>Start a trip to enable SOS</p>}
        {sosSent && <p style={{ color: '#fca5a5', fontSize: '0.875rem', marginTop: '1rem' }}>✅ Alert sent! Help is on the way. Stay calm.</p>}
      </div>

      {/* Trip Controls */}
      <div className="glass-card">
        <h4 style={{ marginBottom: '1rem' }}>🎮 Trip Controls</h4>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {!tripActive ? (
            <>
              <button className="btn btn-success btn-lg" onClick={startTrip}>
                ▶️ Start Trip
              </button>
              <button className="btn btn-ghost" onClick={simulateLocation} disabled={!bus?.id}>
                🗺️ Simulate GPS (Demo)
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-danger btn-lg" onClick={stopTrip}>
                ⏹ End Trip
              </button>
              {gpsStatus !== 'tracking' && (
                <button className="btn btn-primary" onClick={startGPS}>📡 Start GPS</button>
              )}
              {gpsStatus === 'tracking' && (
                <button className="btn btn-ghost" onClick={stopGPS}>⏸ Pause GPS</button>
              )}
              <button className="btn btn-ghost" onClick={simulateLocation}>
                🗺️ Simulate Movement
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4">
        {[
          { label: 'Speed',       value: `${speed} km/h`, icon: '⚡', color: '#2563eb' },
          { label: 'Status',      value: tripActive ? 'En Route' : 'Parked', icon: '📍', color: tripActive ? '#10b981' : '#6b7280' },
          { label: 'Bus No.',     value: bus?.number || '—', icon: '🚌', color: '#f59e0b' },
          { label: 'GPS',         value: gpsStatus === 'tracking' ? 'Active' : 'Off', icon: '📡', color: gpsStatus === 'tracking' ? '#10b981' : '#6b7280' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.color + '22' }}>
              <span style={{ fontSize: '1.5rem' }}>{s.icon}</span>
            </div>
            <div>
              <div className="stat-value" style={{ fontSize: '1.1rem', color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Map */}
      <MapView
        busLocation={location}
        routeStops={bus?.routeStops || []}
        height="380px"
      />

      {/* Driver Info Card */}
      {driver && (
        <div className="glass-card">
          <h4 style={{ marginBottom: '1rem' }}>👤 Your Profile</h4>
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <img
              src={driver.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${driver.name}`}
              alt={driver.name}
              style={{ width: 70, height: 70, borderRadius: '50%', border: '3px solid var(--primary-light)', flexShrink: 0 }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.625rem', flex: 1 }}>
              {[
                { label: 'Name', value: driver.name },
                { label: 'Phone', value: driver.phone },
                { label: 'License', value: driver.licenseNumber },
                { label: 'Bus No.', value: driver.busNumber },
                { label: 'Route', value: bus?.route },
                { label: 'Experience', value: driver.experience },
              ].map(d => (
                <div key={d.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '0.625rem 0.75rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{d.label}</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{d.value || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
