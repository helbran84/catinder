import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function RegisterPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    campaign: '',
    shift: '',
    shift_start: '',
    shift_end: '',

    floor: '',
    role: 'agente',
    position: '',
    bio: '',
    interests: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const shiftTimes = {
    manana: { start: '09:00', end: '14:30' },
    tarde: { start: '14:30', end: '20:00' }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleShiftChange = (e) => {
    const shift = e.target.value;
    setFormData({
      ...formData,
      shift,
      shift_start: shiftTimes[shift]?.start || '',
      shift_end: shiftTimes[shift]?.end || ''
    });
  };

  const nextStep = () => {
    setError('');
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.password) {
        setError('Completa nombre, email y password');
        return;
      }
      if (formData.password.length < 6) {
        setError('El password debe tener minimo 6 caracteres');
        return;
      }
      if (!formData.email.endsWith('@cat.com')) {
        setError('Debes usar un email @cat.com');
        return;
      }
    }
    if (step === 2) {
      if (!formData.campaign || !formData.shift) {
        setError('Selecciona campana y turno');
        return;
      }
    }
    setStep(step + 1);
  };

  const prevStep = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register({
        ...formData,
        age: formData.age ? parseInt(formData.age) : undefined
      });
      navigate('/discover');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  const getShiftLabel = (shift) => {
    const labels = {
      manana: 'Turno Ma\u00F1ana',
      tarde: 'Turno Tarde'
    };
    return labels[shift] || '';
  };

  return (
    <div className="auth-page">
      <div className="register-container">
        <div className="register-header">
          <img src="/logotipo.png" alt="CATINDER" className="register-logo" />
          <h1>CATINDER</h1>
          <p>Encuentra tu match en la empresa</p>
        </div>

        {/* Progress Bar */}
        <div className="progress-bar">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className={`progress-line ${step >= 2 ? 'active' : ''}`}></div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>2</div>
          <div className={`progress-line ${step >= 3 ? 'active' : ''}`}></div>
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>3</div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="register-form">
          {/* Step 1: Datos Personales */}
          {step === 1 && (
            <div className="step-content">
              <h2>Tu Informacion</h2>
              <p className="step-subtitle">Crea tu cuenta para empezar</p>
              
              <div className="input-group">
                <label>Nombre completo</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Como te llamas?"
                  required
                />
              </div>

              <div className="input-group">
                <label>Email corporativo</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="xxxxx@cat.com"
                  required
                />
                <span className="input-hint">Solo emails @cat.com</span>
              </div>

              <div className="input-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimo 6 caracteres"
                  minLength="6"
                  required
                />
              </div>

              <button type="button" onClick={nextStep} className="btn-primary btn-full">
                Continuar
              </button>
            </div>
          )}

          {/* Step 2: Empresa */}
          {step === 2 && (
            <div className="step-content">
              <h2>Tu Turno</h2>
              <p className="step-subtitle">Para encontrarte con gente de tu horario</p>
              
              <div className="input-group">
                <label>Campana</label>
                <select name="campaign" value={formData.campaign} onChange={handleChange} required>
                  <option value="">Seleccionar</option>
                  <option value="Cobranzas">Cobranzas</option>
                  <option value="Super Linea">Super Linea</option>
                </select>
              </div>

              <div className="input-group">
                <label>Rol</label>
                <select name="role" value={formData.role || ''} onChange={handleChange}>
                  <option value="agente">Agente</option>
                  <option value="lider">Lider</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </div>

              <div className="shift-options">
                <label className="shift-label">Turno</label>
                <div className="shift-grid">
                  {Object.entries(shiftTimes).map(([key, times]) => (
                    <label 
                      key={key} 
                      className={`shift-card ${formData.shift === key ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="shift"
                        value={key}
                        checked={formData.shift === key}
                        onChange={handleShiftChange}
                        required
                      />
                      <span className="shift-name">{getShiftLabel(key)}</span>
                      <span className="shift-time">{times.start} - {times.end}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="btn-group">
                <button type="button" onClick={prevStep} className="btn-secondary">
                  Atras
                </button>
                <button type="button" onClick={nextStep} className="btn-primary">
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Ubicacion y extras */}
          {step === 3 && (
            <div className="step-content">
              <h2>Tu Ubicacion</h2>
              <p className="step-subtitle">Para encontrarte en el piso</p>
              
              <div className="input-row">
                <div className="input-group">
                  <label>Piso</label>
                  <select name="floor" value={formData.floor} onChange={handleChange}>
                    <option value="">Seleccionar</option>
                    <option value="Piso 1">Piso 1</option>
                    <option value="Piso 2">Piso 2</option>
                    <option value="Piso 3">Piso 3</option>
                    <option value="Piso 4">Piso 4</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label>Puesto</label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  placeholder="Ej: Agente de Atencion"
                />
              </div>

              <div className="input-group">
                <label>Sobre ti (opcional)</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Cuentanos algo de ti..."
                  rows="2"
                />
              </div>

              <div className="input-group">
                <label>Intereses (opcional)</label>
                <input
                  type="text"
                  name="interests"
                  value={formData.interests}
                  onChange={handleChange}
                  placeholder="musica, deportes, series"
                />
              </div>

              <div className="btn-group">
                <button type="button" onClick={prevStep} className="btn-secondary">
                  Atras
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Creando...' : 'Crear Cuenta'}
                </button>
              </div>
            </div>
          )}
        </form>

        <div className="auth-footer">
          <p>Ya tienes cuenta? <Link to="/login">Inicia sesion</Link></p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
