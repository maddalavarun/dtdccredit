import { useState, useRef } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import api, { fetcher } from '../api/client';
import toast, { Toaster } from 'react-hot-toast';
import { HiOutlineUpload, HiOutlineTrash, HiOutlineFilter } from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';

export default function InvoicesPage() {
    const [showImport, setShowImport] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [filterClient, setFilterClient] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const fileRef = useRef(null);

    // Fetch clients globally for the filter dropdown
    const { data: clients = [] } = useSWR('/clients', fetcher, { keepPreviousData: true });

    // Fetch invoices based on filters
    let query = '/invoices';
    if (filterClient || filterStatus) {
        const params = new URLSearchParams();
        if (filterClient) params.append('client_id', filterClient);
        if (filterStatus) params.append('status_filter', filterStatus);
        query += `?${params.toString()}`;
    }
    const { data: invoices, error, isLoading, mutate } = useSWR(query, fetcher, { keepPreviousData: true });

    const handleImport = async (e) => {
        e.preventDefault();
        const file = fileRef.current?.files?.[0];
        if (!file) return toast.error('Please select a file');
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const { data } = await api.post('/invoices/import?auto_create_clients=true', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setImportResult(data);
            toast.success(`Imported ${data.imported} invoices`);
            mutate();
            if (data.new_clients_created > 0) {
                globalMutate('/clients');
            }
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Import failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this invoice and all associated payments?')) return;
        try {
            await api.delete(`/invoices/${id}`);
            toast.success('Invoice deleted');
            mutate();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Error');
        }
    };

    const sendWhatsApp = (inv) => {
        const client = clients.find(c => c.id === inv.client_id);
        const phone = client?.phone?.replace(/\D/g, '') || '';
        const msg = encodeURIComponent(
            `Hi ${client?.company_name || 'Client'},\n\nThis is a gentle reminder regarding your pending invoice:\n\n` +
            `Invoice #: ${inv.invoice_number}\n` +
            `Amount: ₹${Number(inv.total_amount).toLocaleString('en-IN')}\n` +
            `Outstanding: ₹${Number(inv.outstanding).toLocaleString('en-IN')}\n` +
            `Due Date: ${inv.due_date}\n\n` +
            `Please arrange the payment at the earliest.\n\nThank you,\nDTDC Franchise`
        );
        window.open(`https://wa.me/${phone ? '91' + phone : ''}?text=${msg}`, '_blank');
    };

    const statusBadge = (inv) => {
        if (inv.is_overdue) return <span className="badge badge-overdue">Overdue</span>;
        if (inv.status === 'Paid') return <span className="badge badge-paid">Paid</span>;
        if (inv.status === 'Partial') return <span className="badge badge-partial">Partial</span>;
        return <span className="badge badge-unpaid">Unpaid</span>;
    };

    const fmt = (v) => '₹' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    return (
        <div>
            <Toaster position="top-right" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Invoices</h1>
                <button className="btn btn-primary" onClick={() => { setShowImport(true); setImportResult(null); }}>
                    <HiOutlineUpload /> Import Excel/CSV
                </button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <HiOutlineFilter style={{ color: 'var(--text-muted)' }} />
                <select className="form-input" style={{ width: 200 }} value={filterClient} onChange={e => setFilterClient(e.target.value)}>
                    <option value="">All Clients</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
                <select className="form-input" style={{ width: 150 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partial">Partial</option>
                    <option value="Paid">Paid</option>
                </select>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {(isLoading && !invoices) ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
                ) : error ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>Failed to load invoices</div>
                ) : (!invoices || invoices.length === 0) ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No invoices found. Import an Excel/CSV file to get started.</div>
                ) : (
                    <div style={{ overflowX: 'auto', opacity: isLoading ? 0.7 : 1, transition: 'opacity 0.2s' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Invoice #</th>
                                    <th>Client</th>
                                    <th>Date</th>
                                    <th>Due Date</th>
                                    <th style={{ textAlign: 'right' }}>Amount</th>
                                    <th style={{ textAlign: 'right' }}>Paid</th>
                                    <th style={{ textAlign: 'right' }}>Outstanding</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map(inv => (
                                    <tr key={inv.id}>
                                        <td style={{ fontWeight: 500 }}>{inv.invoice_number}</td>
                                        <td>{inv.client_name}</td>
                                        <td>{inv.invoice_date}</td>
                                        <td>{inv.due_date}</td>
                                        <td style={{ textAlign: 'right' }}>{fmt(inv.total_amount)}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--success)' }}>{fmt(inv.paid_amount)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(inv.outstanding)}</td>
                                        <td>{statusBadge(inv)}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                                                {Number(inv.outstanding) > 0 && (
                                                    <button className="btn btn-whatsapp btn-sm" onClick={() => sendWhatsApp(inv)} title="Send WhatsApp Reminder">
                                                        <FaWhatsapp />
                                                    </button>
                                                )}
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(inv.id)} title="Delete"><HiOutlineTrash /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Import Modal */}
            {showImport && (
                <div className="modal-overlay" onClick={() => setShowImport(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Import Invoices</h2>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            Upload an Excel (.xlsx) or CSV file with columns: <strong>Client Name, Invoice Number, Invoice Date, Due Date, Invoice Amount</strong>
                        </p>

                        <form onSubmit={handleImport}>
                            <div className="upload-area" onClick={() => fileRef.current?.click()}>
                                <HiOutlineUpload size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Click to select file</p>
                                <input ref={fileRef} type="file" accept=".xlsx,.csv" style={{ display: 'none' }} />
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowImport(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={uploading}>
                                    {uploading ? 'Importing...' : 'Upload & Import'}
                                </button>
                            </div>
                        </form>

                        {importResult && (
                            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--surface-alt)', borderRadius: 8, fontSize: '0.8rem' }}>
                                <p><strong>Import Summary:</strong></p>
                                <p>Total rows: {importResult.total_rows}</p>
                                <p style={{ color: 'var(--success)' }}>Imported: {importResult.imported}</p>
                                {importResult.duplicates > 0 && <p style={{ color: 'var(--warning)' }}>Duplicates skipped: {importResult.duplicates}</p>}
                                {importResult.new_clients_created > 0 && <p style={{ color: 'var(--info)' }}>New clients created: {importResult.new_clients_created}</p>}
                                {importResult.errors?.length > 0 && (
                                    <div style={{ marginTop: '0.5rem', color: 'var(--danger)' }}>
                                        <p><strong>Errors:</strong></p>
                                        {importResult.errors.map((e, i) => <p key={i}>• {e}</p>)}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
