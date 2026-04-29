import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Dashboard    from './pages/Dashboard';
import Products     from './pages/Products';
import Transactions from './pages/Transactions';
import ChangePassword from './pages/ChangePassword';
import Login from './pages/Login';
import { getMe, logout } from './api';
import './App.css';

function PrivateLayout({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await onLogout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="logo">
          <span className="logo-icon">🏪</span>
          <span className="logo-text">المخزن</span>
        </div>
        <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
          <span className="nav-icon">📊</span><span className="nav-txt">Tableau de Bord</span>
        </NavLink>
        <NavLink to="/products" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
          <span className="nav-icon">📦</span><span className="nav-txt">Produits</span>
        </NavLink>
        <NavLink to="/transactions" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
          <span className="nav-icon">🔄</span><span className="nav-txt">Mouvements</span>
        </NavLink>
        <NavLink to="/change-password" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
          <span className="nav-icon">🔐</span><span className="nav-txt">Mot de passe</span>
        </NavLink>
        <div className="sidebar-footer">
          <span className="version">{user.email} (admin)</span>
          <button className="btn btn-secondary btn-logout" onClick={handleLogout}>
  <span className="nav-icon">🚪</span>
  <span className="nav-txt">Se deconnecter</span>
</button>

        </div>
      </nav>
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function AppRoutes() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const location = useLocation();

  useEffect(() => {
    getMe()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setCheckingSession(false));
  }, []);

  const onLogout = async () => {
    try {
      await logout();
    } finally {
      setUser(null);
    }
  };

  if (checkingSession) {
    return <div className="loading">⏳ Verification de session...</div>;
  }

  if (!user) {
    if (location.pathname !== '/login') {
      return <Navigate to="/login" replace />;
    }
    return (
      <Routes>
        <Route path="/login" element={<Login onLoginSuccess={setUser} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (user.role !== 'admin') {
    return <div className="error">❌ Acces admin uniquement</div>;
  }

  return <PrivateLayout user={user} onLogout={onLogout} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
