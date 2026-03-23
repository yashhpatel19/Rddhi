import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Token storage with security in mind
const TokenStorage = {
  getAccessToken: () => localStorage.getItem('accessToken'),
  setAccessToken: (token) => localStorage.setItem('accessToken', token),
  getRefreshToken: () => localStorage.getItem('refreshToken'),
  setRefreshToken: (token) => localStorage.setItem('refreshToken', token),
  clear: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const refreshTokenTimeoutRef = useRef(null);

  // Setup axios interceptor for auto token refresh
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = TokenStorage.getRefreshToken();
            if (!refreshToken) {
              throw new Error('No refresh token');
            }

            const response = await axios.post(`${API}/auth/refresh`, { refresh_token: refreshToken });
            TokenStorage.setAccessToken(response.data.access_token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
            originalRequest.headers['Authorization'] = `Bearer ${response.data.access_token}`;
            return axios(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            logout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  // Refresh token before expiration
  const scheduleTokenRefresh = useCallback(() => {
    // Clear any existing timeout
    if (refreshTokenTimeoutRef.current) {
      clearTimeout(refreshTokenTimeoutRef.current);
    }

    // Refresh token 5 minutes before expiration (assuming 24 hour tokens)
    const refreshTime = 24 * 60 * 60 * 1000 - 5 * 60 * 1000; // 19 hours
    refreshTokenTimeoutRef.current = setTimeout(() => {
      const refreshToken = TokenStorage.getRefreshToken();
      if (refreshToken) {
        axios.post(`${API}/auth/refresh`, { refresh_token: refreshToken })
          .then(res => {
            TokenStorage.setAccessToken(res.data.access_token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`;
            scheduleTokenRefresh(); // Reschedule for next token
          })
          .catch(() => {
            logout(); // Refresh failed, logout
          });
      }
    }, refreshTime);
  }, []);

  const fetchUser = useCallback(async (token) => {
    try {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const res = await axios.get(`${API}/auth/me`);
      setUser(res.data);
      setError(null);
      scheduleTokenRefresh();
    } catch (err) {
      console.error('Failed to fetch user:', err);
      TokenStorage.clear();
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setError(err.response?.data?.detail || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [scheduleTokenRefresh]);

  useEffect(() => {
    const token = TokenStorage.getAccessToken();
    if (token) {
      fetchUser(token);
    } else {
      setLoading(false);
    }
  }, [fetchUser]);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token, refresh_token, user } = res.data;
      
      TokenStorage.setAccessToken(access_token);
      TokenStorage.setRefreshToken(refresh_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setUser(user);
      scheduleTokenRefresh();
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Login failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API}/auth/register`, { name, email, password });
      const { access_token, refresh_token, user } = res.data;
      
      TokenStorage.setAccessToken(access_token);
      TokenStorage.setRefreshToken(refresh_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setUser(user);
      scheduleTokenRefresh();
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(async () => {
    try {
      const token = TokenStorage.getAccessToken();
      if (token) {
        await axios.post(`${API}/auth/logout`);
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      TokenStorage.clear();
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setError(null);
      
      // Clear token refresh timeout
      if (refreshTokenTimeoutRef.current) {
        clearTimeout(refreshTokenTimeoutRef.current);
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token: TokenStorage.getAccessToken(), loading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
