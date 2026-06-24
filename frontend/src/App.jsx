import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DiscoverPage from './pages/DiscoverPage';
import MatchesPage from './pages/MatchesPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import BreakZone from './pages/BreakZone';
import Navbar from './components/Navbar';
import './App.css';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Cargando...</div>;
  }
  
  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Cargando...</div>;
  }
  
  if (!user) return <Navigate to="/login" />;
  if (!user.is_admin) return <Navigate to="/discover" />;
  
  return children;
}

function AppContent() {
  const { user } = useAuth();

  return (
    <div className="app">
      {user && <Navbar />}
      <main className="main-content">
        <Routes>
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/discover" />} />
          <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/discover" />} />
          <Route path="/discover" element={
            <PrivateRoute><DiscoverPage /></PrivateRoute>
          } />
          <Route path="/matches" element={
            <PrivateRoute><MatchesPage /></PrivateRoute>
          } />
          <Route path="/chat/:matchId" element={
            <PrivateRoute><ChatPage /></PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute><ProfilePage /></PrivateRoute>
          } />
          <Route path="/break-zone" element={
            <PrivateRoute><BreakZone /></PrivateRoute>
          } />
          <Route path="/admin" element={
            <AdminRoute><AdminPage /></AdminRoute>
          } />
          <Route path="/" element={<Navigate to={user ? "/discover" : "/login"} />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
