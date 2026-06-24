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
    same_floor: false,
    role_filter: ''
  });
  const [showFilters, setShowFilters] = useState(false);

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

  const activeFiltersCount = Object.values(filters).filter(v => v && v !== '').length;

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

      {/* Filter Modal */}
      {showFilters && (
        <div className="filter-modal-overlay" onClick={() => setShowFilters(false)}>
          <div className="filter-modal" onClick={e => e.stopPropagation()}>
            <div className="filter-modal-header">
              <h3>Filtros</h3>
              <button className="filter-modal-close" onClick={() => setShowFilters(false)}>✕</button>
            </div>

            <div className="filter-modal-body">
              <label className="filter-modal-option">
                <span>Mismo turno</span>
                <input type="checkbox" checked={filters.same_shift} onChange={() => handleFilterChange('same_shift')} />
                <span className="filter-toggle"></span>
              </label>

              <label className="filter-modal-option">
                <span>Misma campana</span>
                <input type="checkbox" checked={filters.same_campaign} onChange={() => handleFilterChange('same_campaign')} />
                <span className="filter-toggle"></span>
              </label>

              <label className="filter-modal-option">
                <span>Mismo piso</span>
                <input type="checkbox" checked={filters.same_floor} onChange={() => handleFilterChange('same_floor')} />
                <span className="filter-toggle"></span>
              </label>

              <div className="filter-modal-option">
                <span>Rol</span>
                <select
                  value={filters.role_filter}
                  onChange={(e) => handleFilterChange('role_filter', e.target.value)}
                  className="filter-modal-select"
                >
                  <option value="">Todos</option>
                  <option value="agente">Agentes</option>
                  <option value="lider">Lideres</option>
                  <option value="supervisor">Supervisores</option>
                </select>
              </div>
            </div>

            <div className="filter-modal-footer">
              <button className="btn-secondary" onClick={() => {
                setFilters({ same_shift: false, same_campaign: false, same_floor: false, role_filter: '' });
              }}>Limpiar</button>
              <button className="btn-primary" onClick={() => setShowFilters(false)}>Aplicar</button>
            </div>
          </div>
        </div>
      )}

      <div className="discover-container">
        {/* Filter Button */}
        <div className="discover-filter-bar">
          <button className="filter-trigger" onClick={() => setShowFilters(true)}>
            <span>⚙️ Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="filter-badge">{activeFiltersCount}</span>
            )}
          </button>
          <span className="pagination-info">
            {totalProfiles > 0 && `${currentProfileIndex + 1}/${totalProfiles}`}
          </span>
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
