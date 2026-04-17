'use client';
import { useState, useEffect } from 'react';
import { getUser, getToken, clearAuth } from '@/lib/auth';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUser();
    const t = getToken();
    if (u && t) setUser(u);
    setLoading(false);
  }, []);

  const logout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  const hasRole = (...roles: string[]) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return roles.includes(user.role);
  };

  return { user, loading, logout, hasRole };
}
