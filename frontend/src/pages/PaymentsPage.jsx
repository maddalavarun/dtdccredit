import { useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import api, { fetcher } from '../api/client';
import toast, { Toaster } from 'react-hot-toast';
import { HiPlus, HiTrash } from 'react-icons/hi';

export default function PaymentsPage() {
    const [showAdd, setShowAdd] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [filterClient, setFilterClient] = useState('');
    const [form, setForm] = useState({
        invoice_id: '', amount: '', payment_date: new Date().toISOString().split('T')[0],
        payment_mode: 'UPI', remarks: ''
    });

    // Global queries (cached & deduped)
    const { data: clients = [] } = useSWR('/clients', fetcher, { keepPreviousData: true });
    const { data: invoices = [] } = useSWR('/invoices', fetcher, { keepPreviousData: true });

    // Filtered query
    const { data: payments, error, isLoading, mutate } = useSWR(
        filterClient ? `/payments?client_id=${filterClient}` : '/payments',
        fetcher,
        { keepPreviousData: true }
    );

    const unpaidInvoices = invoices.filter(i => Number(i.outstanding) > 0);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await api.post('/payments', { ...form, amount: Number(form.amount) });
            toast.success('Payment recorded');
            setForm({ invoice_id: '', amount: '', payment_date: new Date().toISOString().split('T')[0], payment_mode: 'UPI', remarks: '' });
            await mutate();
            await globalMutate('/invoices'); // Refresh invoices universally
            setShowAdd(false);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Error recording payment');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this payment?')) return;
        try {
            await api.delete(`/payments/${id}`);
            toast.success('Payment deleted');
            mutate();
            globalMutate('/invoices');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Error deleting payment');
        }
    };

    const selectedInvoice = invoices.find(i => i.id === form.invoice_id);

    const fmt = (v) => '₹' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    return (
        <div>
            <Toaster position="top-right" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Payments</h1>
                <button className="btn btn-primary" onClick={() => setShowAdd(true)}><HiPlus /> Record Payment</button>
            </div>

            {/* Filter */}
            <div style={{ marginBottom: '1rem' }}>
                <select className="form-input" style={{ width: 220 }} value={filterClient} onChange={e => setFilterClient(e.target.value)}>
                    <option value="">All Clients</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {(isLoading && !payments) ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
                ) : error ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>Failed to load payments</div>
                ) : (!payments || payments.length === 0) ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No payments recorded yet</div>
                ) : (
                    <div style={{ overflowX: 'auto', opacity: isLoading ? 0.7 : 1, transition: 'opacity 0.2s' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Client</th>
                                    <th>Invoice #</th>
                                    <th style={{ textAlign: 'right' }}>Amount</th>
                                    <th>Mode</th>
                                    <th>Remarks</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map(p => (
                                    <tr key={p.id}>
                                        <td>{p.payment_date}</td>
                                        <td>{p.client_name}</td>
                                        <td style={{ fontWeight: 500 }}>{p.invoice_number}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>{fmt(p.amount)}</td>
                                        <td>{p.payment_mode || '—'}</td>
                                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.remarks || '—'}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)} title="Delete"><HiTrash /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Payment Modal */}
            {showAdd && (
                <div className="modal-overlay" onClick={() => setShowAdd(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Record Payment</h2>
                        <form onSubmit={handleSave}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                <div>
                                    <label className="form-label">Invoice *</label>
                                    <select
                                        className="form-input"
                                        required
                                        value={form.invoice_id}
                                        onChange={e => setForm({ ...form, invoice_id: e.target.value })}
                                    >
                                        <option value="">Select invoice...</option>
                                        {unpaidInvoices.map(inv => (
                                            <option key={inv.id} value={inv.id}>
                                                {inv.invoice_number} — {inv.client_name} — Outstanding: {fmt(inv.outstanding)}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedInvoice && (
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                            Total: {fmt(selectedInvoice.total_amount)} | Paid: {fmt(selectedInvoice.paid_amount)} | Outstanding: {fmt(selectedInvoice.outstanding)}
                                        </p>
                                    )}
                                </div>
                                <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label className="form-label">Amount (₹) *</label>
                                        <input
                                            className="form-input"
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            max={selectedInvoice ? Number(selectedInvoice.outstanding) : undefined}
                                            required
                                            value={form.amount}
                                            onChange={e => setForm({ ...form, amount: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label">Date *</label>
                                        <input
                                            className="form-input"
                                            type="date"
                                            required
                                            value={form.payment_date}
                                            onChange={e => setForm({ ...form, payment_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label">Payment Mode</label>
                                    <select className="form-input" value={form.payment_mode} onChange={e => setForm({ ...form, payment_mode: e.target.value })}>
                                        <option value="UPI">UPI</option>
                                        <option value="Cash">Cash</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Cheque">Cheque</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Remarks</label>
                                    <input className="form-input" value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} placeholder="Optional note" />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
                                <button type="submit" className="btn btn-success" disabled={isSaving}>
                                    {isSaving ? 'Recording...' : 'Record Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
