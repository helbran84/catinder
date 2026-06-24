import { useState, useEffect, useCallback } from 'react';
import { userService } from '../services/api';

function parseInterests(interests) {
  if (!interests) return [];
  if (Array.isArray(interests)) return interests;
  if (typeof interests === 'string') {
    try {
      const parsed = JSON.parse(interests);
      return Array.isArray(parsed) ? parsed : [];
    } catch(e) {
      return interests.split(',').map(i => ({ name: i.trim() })).filter(i => i.name);
    }
  }
  return [];
}

function DiscoverPage() {
  const [profiles, setProfiles] = useState([]);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const [matchEffect, setMatchEffect] = useState(false);
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalProfiles, setTotalProfiles] = useState(0);
  
  // Filtros
  const [filters, setFilters] = useState({
    same_shift: false,
    same_campaign: false,
    same_building: false,
    same_floor: false,
    role_filter: ''
  });

  const loadProfiles = useCallback(async (pageNum = 1, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    try {
      const response = await userService.getDiscover(pageNum, filters);
      const newProfiles = response.data.profiles || [];
      const pagination = response.data.pagination;
      
      if (append) {
        setProfiles(prev => [...prev, ...newProfiles]);
      } else {
        setProfiles(newProfiles);
        setCurrentProfileIndex(0);
      }
      
      setTotalProfiles(pagination.total);
      setHasMore(pageNum < pagination.pages);
    } catch (error) {
      console.error('Error al cargar perfiles:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters]);

  useEffect(() => {
    loadProfiles(1, false);
    setPage(1);
  }, [filters]);

  const loadMoreProfiles = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadProfiles(nextPage, true);
    }
  }, [page, loadingMore, hasMore, loadProfiles]);

  const currentProfile = profiles[currentProfileIndex] || null;

  const handleSwipe = async (direction) => {
    if (swiping || !currentProfile) return;
    
    setSwiping(true);
    try {
      const response = await userService.swipe(direction, currentProfile.id);
      
      if (response.data.matched) {
        setMatchEffect(true);
        setMessage(`Match! Tu y ${currentProfile.name} se han gustado mutuamente!`);
        setTimeout(() => {
          setMatchEffect(false);
          moveToNext();
        }, 3000);
      } else {
        moveToNext();
      }
    } catch (error) {
      console.error('Error al hacer swipe:', error);
    } finally {
      setSwiping(false);
    }
  };

  const moveToNext = () => {
    const nextIndex = currentProfileIndex + 1;
    
    if (nextIndex >= profiles.length) {
      if (hasMore) {
        loadMoreProfiles();
      } else {
        setCurrentProfileIndex(nextIndex);
      }
    } else {
      setCurrentProfileIndex(nextIndex);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value !== undefined ? value : !prev[filterName]
    }));
  };

  const getShiftLabel = (shift) => {
    const labels = {
      manana: 'Turno Ma\u00F1ana',
      tarde: 'Turno Tarde'
    };
    return labels[shift] || shift;
  };

  if (loading) {
    return (
      <div className="discover-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Buscando perfiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="discover-page">
      {matchEffect && (
        <div className="match-overlay">
          <div className="match-animation">
            <img src="/logotipo.png" alt="Match" className="match-logo" />
            <h2>¡MATCH!</h2>
            <p>{message}</p>
          </div>
        </div>
      )}

      <div className="discover-container">
        {/* Filtros */}
        <div className="discover-filters">
          <h3>Filtros</h3>
          <div className="filter-options">
            <label className={`filter-checkbox ${filters.same_shift ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={filters.same_shift}
                onChange={() => handleFilterChange('same_shift')}
              />
              <span>Mismo turno</span>
            </label>
            
            <label className={`filter-checkbox ${filters.same_campaign ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={filters.same_campaign}
                onChange={() => handleFilterChange('same_campaign')}
              />
              <span>Misma campana</span>
            </label>
            
            <label className={`filter-checkbox ${filters.same_building ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={filters.same_building}
                onChange={() => handleFilterChange('same_building')}
              />
              <span>Mismo piso</span>
            </label>
            
            <label className={`filter-checkbox ${filters.same_floor ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={filters.same_floor}
                onChange={() => handleFilterChange('same_floor')}
              />
              <span>Mismo piso</span>
            </label>
          </div>

          <div className="role-filter" style={{marginTop: '0.5rem'}}>
            <select 
              value={filters.role_filter} 
              onChange={(e) => handleFilterChange('role_filter', e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '6px 12px',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                width: '100%'
              }}
            >
              <option value="">Todos los roles</option>
              <option value="agente">Agentes</option>
              <option value="lider">Lideres</option>
              <option value="supervisor">Supervisores</option>
            </select>
          </div>
          
          <div className="pagination-info">
            {totalProfiles > 0 && (
              <span>Mostrando {currentProfileIndex + 1} de {totalProfiles} perfiles</span>
            )}
          </div>
        </div>

        {/* Tarjeta de perfil */}
        {!currentProfile || currentProfileIndex >= profiles.length ? (
          <div className="empty-state">
            <img src="/logotipo.png" alt="CATINDER" className="empty-logo" />
            <h2>No hay mas perfiles</h2>
            <p>Prueba con otros filtros o vuelve mas tarde</p>
            {loadingMore && <div className="loading-spinner"></div>}
            <button 
              onClick={() => { setPage(1); loadProfiles(1, false); }} 
              className="btn-primary"
              disabled={loadingMore}
            >
              Buscar de nuevo
            </button>
          </div>
        ) : (
          <div className="profile-card">
            <div className="profile-photo">
              {currentProfile.photo_url ? (
                <img src={currentProfile.photo_url} alt={currentProfile.name} />
              ) : currentProfile.photo ? (
                <img src={currentProfile.photo} alt={currentProfile.name} />
              ) : (
                <div className="photo-placeholder">
                  <span>{currentProfile.name.charAt(0)}</span>
                </div>
              )}
            </div>

            <div className="profile-info">
              <h2 className="profile-name">
                {currentProfile.name}
                {currentProfile.age && <span className="profile-age">, {currentProfile.age}</span>}
              </h2>
              
              <div className="profile-shift-info">
                <span className="shift-badge">{getShiftLabel(currentProfile.shift)}</span>
                <span className="shift-time">{currentProfile.shift_start} - {currentProfile.shift_end}</span>
              </div>

              {currentProfile.campaign && (
                <p className="profile-campaign">{currentProfile.campaign}</p>
              )}
              
              {currentProfile.position && (
                <p className="profile-position">{currentProfile.position}</p>
              )}
              
              {currentProfile.floor && (
                <p className="profile-location">
                  {currentProfile.floor}
                </p>
              )}
              
              {currentProfile.bio && (
                <p className="profile-bio">{currentProfile.bio}</p>
              )}
              
              {(() => {
                const interests = parseInterests(currentProfile.interests);
                return interests.length > 0 && (
                  <div className="profile-interests">
                    {interests.map((interest, index) => (
                      <span key={interest.id || index} className="interest-tag">
                        {interest.name || interest}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="swipe-actions">
              <button 
                className="swipe-btn nope-btn"
                onClick={() => handleSwipe('nope')}
                disabled={swiping}
              >
                <span>✕</span>
              </button>
              
              <button 
                className="swipe-btn like-btn"
                onClick={() => handleSwipe('like')}
                disabled={swiping}
              >
                <span>💜</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DiscoverPage;
