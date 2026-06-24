import { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('catinder_user');
    const savedToken = localStorage.getItem('catinder_supabase_token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);

    const supabaseToken = data.session.access_token;
    localStorage.setItem('catinder_supabase_token', supabaseToken);

    const response = await api.post('/auth/sync-user', { supabase_token: supabaseToken });
    const profile = response.data.user;

    localStorage.setItem('catinder_user', JSON.stringify(profile));
    setUser(profile);
    return { user: profile, token: supabaseToken };
  };

  const register = async (registerData) => {
    const { data, error } = await supabase.auth.signUp({
      email: registerData.email,
      password: registerData.password,
      options: { data: { name: registerData.name } }
    });
    if (error) throw new Error(error.message);

    const supabaseToken = data.session?.access_token;
    if (!supabaseToken) throw new Error('Error al crear cuenta. Verifica tu email.');

    localStorage.setItem('catinder_supabase_token', supabaseToken);

    const response = await api.post('/auth/create-profile', {
      supabase_token: supabaseToken,
      ...registerData
    });
    const profile = response.data.user;

    localStorage.setItem('catinder_user', JSON.stringify(profile));
    setUser(profile);
    return { user: profile, token: supabaseToken };
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
