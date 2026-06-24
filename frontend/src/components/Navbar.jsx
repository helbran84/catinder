import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/discover" className="nav-logo">
        <img src="/catinder-text.png" alt="CATINDER" className="nav-logo-img" />
      </Link>

      <div className="nav-links">
        <Link to="/discover" className="nav-link">
          <span className="nav-icon">🔍</span>
          <span>Descubrir</span>
        </Link>
        <Link to="/matches" className="nav-link">
          <span className="nav-icon">💜</span>
          <span>Matches</span>
        </Link>
        <Link to="/break-zone" className="nav-link">
          <span className="nav-icon">☕</span>
          <span>Break</span>
        </Link>
        <Link to="/profile" className="nav-link">
          <span className="nav-icon">👤</span>
          <span>Perfil</span>
        </Link>
        {user?.is_admin && (
          <Link to="/admin" className="nav-link">
            <span className="nav-icon">⚙️</span>
            <span>Admin</span>
          </Link>
        )}
      </div>

      <div className="nav-user">
        <span className="user-name">Hola, {user?.name}</span>
        <button onClick={handleLogout} className="btn-logout">
          Salir
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
