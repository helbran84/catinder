import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { matchService } from '../services/api';

function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      const response = await matchService.getMatches();
      setMatches(response.data);
    } catch (error) {
      console.error('Error al cargar matches:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="matches-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="matches-page">
      <div className="page-header">
        <h1>Mis Matches</h1>
        <p>{matches.length} {matches.length === 1 ? 'match' : 'matches'}</p>
      </div>

      {matches.length === 0 ? (
        <div className="empty-state">
          <img src="/logotipo.png" alt="CATINDER" className="empty-logo" />
          <h2>Sin matches aun</h2>
          <p>Ve a descubrir y haz swipe a personas que te gusten</p>
          <Link to="/discover" className="btn-primary">
            Descubrir
          </Link>
        </div>
      ) : (
        <div className="matches-grid">
          {matches.map((match) => (
            <Link to={`/chat/${match.id}`} key={match.id} className="match-card">
              <div className="match-photo">
                {match.otherUser.photo_url ? (
                  <img src={match.otherUser.photo_url} alt={match.otherUser.name} />
                ) : match.otherUser.photo ? (
                  <img src={match.otherUser.photo} alt={match.otherUser.name} />
                ) : (
                  <div className="photo-placeholder">
                    <span>{match.otherUser.name.charAt(0)}</span>
                  </div>
                )}
              </div>
              
              <div className="match-info">
                <h3>{match.otherUser.name}</h3>
                {match.otherUser.department && (
                  <p className="match-dept">{match.otherUser.department}</p>
                )}
                {match.lastMessage && (
                  <p className="match-last-message">
                    {match.lastMessage.content.substring(0, 30)}
                    {match.lastMessage.content.length > 30 ? '...' : ''}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default MatchesPage;
