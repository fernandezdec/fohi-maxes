import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { getToken, clearToken, setToken, api } from './api';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sessions from './pages/Sessions';
import SessionEntry from './pages/SessionEntry';
import Leaderboard from './pages/Leaderboard';
import Pods from './pages/Pods';
import Roster from './pages/Roster';
import PlayerDetail from './pages/PlayerDetail';
import './App.css';

export const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

const COACH_ROLES = ['coach', 'admin', 'head_coach', 'coordinator', 'position_coach'];
export function isCoach(role) { return COACH_ROLES.includes(role); }

function parseJwt(token) {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
}

function NavBar({ user, onLogout }) {
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path) ? 'active' : '';
  return (
    <nav className="navbar">
      <div className="nav-brand">
        <span className="nav-logo">💪</span>
        <div>
          <div className="nav-title">FOHI MAXES</div>
          <div className="nav-sub">Steelers Strength</div>
        </div>
      </div>
      <div className="nav-links">
        <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>Dashboard</Link>
        <Link to="/sessions" className={`nav-link ${isActive('/sessions')}`}>Sessions</Link>
        <Link to="/leaderboard" className={`nav-link ${isActive('/leaderboard')}`}>Leaderboard</Link>
        {isCoach(user?.role) && <>
          <Link to="/pods" className={`nav-link ${isActive('/pods')}`}>Pods</Link>
          <Link to="/roster" className={`nav-link ${isActive('/roster')}`}>Roster</Link>
        </>}
      </div>
      <div className="nav-right">
        <span className="nav-user">{user?.fullName || user?.username}</span>
        <button className="nav-logout" onClick={onLogout}>Sign Out</button>
      </div>
    </nav>
  );
}

function ProtectedLayout({ user, onLogout }) {
  return (
    <div className="app-layout">
      <NavBar user={user} onLogout={onLogout} />
      <main className="main-content">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/sessions/:id" element={<SessionEntry />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/pods" element={<Pods />} />
          <Route path="/roster" element={<Roster />} />
          <Route path="/players/:id" element={<PlayerDetail />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      const parsed = parseJwt(token);
      if (parsed && parsed.exp * 1000 > Date.now()) setUser(parsed);
      else clearToken();
    }
    setLoading(false);
  }, []);

  function handleLogin(token, userData) {
    setToken(token);
    setUser(userData);
  }

  function handleLogout() {
    clearToken();
    setUser(null);
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <AuthContext.Provider value={{ user, handleLogin }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
          <Route path="/*" element={
            user ? <ProtectedLayout user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />
          } />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
