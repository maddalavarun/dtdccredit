import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import api, { fetcher } from '../api/client';
import toast, { Toaster } from 'react-hot-toast';
import { HiPlus, HiPencil, HiTrash, HiSearch } from 'react-icons/hi';
import debounce from 'lodash.debounce';

export default function ClientsPage() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce the search input updates to avoid spamming the backend
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const updateSearch = useCallback(
        debounce((val) => setDebouncedSearch(val), 500),
        []
    );

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        updateSearch(e.target.value);
    };

    // SWR automatically handles caching, revalidation, and deduping
    const { data: clients, error, isLoading, mutate } = useSWR(
        debouncedSearch ? `/clients?search=${encodeURIComponent(debouncedSearch)}` : '/clients',
        fetcher,
        { keepPreviousData: true }
    );

    const [modal, setModal] = useState(null); // null | 'add' | 'edit'
    const [form, setForm] = useState({ company_name: '', contact_person: '', phone: '', email: '' });
    const [editId, setEditId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const resetForm = () => setForm({ company_name: '', contact_person: '', phone: '', email: '' });

    const openAdd = () => { resetForm(); setModal('add'); };
    const openEdit = (e, c) => {
        e.stopPropagation();
        setForm({
            company_name: c.company_name,
            contact_person: c.contact_person || '',
            phone: c.phone || '',
            email: c.email || '',
        });
        setEditId(c.id);
        setModal('edit');
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (modal === 'add') {
                await api.post('/clients', { ...form, credit_limit: 0 });
                toast.success('Client added');
            } else {
                await api.put(`/clients/${editId}`, form);
                toast.success('Client updated');
            }
            await mutate(); // Trigger SWR to re-fetch and wait for response
            setModal(null);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Error saving client');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (e, id, name) => {
        e.stopPropagation();
        if (!window.confirm(`Delete client "${name}"? This will also delete all their invoices and payments.`)) return;
        try {
            await api.delete(`/clients/${id}`);
            toast.success('Client deleted');
            mutate();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Error deleting client');
        }
    };

    const fmt = (v) => '₹' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    return (
        <div>
            <Toaster position="top-right" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Clients</h1>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <HiSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            className="form-input"
                            placeholder="Search clients..."
                            value={search}
                            onChange={handleSearchChange}
                            style={{ paddingLeft: 32, width: 220 }}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={openAdd}><HiPlus /> Add Client</button>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {(isLoading && !clients) ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
                ) : error ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>Failed to load clients</div>
                ) : (!clients || clients.length === 0) ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No clients found</div>
                ) : (
                    <div style={{ overflowX: 'auto', opacity: isLoading ? 0.7 : 1, transition: 'opacity 0.2s' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Company</th>
                                    <th>Contact</th>
                                    <th>Phone</th>
                                    <th style={{ textAlign: 'right' }}>Outstanding</th>
                                    <th style={{ textAlign: 'right' }}>Overdue</th>
                                    <th style={{ textAlign: 'center' }}>Invoices</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clients.map(c => (
                                    <tr key={c.id} onClick={() => navigate(`/clients/${c.id}`)} style={{ cursor: 'pointer' }}>
                                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{c.company_name}</td>
                                        <td>{c.contact_person || '—'}</td>
                                        <td>{c.phone || '—'}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(c.total_outstanding)}</td>
                                        <td style={{ textAlign: 'right', color: Number(c.total_overdue) > 0 ? 'var(--danger)' : 'inherit' }}>
                                            {fmt(c.total_overdue)}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>{c.invoice_count}</td>
                                        <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                                                <button className="btn btn-outline btn-sm" onClick={(e) => openEdit(e, c)} title="Edit"><HiPencil /></button>
                                                <button className="btn btn-danger btn-sm" onClick={(e) => handleDelete(e, c.id, c.company_name)} title="Delete"><HiTrash /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add/Edit Client Modal */}
            {modal && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' }}>
                            {modal === 'add' ? 'Add Client' : 'Edit Client'}
                        </h2>
                        <form onSubmit={handleSave}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                <div>
                                    <label className="form-label">Company Name *</label>
                                    <input className="form-input" required value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">Contact Person</label>
                                    <input className="form-input" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} />
                                </div>
                                <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label className="form-label">Phone</label>
                                        <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="form-label">Email</label>
                                        <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                                    {isSaving ? 'Saving...' : (modal === 'add' ? 'Add Client' : 'Save Changes')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
