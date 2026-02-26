import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { HiOutlineViewGrid, HiOutlineUsers, HiOutlineDocumentText, HiOutlineCreditCard, HiOutlineLogout, HiOutlineMenu, HiX } from 'react-icons/hi';

const navItems = [
    { path: '/', label: 'Dashboard', icon: HiOutlineViewGrid },
    { path: '/clients', label: 'Clients', icon: HiOutlineUsers },
    { path: '/invoices', label: 'Invoices', icon: HiOutlineDocumentText },
    { path: '/payments', label: 'Payments', icon: HiOutlineCreditCard },
];

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 35 }}
                />
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 8,
                            background: 'var(--accent)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '0.9rem'
                        }}>
                            D
                        </div>
                        <div>
                            <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>DTDC Credit</div>
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>Monitor</div>
                        </div>
                    </div>
                </div>

                <nav style={{ flex: 1, padding: '0.75rem 0' }}>
                    {navItems.map(({ path, label, icon: Icon }) => (
                        <NavLink
                            key={path}
                            to={path}
                            end={path === '/'}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <Icon size={18} />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                        {user?.full_name} · {user?.role}
                    </div>
                    <button onClick={handleLogout} className="sidebar-link" style={{ padding: '0.5rem 0', border: 'none', background: 'none', cursor: 'pointer', width: '100%' }}>
                        <HiOutlineLogout size={18} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {/* Top bar */}
                <header style={{
                    height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', padding: '0 1.25rem', gap: '0.75rem'
                }}>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--text)', display: 'none' }}
                        className="mobile-menu-btn"
                    >
                        {sidebarOpen ? <HiX /> : <HiOutlineMenu />}
                    </button>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user?.full_name}</span>
                </header>

                {/* Page content */}
                <main style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
                    <Outlet />
                </main>
            </div>

            <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
        </div>
    );
}
