import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import toast from 'react-hot-toast';

const AppContext = createContext(null);

const API_BASE = '/api';

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [busData, setBusData] = useState({});
  const [sosAlerts, setSosAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Load user on mount
  useEffect(() => {
    if (token) {
      axios.get(`${API_BASE}/auth/me`)
        .then(res => setUser(res.data))
        .catch(() => { localStorage.removeItem('token'); setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  // Socket.io setup
  useEffect(() => {
    if (!user) return;

    const s = io(window.location.origin, { path: '/socket.io', transports: ['websocket'] });
    setSocket(s);

    s.on('connect', () => {
      console.log('🔌 Socket connected');
      s.emit('join_room', `user_${user.id}`);
      s.emit('join_room', `role_${user.role}`);
    });

    s.on('bus_location_update', (data) => {
      setBusData(prev => ({
        ...prev,
        [data.busId]: { ...prev[data.busId], ...data },
      }));
    });

    s.on('notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      const icons = { sos: '🆘', boarding: '🚌', dropped: '🏠', info: 'ℹ️', success: '✅' };
      toast(notif.message, { icon: icons[notif.type] || '📢', duration: 5000 });
    });

    s.on('student_boarded', ({ notification }) => {
      if (notification?.targetUserId === user.id || notification?.targetUserId === 'all') {
        setNotifications(prev => [notification, ...prev]);
      }
    });

    s.on('student_dropped', ({ notification }) => {
      if (notification?.targetUserId === user.id || notification?.targetUserId === 'all') {
        setNotifications(prev => [notification, ...prev]);
      }
    });

    s.on('sos_alert', ({ alert, notification }) => {
      setSosAlerts(prev => [alert, ...prev]);
      setNotifications(prev => [notification, ...prev]);
      toast.error('🆘 SOS ALERT! Emergency situation reported!', { duration: 10000 });
    });

    s.on('trip_started', ({ bus }) => {
      setBusData(prev => ({ ...prev, [bus.id]: bus }));
    });

    s.on('trip_stopped', ({ bus }) => {
      setBusData(prev => ({ ...prev, [bus.id]: bus }));
    });

    return () => { s.disconnect(); };
  }, [user]);

  // Fetch initial notifications
  useEffect(() => {
    if (!user) return;
    axios.get(`${API_BASE}/notifications`).then(res => setNotifications(res.data)).catch(() => {});
    axios.get(`${API_BASE}/sos`).then(res => setSosAlerts(res.data)).catch(() => {});
  }, [user]);

  const login = useCallback(async (email, password) => {
    const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setBusData({});
    setNotifications([]);
    if (socket) socket.disconnect();
  }, [socket]);

  const markNotificationRead = useCallback(async (id) => {
    await axios.put(`${API_BASE}/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(async () => {
    await axios.put(`${API_BASE}/notifications/read-all`);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter(n => !n.read && (n.targetUserId === 'all' || n.targetUserId === user?.id)).length;

  return (
    <AppContext.Provider value={{
      user, token, socket, loading,
      notifications, unreadCount, busData, sosAlerts,
      login, logout,
      markNotificationRead, markAllRead,
      setBusData, setSosAlerts, setNotifications,
      API_BASE,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
