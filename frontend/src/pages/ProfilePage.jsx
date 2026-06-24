import { useState, useEffect } from 'react';
import { userService } from '../services/api';
import InterestPicker from '../components/InterestPicker';
import PhotoUploader from '../components/PhotoUploader';

function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await userService.getProfile();
      const data = response.data;
      if (typeof data.interests === 'string' && data.interests) {
        try { data.interests = JSON.parse(data.interests); } catch(e) { data.interests = []; }
      } else if (!data.interests) {
        data.interests = [];
      }
      setProfile(data);
      setFormData(data);
      setSelectedInterests(data.interests || []);
    } catch (error) {
      console.error('Error al cargar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleShiftChange = (e) => {
    const shift = e.target.value;
    const shiftTimes = {
      manana: { start: '09:00', end: '14:30' },
      tarde: { start: '14:30', end: '20:00' }
    };
    setFormData({
      ...formData,
      shift,
      shift_start: shiftTimes[shift]?.start || '',
      shift_end: shiftTimes[shift]?.end || ''
    });
  };

  const handlePhotoUpdate = (newPhotoUrl) => {
    setFormData(prev => ({ ...prev, photo_url: newPhotoUrl }));
    setProfile(prev => ({ ...prev, photo_url: newPhotoUrl }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await userService.updateProfile({
        ...formData,
        age: formData.age ? parseInt(formData.age) : undefined,
        interests: JSON.stringify(selectedInterests)
      });
      setMessage('Perfil actualizado correctamente');
      setEditing(false);
      loadProfile();
    } catch (error) {
      setMessage('Error al actualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const getShiftLabel = (shift) => {
    const labels = { manana: 'Manana', tarde: 'Tarde' };
    return labels[shift] || shift;
  };

  const getRoleLabel = (role) => {
    const labels = {
      agente: 'Agente',
      lider: 'Lider',
      supervisor: 'Supervisor',
      admin_sistema: 'Admin'
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {message && (
        <div className={`profile-message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="profile-view">
        {/* Hero Photo */}
        <div className="profile-hero">
          {(profile?.photo_url || profile?.photo) ? (
            <img src={profile.photo_url || profile.photo} alt={profile.name} className="profile-hero-img" />
          ) : (
            <div className="profile-hero-placeholder">
              <span>{profile?.name?.charAt(0)}</span>
            </div>
          )}
          <div className="profile-hero-gradient"></div>
          <div className="profile-hero-info">
            <h1>{profile?.name}, {profile?.age}</h1>
            <p>{profile?.position || 'Sin puesto'}</p>
          </div>
        </div>

        {/* Info Cards */}
        <div className="profile-sections">
          <div className="profile-section-card">
            <div className="section-row">
              <span className="section-icon">🏢</span>
              <div>
                <span className="section-label">Campana</span>
                <span className="section-value">{profile?.campaign || 'Sin asignar'}</span>
              </div>
            </div>
            <div className="section-divider"></div>
            <div className="section-row">
              <span className="section-icon">⏰</span>
              <div>
                <span className="section-label">Turno {getShiftLabel(profile?.shift)}</span>
                <span className="section-value">{profile?.shift_start} - {profile?.shift_end}</span>
              </div>
            </div>
            <div className="section-divider"></div>
            <div className="section-row">
              <span className="section-icon">📍</span>
              <div>
                <span className="section-label">{getRoleLabel(profile?.role)}</span>
                <span className="section-value">{profile?.floor || 'Sin piso asignado'}</span>
              </div>
            </div>
          </div>

          {profile?.bio && (
            <div className="profile-section-card">
              <h3>Sobre mi</h3>
              <p className="section-bio">{profile.bio}</p>
            </div>
          )}

          {profile?.interests && (Array.isArray(profile.interests) ? profile.interests.length > 0 : true) && (
            <div className="profile-section-card">
              <h3>Intereses</h3>
              <div className="profile-interests-grid">
                {(Array.isArray(profile.interests) ? profile.interests : profile.interests.split(',')).map((interest, i) => (
                  <span key={i} className="interest-pill">{interest.name || interest}</span>
                ))}
              </div>
            </div>
          )}

          <div className="profile-section-card">
            <div className="privacy-row">
              <span>{profile?.hide_from_bosses ? '🔒 Oculto de superiores' : '👁️ Visible para todos'}</span>
            </div>
          </div>

          <button onClick={() => setEditing(true)} className="btn-edit-profile">
            ✏️ Editar Perfil
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="profile-modal-overlay" onClick={() => setEditing(false)}>
          <div className="profile-modal" onClick={e => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h2>Editar Perfil</h2>
              <button className="modal-close" onClick={() => setEditing(false)}>✕</button>
            </div>

            <div className="profile-modal-body">
              <div className="modal-photo-section">
                <PhotoUploader
                  currentPhoto={formData.photo_url || formData.photo}
                  onPhotoUpdate={handlePhotoUpdate}
                />
                <span className="photo-hint">Toca para cambiar tu foto</span>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="modal-field">
                  <label>Nombre</label>
                  <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required />
                </div>

                <div className="modal-field">
                  <label>Edad</label>
                  <input type="number" name="age" value={formData.age || ''} onChange={handleChange} min="18" max="100" />
                </div>

                <div className="modal-field">
                  <label>Puesto</label>
                  <input type="text" name="position" value={formData.position || ''} onChange={handleChange} placeholder="Ej: Agente de Atencion" />
                </div>

                <div className="modal-field">
                  <label>Bio</label>
                  <textarea name="bio" value={formData.bio || ''} onChange={handleChange} rows="3" placeholder="Cuentanos algo de ti..." />
                </div>

                <div className="modal-field">
                  <label>Campana</label>
                  <select name="campaign" value={formData.campaign || ''} onChange={handleChange}>
                    <option value="">Seleccionar</option>
                    <option value="Cobranzas">Cobranzas</option>
                    <option value="Super Linea">Super Linea</option>
                  </select>
                </div>

                <div className="modal-field">
                  <label>Rol</label>
                  <select name="role" value={formData.role || ''} onChange={handleChange}>
                    <option value="agente">Agente</option>
                    <option value="lider">Lider</option>
                    <option value="supervisor">Supervisor</option>
                  </select>
                </div>

                <div className="modal-field">
                  <label>Turno</label>
                  <select name="shift" value={formData.shift || ''} onChange={handleShiftChange}>
                    <option value="">Seleccionar</option>
                    <option value="manana">Manana (09:00 - 14:30)</option>
                    <option value="tarde">Tarde (14:30 - 20:00)</option>
                  </select>
                </div>

                <div className="modal-field">
                  <label>Piso</label>
                  <select name="floor" value={formData.floor || ''} onChange={handleChange}>
                    <option value="">Seleccionar</option>
                    <option value="Piso 1">Piso 1</option>
                    <option value="Piso 2">Piso 2</option>
                    <option value="Piso 3">Piso 3</option>
                    <option value="Piso 4">Piso 4</option>
                  </select>
                </div>

                <div className="modal-field">
                  <label>Intereses (maximo 5)</label>
                  <InterestPicker
                    selected={selectedInterests}
                    onChange={setSelectedInterests}
                    max={5}
                  />
                </div>

                <label className="modal-toggle">
                  <span>Ocultarme de superiores</span>
                  <input
                    type="checkbox"
                    checked={formData.hide_from_bosses === 1}
                    onChange={(e) => setFormData({ ...formData, hide_from_bosses: e.target.checked ? 1 : 0 })}
                  />
                  <span className="toggle-switch"></span>
                </label>

                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => { setEditing(false); setFormData(profile); }}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-save" disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
