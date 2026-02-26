import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });
    const [loading, setLoading] = useState(false);

    const login = async (username, password) => {
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', { username, password });
            localStorage.setItem('token', data.access_token);
            const userData = { role: data.role, full_name: data.full_name, username };
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.response?.data?.detail || 'Login failed' };
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, isAdmin: user?.role === 'admin' }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
