import { useState, useEffect } from 'react';
import { userService } from '../services/api';
import InterestPicker from '../components/InterestPicker';
import { INTERESTS } from '../data/interests';

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
      shift_start: shiftTimes[shift]?.start || formData.shift_start,
      shift_end: shiftTimes[shift]?.end || formData.shift_end
    });
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
    const labels = {
      manana: 'Turno Ma\u00F1ana',
      tarde: 'Turno Tarde'
    };
    return labels[shift] || shift;
  };

  const getRoleLabel = (role) => {
    const labels = {
      agente: 'Agente',
      lider: 'Lider',
      supervisor: 'Supervisor',
      admin_sistema: 'Admin Sistema'
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
      <div className="page-header">
        <h1>Mi Perfil</h1>
      </div>

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="profile-container">
        <div className="profile-card-large">
          <div className="profile-photo-large">
            {profile?.photo ? (
              <img src={profile.photo} alt={profile.name} />
            ) : (
              <div className="photo-placeholder-large">
                <span>{profile?.name?.charAt(0)}</span>
              </div>
            )}
          </div>

          {!editing ? (
            <div className="profile-details">
              <h2>{profile?.name}</h2>
              {profile?.age && <p className="detail-age">{profile.age} años</p>}
              
              <div className="detail-shift">
                <span className="shift-badge">{getShiftLabel(profile?.shift)}</span>
                <span className="shift-time">{profile?.shift_start} - {profile?.shift_end}</span>
              </div>

              {profile?.campaign && (
                <p className="detail-campaign">{profile.campaign}</p>
              )}
              
              {profile?.position && (
                <p className="detail-position">{profile.position}</p>
              )}
              
              <p className="detail-role">{getRoleLabel(profile?.role)}</p>
              
              {profile?.floor && (
                <p className="detail-location">
                  {profile.floor}
                </p>
              )}
              
              {profile?.bio && (
                <p className="detail-bio">{profile.bio}</p>
              )}
              
              {profile?.interests && profile.interests.length > 0 && (
                <div className="detail-interests">
                  {Array.isArray(profile.interests)
                    ? profile.interests.map((interest, index) => (
                        <span key={interest.id || index} className="interest-tag">{interest.name || interest}</span>
                      ))
                    : profile.interests.split(',').map((interest, index) => (
                        <span key={index} className="interest-tag">{interest.trim()}</span>
                      ))
                  }
                </div>
              )}

              <div className="detail-privacy">
                <span className={`privacy-status ${profile?.hide_from_bosses ? 'active' : ''}`}>
                  {profile?.hide_from_bosses ? '🔒 Oculto de superiores' : '👁️ Visible para todos'}
                </span>
              </div>
              
              <button onClick={() => setEditing(true)} className="btn-primary">
                Editar Perfil
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-section">
                <h3>Datos Personales</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Nombre</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name || ''}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Edad</label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age || ''}
                      onChange={handleChange}
                      min="18"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Datos Laborales</h3>
                
                <div className="form-group">
                  <label>Campana</label>
                  <select name="campaign" value={formData.campaign || ''} onChange={handleChange}>
                    <option value="">Seleccionar</option>
                    <option value="Cobranzas">Cobranzas</option>
                    <option value="Super Linea">Super Linea</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Rol</label>
                  <select name="role" value={formData.role || ''} onChange={handleChange}>
                    <option value="agente">Agente</option>
                    <option value="lider">Lider</option>
                    <option value="supervisor">Supervisor</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Turno</label>
                  <select name="shift" value={formData.shift || ''} onChange={handleShiftChange}>
                    <option value="">Seleccionar</option>
                    <option value="manana">Turno Mañana (09:00 - 14:30)</option>
                    <option value="tarde">Turno Tarde (14:30 - 20:00)</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Horario Inicio</label>
                    <input
                      type="time"
                      name="shift_start"
                      value={formData.shift_start || ''}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Horario Fin</label>
                    <input
                      type="time"
                      name="shift_end"
                      value={formData.shift_end || ''}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Ubicacion</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Piso</label>
                    <select name="floor" value={formData.floor || ''} onChange={handleChange}>
                      <option value="">Seleccionar</option>
                      <option value="Piso 1">Piso 1</option>
                      <option value="Piso 2">Piso 2</option>
                      <option value="Piso 3">Piso 3</option>
                      <option value="Piso 4">Piso 4</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Sobre Ti</h3>
                
                <div className="form-group">
                  <label>Puesto</label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position || ''}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Bio</label>
                  <textarea
                    name="bio"
                    value={formData.bio || ''}
                    onChange={handleChange}
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>Intereses (maximo 5)</label>
                  <InterestPicker
                    selected={selectedInterests}
                    onChange={setSelectedInterests}
                    max={5}
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>Privacidad</h3>
                
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="hide_from_bosses"
                    checked={formData.hide_from_bosses === 1}
                    onChange={(e) => setFormData({
                      ...formData,
                      hide_from_bosses: e.target.checked ? 1 : 0
                    })}
                  />
                  <span>Ocultarme de superiores y supervisores</span>
                </label>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={() => { setEditing(false); setFormData(profile); }}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
