import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, loading } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const result = await login(username, password);
        if (result.success) {
            navigate('/');
        } else {
            setError(result.error);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2a5298 50%, #1e3a5f 100%)'
        }}>
            <div style={{
                background: '#fff', borderRadius: 16, padding: '2.5rem', width: '100%',
                maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 14, background: 'var(--accent)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, color: '#fff', fontSize: '1.5rem', marginBottom: '0.75rem'
                    }}>
                        D
                    </div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
                        DTDC Credit Monitor
                    </h1>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Sign in to your account
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <div style={{
                            background: '#fee2e2', color: '#991b1b', padding: '0.5rem 0.75rem',
                            borderRadius: 8, fontSize: '0.8rem', marginBottom: '1rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{ marginBottom: '1rem' }}>
                        <label className="form-label">Username</label>
                        <input
                            className="form-input"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            required
                            autoFocus
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label className="form-label">Password</label>
                        <input
                            className="form-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ width: '100%', justifyContent: 'center', padding: '0.65rem' }}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>


                <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                    Internal use only · DTDC Franchise
                </p>
            </div>
        </div>
    );
}
