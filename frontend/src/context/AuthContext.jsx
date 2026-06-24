import { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('catinder_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) throw new Error('Perfil no encontrado');
    if (!data.is_active) throw new Error('Cuenta desactivada');
    return data;
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);

    const profile = await fetchProfile(data.user.id);

    localStorage.setItem('catinder_user', JSON.stringify(profile));
    localStorage.setItem('catinder_supabase_token', data.session.access_token);
    setUser(profile);
    return { user: profile };
  };

  const register = async (registerData) => {
    const { data, error } = await supabase.auth.signUp({
      email: registerData.email,
      password: registerData.password,
      options: { data: { name: registerData.name } }
    });
    if (error) throw new Error(error.message);
    if (!data.session) throw new Error('Error al crear cuenta. Verifica tu email.');

    const profileData = {
      id: data.user.id,
      email: registerData.email,
      name: registerData.name,
      age: registerData.age || null,
      campaign: registerData.campaign,
      shift: registerData.shift,
      shift_start: registerData.shift_start,
      shift_end: registerData.shift_end,
      floor: registerData.floor || null,
      role: registerData.role || 'agente',
      position: registerData.position || null,
      bio: registerData.bio || null,
      interests: registerData.interests || '[]',
      is_active: true,
      is_admin: false
    };

    const { error: insertError } = await supabase.from('users').insert(profileData);
    if (insertError) throw new Error('Error al crear perfil: ' + insertError.message);

    localStorage.setItem('catinder_user', JSON.stringify(profileData));
    localStorage.setItem('catinder_supabase_token', data.session.access_token);
    setUser(profileData);
    return { user: profileData };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('catinder_supabase_token');
    localStorage.removeItem('catinder_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
