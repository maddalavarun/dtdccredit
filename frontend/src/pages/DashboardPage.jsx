import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { fetcher } from '../api/client';
import { HiOutlineCurrencyRupee, HiOutlineExclamationCircle, HiOutlineCreditCard, HiOutlineUsers } from 'react-icons/hi';

export default function DashboardPage() {
    const { data, error, isLoading } = useSWR('/dashboard', fetcher, {
        keepPreviousData: true
    });
    const navigate = useNavigate();

    // SWR handles caching globally. keepPreviousData ensures no flicker on revalidation.
    if (isLoading && !data) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
    if (error && !data) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>Failed to load dashboard</div>;
    if (!data) return null; // Safe fallback

    const fmt = (v) => '₹' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const stats = [
        { label: 'Total Outstanding', value: fmt(data.total_outstanding), icon: <HiOutlineCurrencyRupee />, color: '#3b82f6', bg: '#eff6ff' },
        { label: 'Total Overdue', value: fmt(data.total_overdue), icon: <HiOutlineExclamationCircle />, color: '#ef4444', bg: '#fef2f2' },
        { label: 'Payments Today', value: fmt(data.payments_today), icon: <HiOutlineCreditCard />, color: '#10b981', bg: '#ecfdf5' },
        { label: 'Total Clients', value: data.total_clients, icon: <HiOutlineUsers />, color: '#8b5cf6', bg: '#f5f3ff' },
    ];

    return (
        <div>
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Dashboard</h1>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {data.total_clients} clients · {data.total_invoices} invoices
                </p>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {stats.map(s => (
                    <div className="stat-card" key={s.label}>
                        <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                        <span className="stat-label">{s.label}</span>
                        <span className="stat-value">{s.value}</span>
                    </div>
                ))}
            </div>

            {/* Top Outstanding Clients */}
            {data.top_outstanding_clients?.length > 0 && (
                <div className="card">
                    <h2 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Top Outstanding Clients</h2>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Client</th>
                                    <th style={{ textAlign: 'right' }}>Outstanding</th>
                                    <th style={{ textAlign: 'right' }}>Overdue</th>
                                    <th style={{ textAlign: 'center' }}>Invoices</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.top_outstanding_clients.map(c => (
                                    <tr key={c.id} onClick={() => navigate(`/clients/${c.id}`)} style={{ cursor: 'pointer' }}>
                                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{c.company_name}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(c.total_outstanding)}</td>
                                        <td style={{ textAlign: 'right', color: Number(c.total_overdue) > 0 ? 'var(--danger)' : 'inherit' }}>
                                            {fmt(c.total_overdue)}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>{c.invoice_count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
