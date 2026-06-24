import { useState, useEffect, useCallback } from 'react';
import { userService } from '../services/api';
import './BreakZone.css';

function BreakZone() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [myCampaign, setMyCampaign] = useState('');
  const [inviting, setInviting] = useState(null);
  const [matchEffect, setMatchEffect] = useState(false);
  const [matchName, setMatchName] = useState('');
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [profileRes, zonesRes] = await Promise.all([
        userService.getProfile(),
        userService.getBreakZones()
      ]);
      setMyCampaign(profileRes.data.campaign || '');
      setIsOnBreak(profileRes.data.is_on_break || false);
      setZones(zonesRes.data.zones || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const toggleBreak = async () => {
    try {
      if (isOnBreak) {
        await userService.deactivateBreak();
        setIsOnBreak(false);
      } else {
        await userService.activateBreak();
        setIsOnBreak(true);
      }
      loadData();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const invitePerson = async (userId, name) => {
    setInviting(userId);
    try {
      const res = await userService.inviteBreak(userId);
      setMatchName(name);
      setMatchEffect(true);
      setMessage(res.data.message);
      setIsOnBreak(false);
      setTimeout(() => {
        setMatchEffect(false);
        setMessage('');
      }, 3000);
      loadData();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Error al invitar');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setInviting(null);
    }
  };

  const getShiftLabel = (shift) => {
    const labels = { manana: 'Turno Ma\u00F1ana', tarde: 'Turno Tarde' };
    return labels[shift] || shift;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando zonas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="break-zone-page">
      {matchEffect && (
        <div className="match-overlay">
          <div className="match-animation">
            <img src="/logotipo.png" alt="Match" className="match-logo" />
            <h2>Break Match!</h2>
            <p>{message || `Tienes 20 minutos con ${matchName}`}</p>
          </div>
        </div>
      )}

      {message && !matchEffect && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="break-zone-header">
        <div className="break-zone-title">
          <span className="zone-icon">☕</span>
          <div>
            <h1>Break Zone</h1>
            <p>Encuentra a tu equipo en el descanso</p>
          </div>
        </div>
        <button
          className={`break-toggle-btn ${isOnBreak ? 'active' : ''}`}
          onClick={toggleBreak}
        >
          {isOnBreak ? 'Cancelar Break' : 'Estoy en Break'}
          {isOnBreak && <span className="break-timer">20 min</span>}
        </button>
      </div>

      <div className="zones-grid">
        {zones.length > 0 ? (
          zones.map((zone) => (
            <div key={zone.name} className={`zone-card ${zone.name === myCampaign ? 'my-zone' : ''}`}>
              <div className="zone-header">
                <h3>{zone.name}</h3>
                <span className="zone-count">{zone.count} disponible{zone.count !== 1 ? 's' : ''}</span>
              </div>
              <div className="zone-people">
                {zone.people.map((person) => (
                  <div key={person.id} className="zone-person">
                    <div className="zone-person-photo">
                      {person.photo ? (
                        <img src={person.photo} alt={person.name} />
                      ) : (
                        <div className="zone-photo-placeholder">
                          <span>{person.name.charAt(0)}</span>
                        </div>
                      )}
                      <div className="zone-person-status"></div>
                    </div>
                    <div className="zone-person-info">
                      <h4>{person.name}</h4>
                      <p>{person.position}</p>
                      <div className="zone-person-meta">
                        <span className="zone-shift">{getShiftLabel(person.shift)}</span>
                        {person.floor && <span className="zone-floor">{person.floor}</span>}
                      </div>
                    </div>
                    <button
                      className="zone-invite-btn"
                      onClick={() => invitePerson(person.id, person.name)}
                      disabled={inviting === person.id || !isOnBreak}
                    >
                      {inviting === person.id ? '...' : 'Invitar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="zone-empty">
            <span className="zone-empty-icon">☕</span>
            <h2>Nadie en break ahora</h2>
            <p>Activa tu break para que otros te vean en tu zona</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BreakZone;
