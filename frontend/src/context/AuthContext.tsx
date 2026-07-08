import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.js';

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  profileImage?: string;
  isSystemAdmin: boolean;
}

interface BusinessMember {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    email: string;
    phone?: string;
    profileImage?: string;
  };
}

interface Business {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  website?: string;
  phone?: string;
  inviteCode?: string;
  cloudStorageLink?: string;
  userRole: string;
  ownerId: string;
  createdAt: string;
  members: BusinessMember[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  businesses: Business[];
  currentBusiness: Business | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, fullName: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  fetchBusinesses: () => Promise<void>;
  selectBusiness: (business: Business | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('delegate_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);

  const fetchProfile = async (currentToken: string) => {
    try {
      if (!currentToken) return;
      const response = await api.get('/auth/profile');
      setUser(response.data);
      await fetchBusinesses();
    } catch (error) {
      console.error('Failed to load user profile', error);
      logout();
    }
  };

  const fetchBusinesses = async () => {
    try {
      const response = await api.get('/businesses');
      setBusinesses(response.data);
      
      // Auto-select first business if none selected and user belongs to businesses
      const storedBizId = localStorage.getItem('delegate_selected_business_id');
      if (response.data.length > 0) {
        const found = response.data.find((b: Business) => b.id === storedBizId);
        setCurrentBusiness(found || response.data[0]);
      } else {
        setCurrentBusiness(null);
      }
    } catch (error) {
      console.error('Failed to fetch businesses', error);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        await fetchProfile(token);
      }
      setLoading(false);
    };
    initializeAuth();
  }, [token]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: userToken, user: userData } = response.data;
      
      localStorage.setItem('delegate_token', userToken);
      setToken(userToken);
      setUser(userData);
      
      // Load businesses immediately
      const bizResponse = await api.get('/businesses');
      setBusinesses(bizResponse.data);
      if (bizResponse.data.length > 0) {
        setCurrentBusiness(bizResponse.data[0]);
        localStorage.setItem('delegate_selected_business_id', bizResponse.data[0].id);
      }
    } catch (error: any) {
      setLoading(false);
      throw new Error(error.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  const register = async (username: string, fullName: string, email: string, password: string, phone?: string) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register', { username, fullName, email, password, phone });
      const { token: userToken, user: userData } = response.data;
      
      localStorage.setItem('delegate_token', userToken);
      setToken(userToken);
      setUser(userData);
      setBusinesses([]);
      setCurrentBusiness(null);
    } catch (error: any) {
      setLoading(false);
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('delegate_token');
    localStorage.removeItem('delegate_selected_business_id');
    setToken(null);
    setUser(null);
    setBusinesses([]);
    setCurrentBusiness(null);
  };

  const refreshUser = async () => {
    if (token) {
      await fetchProfile(token);
    }
  };

  const selectBusiness = (business: Business | null) => {
    setCurrentBusiness(business);
    if (business) {
      localStorage.setItem('delegate_selected_business_id', business.id);
    } else {
      localStorage.removeItem('delegate_selected_business_id');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        businesses,
        currentBusiness,
        login,
        register,
        logout,
        refreshUser,
        fetchBusinesses,
        selectBusiness,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
