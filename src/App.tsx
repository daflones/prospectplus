import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/DashboardNew';
import Prospecting from './pages/Prospecting';
import LeadsPage from './pages/LeadsPage';
import Campaigns from './pages/Campaigns';
import Settings from './pages/Settings';
import InstanceSettings from './pages/InstanceSettings';
import Login from './pages/Login';
import Register from './pages/Register';
import PrivateRoute, { PublicRoute } from './components/auth/PrivateRoute';

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    // Verificar autenticação ao iniciar a aplicação
    checkAuth();
  }, [checkAuth]);

  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#0f172a',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } />
        
        {/* Rotas Privadas */}
        <Route path="/" element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="prospecting" element={<Prospecting />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="settings" element={<Settings />} />
          <Route path="instances" element={<InstanceSettings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
