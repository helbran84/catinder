import { useState, useEffect } from 'react';
import { adminService } from '../services/api';

function AdminPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        adminService.getStats(),
        adminService.getUsers()
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      await adminService.toggleUserStatus(userId);
      loadData();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
    }
  };

  const handleToggleAdmin = async (userId) => {
    try {
      await adminService.toggleUserAdmin(userId);
      loadData();
    } catch (error) {
      console.error('Error al cambiar rol:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Estas seguro de eliminar este usuario? Esta accion no se puede deshacer.')) {
      try {
        await adminService.deleteUser(userId);
        loadData();
      } catch (error) {
        console.error('Error al eliminar usuario:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando panel de admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Panel de Administracion</h1>
      </div>

      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Estadisticas
        </button>
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Usuarios
        </button>
      </div>

      {activeTab === 'stats' && stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">👥</span>
            <div className="stat-info">
              <h3>{stats.totalUsers}</h3>
              <p>Usuarios Totales</p>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon">✅</span>
            <div className="stat-info">
              <h3>{stats.activeUsers}</h3>
              <p>Usuarios Activos</p>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon">💜</span>
            <div className="stat-info">
              <h3>{stats.totalMatches}</h3>
              <p>Matches Totales</p>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-icon">💬</span>
            <div className="stat-info">
              <h3>{stats.totalMessages}</h3>
              <p>Mensajes Totales</p>
            </div>
          </div>

          {stats.departmentStats.length > 0 && (
            <div className="stat-card full-width">
              <h3>Usuarios por Departamento</h3>
              <div className="dept-stats">
                {stats.departmentStats.map((dept, index) => (
                  <div key={index} className="dept-item">
                    <span>{dept.department}</span>
                    <span className="dept-count">{dept.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Departamento</th>
                <th>Estado</th>
                <th>Rol</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.department || '-'}</td>
                  <td>
                    <span className={`status-badge ${u.is_active ? 'active' : 'inactive'}`}>
                      {u.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <span className={`role-badge ${u.is_admin ? 'admin' : u.role === 'supervisor' ? 'supervisor' : u.role === 'lider' ? 'lider' : 'user'}`}>
                      {u.is_admin ? 'Admin' : u.role === 'supervisor' ? 'Supervisor' : u.role === 'lider' ? 'Lider' : 'Agente'}
                    </span>
                  </td>
                  <td className="actions">
                    <button 
                      onClick={() => handleToggleStatus(u.id)}
                      className="btn-sm"
                    >
                      {u.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button 
                      onClick={() => handleToggleAdmin(u.id)}
                      className="btn-sm"
                    >
                      {u.is_admin ? 'Quitar Admin' : 'Hacer Admin'}
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(u.id)}
                      className="btn-sm btn-danger"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
