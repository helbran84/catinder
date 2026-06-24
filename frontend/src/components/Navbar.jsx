import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/discover', icon: '🔍', label: 'Descubrir' },
    { to: '/matches', icon: '💜', label: 'Matches' },
    { to: '/break-zone', icon: '☕', label: 'Break' },
    { to: '/profile', icon: '👤', label: 'Perfil' },
  ];

  if (user?.is_admin) {
    navItems.push({ to: '/admin', icon: '⚙️', label: 'Admin' });
  }

  return (
    <>
      <nav className="navbar">
        <Link to="/discover" className="nav-logo">
          <img src="/catinder-text.png" alt="CATINDER" className="nav-logo-img" />
        </Link>

        <div className="nav-links">
          {navItems.map(item => (
            <Link key={item.to} to={item.to} className="nav-link">
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="nav-user">
          <span className="user-name">Hola, {user?.name}</span>
          <button onClick={handleLogout} className="btn-logout">Salir</button>
        </div>

        <button className="nav-hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
        </button>
      </nav>

      <div className={`nav-mobile-menu ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)}>
        <div className="mobile-menu-content" onClick={e => e.stopPropagation()}>
          <div className="mobile-user">
            <span className="mobile-user-icon">👤</span>
            <span>Hola, {user?.name}</span>
          </div>
          {navItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`mobile-nav-link ${location.pathname === item.to ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          <button onClick={handleLogout} className="mobile-logout">Cerrar sesion</button>
        </div>
      </div>

      <nav className="nav-bottom">
        {navItems.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`nav-bottom-link ${location.pathname === item.to ? 'active' : ''}`}
          >
            <span className="nav-bottom-icon">{item.icon}</span>
            <span className="nav-bottom-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

export default Navbar;
