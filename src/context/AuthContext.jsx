import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchMe, login as loginRequest } from '../api/auth.js';
import { getToken, setToken } from '../api/http.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const token = getToken();
    if (!token) {
      setLoading(false);
    } else {
      fetchMe()
        .then((next) => {
          if (!cancelled) setUser(next);
        })
        .catch(() => {
          setToken('');
          if (!cancelled) setUser(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    const onExpired = () => setUser(null);
    window.addEventListener('myland-auth-expired', onExpired);
    return () => {
      cancelled = true;
      window.removeEventListener('myland-auth-expired', onExpired);
    };
  }, []);

  const value = useMemo(() => {
    const applySession = (data) => {
      setToken(data.token);
      setUser(data.user);
      return data.user;
    };
    return {
      user,
      loading,
      isAdmin: user?.role === 'admin',
      login: async (email, password) => applySession(await loginRequest(email, password)),
      logout: () => {
        setToken('');
        setUser(null);
      },
    };
  }, [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
