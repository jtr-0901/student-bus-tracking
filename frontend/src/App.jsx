import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider, useApp } from './context/AppContext';
import Login from './pages/Login';
import ParentDashboard from './pages/ParentDashboard';
import DriverDashboard from './pages/DriverDashboard';
import ConductorDashboard from './pages/ConductorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Navbar from './components/Navbar';

function AppRoutes() {
  const { user, loading } = useApp();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader" />
        <p>Loading BusTrack Pro...</p>
      </div>
    );
  }

  if (!user) return <Login />;

  const dashboards = {
    parent:    <ParentDashboard />,
    driver:    <DriverDashboard />,
    conductor: <ConductorDashboard />,
    admin:     <AdminDashboard />,
  };

  return (
    <div className="app-layout">
      <div className="animated-bg" />
      <Navbar />
      <Routes>
        <Route path="/" element={dashboards[user.role] || <div>Unknown role</div>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a2740',
              color: '#f1f5f9',
              border: '1px solid rgba(255,255,255,0.1)',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.875rem',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </AppProvider>
    </BrowserRouter>
  );
}
