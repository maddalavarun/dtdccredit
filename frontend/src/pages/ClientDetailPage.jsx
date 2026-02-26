import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import toast, { Toaster } from 'react-hot-toast';
import {
    HiArrowLeft, HiPlus, HiTrash, HiCheck, HiOutlineCurrencyRupee,
    HiPencil, HiPhone, HiMail, HiUser, HiChevronDown, HiChevronRight
} from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';

export default function ClientDetailPage() {
    const { clientId } = useParams();
    const navigate = useNavigate();

    const [client, setClient] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Add invoice modal
    const [showAddInvoice, setShowAddInvoice] = useState(false);
    const [invoiceForm, setInvoiceForm] = useState({ invoice_number: '', invoice_date: new Date().toISOString().split('T')[0], due_date: '', total_amount: '' });

    // Add payment modal
    const [showAddPayment, setShowAddPayment] = useState(false);
    const [paymentInvoice, setPaymentInvoice] = useState(null);
    const [paymentForm, setPaymentForm] = useState({ amount: '', payment_date: new Date().toISOString().split('T')[0], payment_mode: 'UPI', remarks: '' });

    // Edit client modal
    const [showEditClient, setShowEditClient] = useState(false);
    const [editForm, setEditForm] = useState({ company_name: '', contact_person: '', phone: '', email: '' });

    // Payment history toggle
    const [showPayments, setShowPayments] = useState(false);

    // Reminder multi-select
    const [reminderMode, setReminderMode] = useState(null); // null | 'whatsapp' | 'email'
    const [selectedInvoices, setSelectedInvoices] = useState([]);

    const fetchAll = () => {
        setLoading(true);
        Promise.all([
            api.get(`/clients/${clientId}`),
            api.get('/invoices', { params: { client_id: clientId } }),
            api.get('/payments', { params: { client_id: clientId } }),
        ]).then(([clientRes, invoicesRes, paymentsRes]) => {
            setClient(clientRes.data);
            setInvoices(invoicesRes.data);
            setPayments(paymentsRes.data);
        }).catch(() => toast.error('Failed to load client data'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchAll(); }, [clientId]);

    const fmt = (v) => '₹' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const statusBadge = (inv) => {
        if (inv.is_overdue) return <span className="badge badge-overdue">Overdue</span>;
        if (inv.status === 'Paid') return <span className="badge badge-paid">Paid</span>;
        if (inv.status === 'Partial') return <span className="badge badge-partial">Partial</span>;
        return <span className="badge badge-unpaid">Unpaid</span>;
    };

    // ── Invoice actions ──
    const handleAddInvoice = async (e) => {
        e.preventDefault();
        try {
            await api.post('/invoices', {
                client_id: clientId,
                invoice_number: invoiceForm.invoice_number,
                invoice_date: invoiceForm.invoice_date,
                due_date: invoiceForm.due_date,
                total_amount: Number(invoiceForm.total_amount),
            });
            toast.success('Invoice added');
            setShowAddInvoice(false);
            setInvoiceForm({ invoice_number: '', invoice_date: new Date().toISOString().split('T')[0], due_date: '', total_amount: '' });
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Error adding invoice');
        }
    };

    const handleDeleteInvoice = async (invId) => {
        if (!window.confirm('Delete this invoice and all its payments?')) return;
        try {
            await api.delete(`/invoices/${invId}`);
            toast.success('Invoice deleted');
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Error');
        }
    };

    // ── Payment actions ──
    const openPayment = (inv) => {
        setPaymentInvoice(inv);
        setPaymentForm({ amount: '', payment_date: new Date().toISOString().split('T')[0], payment_mode: 'UPI', remarks: '' });
        setShowAddPayment(true);
    };

    const handleAddPayment = async (e) => {
        e.preventDefault();
        try {
            await api.post('/payments', {
                invoice_id: paymentInvoice.id,
                amount: Number(paymentForm.amount),
                payment_date: paymentForm.payment_date,
                payment_mode: paymentForm.payment_mode,
                remarks: paymentForm.remarks,
            });
            toast.success('Payment recorded');
            setShowAddPayment(false);
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Error recording payment');
        }
    };

    const markFullyPaid = async (inv) => {
        const outstanding = Number(inv.outstanding);
        if (outstanding <= 0) return;
        if (!window.confirm(`Mark invoice ${inv.invoice_number} as fully paid? (₹${outstanding.toLocaleString('en-IN')})`)) return;
        try {
            await api.post('/payments', {
                invoice_id: inv.id,
                amount: outstanding,
                payment_date: new Date().toISOString().split('T')[0],
                payment_mode: 'Cash',
                remarks: 'Marked as fully paid',
            });
            toast.success('Invoice marked as paid');
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Error');
        }
    };

    // ── Reminder multi-select helpers ──
    const unpaidInvs = invoices.filter(i => Number(i.outstanding) > 0);

    const startReminder = (mode) => {
        setReminderMode(mode);
        setSelectedInvoices(unpaidInvs.map(i => i.id)); // select all unpaid by default
    };

    const cancelReminder = () => {
        setReminderMode(null);
        setSelectedInvoices([]);
    };

    const toggleInvoice = (id) => {
        setSelectedInvoices(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleAll = () => {
        if (selectedInvoices.length === unpaidInvs.length) setSelectedInvoices([]);
        else setSelectedInvoices(unpaidInvs.map(i => i.id));
    };

    const buildInvoiceLines = () => {
        const selected = invoices.filter(i => selectedInvoices.includes(i.id));
        let totalOutstanding = 0;
        const lines = selected.map((inv, idx) => {
            totalOutstanding += Number(inv.outstanding);
            return `${idx + 1}. Invoice #${inv.invoice_number}\n   Amount: ₹${Number(inv.total_amount).toLocaleString('en-IN')}\n   Outstanding: ₹${Number(inv.outstanding).toLocaleString('en-IN')}\n   Due Date: ${inv.due_date}`;
        });
        return { lines, totalOutstanding, count: selected.length };
    };

    const sendBulkWhatsApp = () => {
        if (selectedInvoices.length === 0) return toast.error('Select at least one invoice');
        const phone = client?.phone?.replace(/\D/g, '') || '';
        const { lines, totalOutstanding, count } = buildInvoiceLines();
        const msg = encodeURIComponent(
            `Hi ${client?.company_name || 'Client'},\n\n` +
            `Reminder for ${count} pending invoice${count > 1 ? 's' : ''}:\n\n` +
            lines.join('\n\n') +
            `\n\n──────────\nTotal Outstanding: ₹${totalOutstanding.toLocaleString('en-IN')}\n\n` +
            `Please arrange payment at the earliest.\n\nThank you,\nDTDC Franchise`
        );
        window.open(`https://wa.me/${phone ? '91' + phone : ''}?text=${msg}`, '_blank');
        cancelReminder();
    };

    const sendBulkEmail = () => {
        if (selectedInvoices.length === 0) return toast.error('Select at least one invoice');
        const email = client?.email || '';
        const { lines, totalOutstanding, count } = buildInvoiceLines();
        const subject = encodeURIComponent(`Payment Reminder – ${count} Pending Invoice${count > 1 ? 's' : ''} – ${client?.company_name || ''}`);
        const body = encodeURIComponent(
            `Dear ${client?.company_name || 'Client'},\n\n` +
            `This is a gentle reminder regarding the following ${count} pending invoice${count > 1 ? 's' : ''}:\n\n` +
            lines.join('\n\n') +
            `\n\n──────────\nTotal Outstanding: ₹${totalOutstanding.toLocaleString('en-IN')}\n\n` +
            `Kindly arrange payment at the earliest.\n\n` +
            `Thank you,\nDTDC Franchise`
        );
        window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_self');
        cancelReminder();
    };

    // ── Edit client ──
    const openEditClient = () => {
        setEditForm({
            company_name: client.company_name,
            contact_person: client.contact_person || '',
            phone: client.phone || '',
            email: client.email || '',
        });
        setShowEditClient(true);
    };

    const handleEditClient = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/clients/${clientId}`, editForm);
            toast.success('Client updated');
            setShowEditClient(false);
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Error updating client');
        }
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
    if (!client) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>Client not found</div>;

    const unpaidInvoices = invoices.filter(i => Number(i.outstanding) > 0);
    const paidInvoices = invoices.filter(i => Number(i.outstanding) <= 0);

    return (
        <div>
            <Toaster position="top-right" />

            {/* ── Header with back button ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <button className="btn btn-outline btn-sm" onClick={() => navigate('/clients')} style={{ padding: '0.4rem 0.6rem' }}>
                    <HiArrowLeft />
                </button>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{client.company_name}</h1>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        Client since {new Date(client.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </p>
                </div>
                <button className="btn btn-outline btn-sm" onClick={openEditClient}><HiPencil /> Edit</button>
            </div>

            {/* ── Client info + Summary cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {/* Contact card */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Contact</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                        <HiUser style={{ color: 'var(--text-muted)' }} />
                        <span>{client.contact_person || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                        <HiPhone style={{ color: 'var(--text-muted)' }} />
                        <span>{client.phone || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                        <HiMail style={{ color: 'var(--text-muted)' }} />
                        <span>{client.email || '—'}</span>
                    </div>
                </div>

                {/* Outstanding */}
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}><HiOutlineCurrencyRupee /></div>
                    <span className="stat-label">Outstanding</span>
                    <span className="stat-value">{fmt(client.total_outstanding)}</span>
                </div>

                {/* Overdue */}
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fef2f2', color: '#ef4444' }}><HiOutlineCurrencyRupee /></div>
                    <span className="stat-label">Overdue</span>
                    <span className="stat-value" style={{ color: Number(client.total_overdue) > 0 ? 'var(--danger)' : 'inherit' }}>{fmt(client.total_overdue)}</span>
                </div>

                {/* Invoices count */}
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}><HiOutlineCurrencyRupee /></div>
                    <span className="stat-label">Total Invoices</span>
                    <span className="stat-value">{client.invoice_count}</span>
                </div>
            </div>

            {/* ── Invoices section ── */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Invoices</h2>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {unpaidInvs.length > 0 && !reminderMode && (
                            <>
                                <button className="btn btn-whatsapp btn-sm" onClick={() => startReminder('whatsapp')} title="WhatsApp Reminder">
                                    <FaWhatsapp /> WhatsApp
                                </button>
                                <button className="btn btn-sm" onClick={() => startReminder('email')} title="Email Reminder"
                                    style={{ background: '#2563eb', color: '#fff' }}>
                                    <HiMail /> Email
                                </button>
                            </>
                        )}
                        <button className="btn btn-primary btn-sm" onClick={() => {
                            setInvoiceForm({ invoice_number: '', invoice_date: new Date().toISOString().split('T')[0], due_date: '', total_amount: '' });
                            setShowAddInvoice(true);
                        }}>
                            <HiPlus /> Add Invoice
                        </button>
                    </div>
                </div>

                {/* Selection bar */}
                {reminderMode && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem',
                        marginBottom: '0.75rem', borderRadius: 8,
                        background: reminderMode === 'whatsapp' ? '#dcfce7' : '#dbeafe',
                        border: `1px solid ${reminderMode === 'whatsapp' ? '#86efac' : '#93c5fd'}`,
                        fontSize: '0.85rem', flexWrap: 'wrap'
                    }}>
                        <span style={{ fontWeight: 600, color: reminderMode === 'whatsapp' ? '#166534' : '#1e40af' }}>
                            {reminderMode === 'whatsapp' ? <FaWhatsapp style={{ marginRight: 4, verticalAlign: 'middle' }} /> : <HiMail style={{ marginRight: 4, verticalAlign: 'middle' }} />}
                            Select invoices to send reminder
                        </span>
                        <span style={{ color: '#6b7280' }}>{selectedInvoices.length} of {unpaidInvs.length} selected</span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.35rem' }}>
                            <button className="btn btn-outline btn-sm" onClick={cancelReminder}>Cancel</button>
                            <button className={`btn btn-sm ${reminderMode === 'whatsapp' ? 'btn-whatsapp' : ''}`}
                                onClick={reminderMode === 'whatsapp' ? sendBulkWhatsApp : sendBulkEmail}
                                style={reminderMode === 'email' ? { background: '#2563eb', color: '#fff' } : {}}
                                disabled={selectedInvoices.length === 0}>
                                Send {reminderMode === 'whatsapp' ? 'WhatsApp' : 'Email'}
                            </button>
                        </div>
                    </div>
                )}

                {invoices.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
                        No invoices yet. Click "Add Invoice" to create one.
                    </p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    {reminderMode && <th style={{ width: 36, textAlign: 'center' }}>
                                        <input type="checkbox" checked={selectedInvoices.length === unpaidInvs.length && unpaidInvs.length > 0} onChange={toggleAll} />
                                    </th>}
                                    <th>Invoice #</th>
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
                                    <tr key={inv.id} style={reminderMode && selectedInvoices.includes(inv.id) ? { background: reminderMode === 'whatsapp' ? '#f0fdf4' : '#eff6ff' } : {}}>
                                        {reminderMode && <td style={{ textAlign: 'center' }}>
                                            {Number(inv.outstanding) > 0 ? (
                                                <input type="checkbox" checked={selectedInvoices.includes(inv.id)} onChange={() => toggleInvoice(inv.id)} />
                                            ) : <span style={{ color: '#d1d5db' }}>—</span>}
                                        </td>}
                                        <td style={{ fontWeight: 500 }}>{inv.invoice_number}</td>
                                        <td>{inv.invoice_date}</td>
                                        <td>{inv.due_date}</td>
                                        <td style={{ textAlign: 'right' }}>{fmt(inv.total_amount)}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--success)' }}>{fmt(inv.paid_amount)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(inv.outstanding)}</td>
                                        <td>{statusBadge(inv)}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                {Number(inv.outstanding) > 0 && (
                                                    <>
                                                        <button className="btn btn-success btn-sm" onClick={() => openPayment(inv)} title="Record Payment">
                                                            <HiOutlineCurrencyRupee /> Credit
                                                        </button>
                                                        <button className="btn btn-sm" onClick={() => markFullyPaid(inv)} title="Mark Fully Paid"
                                                            style={{ background: '#065f46', color: '#fff' }}>
                                                            <HiCheck /> Paid
                                                        </button>
                                                    </>
                                                )}
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteInvoice(inv.id)} title="Delete">
                                                    <HiTrash />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Payment History section ── */}
            {payments.length > 0 && (
                <div className="card">
                    <div onClick={() => setShowPayments(!showPayments)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none' }}>
                        {showPayments ? <HiChevronDown /> : <HiChevronRight />}
                        <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Payment History</h2>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                            {payments.length} payment{payments.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    {showPayments && (
                        <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Invoice #</th>
                                        <th style={{ textAlign: 'right' }}>Amount</th>
                                        <th>Mode</th>
                                        <th>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.map(p => (
                                        <tr key={p.id}>
                                            <td>{p.payment_date}</td>
                                            <td style={{ fontWeight: 500 }}>{p.invoice_number}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>{fmt(p.amount)}</td>
                                            <td>{p.payment_mode || '—'}</td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{p.remarks || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Add Invoice Modal ── */}
            {showAddInvoice && (
                <div className="modal-overlay" onClick={() => setShowAddInvoice(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Add Invoice</h2>
                        <form onSubmit={handleAddInvoice}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                <div>
                                    <label className="form-label">Invoice Number *</label>
                                    <input className="form-input" required value={invoiceForm.invoice_number}
                                        onChange={e => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })}
                                        placeholder="e.g. INV-001" />
                                </div>
                                <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label className="form-label">Invoice Date *</label>
                                        <input className="form-input" type="date" required value={invoiceForm.invoice_date}
                                            onChange={e => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="form-label">Due Date *</label>
                                        <input className="form-input" type="date" required value={invoiceForm.due_date}
                                            onChange={e => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label">Invoice Amount (₹) *</label>
                                    <input className="form-input" type="number" step="0.01" min="0.01" required
                                        value={invoiceForm.total_amount}
                                        onChange={e => setInvoiceForm({ ...invoiceForm, total_amount: e.target.value })} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowAddInvoice(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Add Invoice</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Record Payment Modal ── */}
            {showAddPayment && paymentInvoice && (
                <div className="modal-overlay" onClick={() => setShowAddPayment(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Record Payment (Credit)</h2>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            Invoice: <strong>{paymentInvoice.invoice_number}</strong> · Outstanding: <strong>{fmt(paymentInvoice.outstanding)}</strong>
                        </p>
                        <form onSubmit={handleAddPayment}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label className="form-label">Amount (₹) *</label>
                                        <input className="form-input" type="number" step="0.01" min="0.01"
                                            max={Number(paymentInvoice.outstanding)} required
                                            value={paymentForm.amount}
                                            onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="form-label">Date *</label>
                                        <input className="form-input" type="date" required value={paymentForm.payment_date}
                                            onChange={e => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label">Payment Mode</label>
                                    <select className="form-input" value={paymentForm.payment_mode}
                                        onChange={e => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}>
                                        <option value="UPI">UPI</option>
                                        <option value="Cash">Cash</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Cheque">Cheque</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Remarks</label>
                                    <input className="form-input" value={paymentForm.remarks}
                                        onChange={e => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                                        placeholder="Optional note" />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowAddPayment(false)}>Cancel</button>
                                <button type="submit" className="btn btn-success">Record Payment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Edit Client Modal ── */}
            {showEditClient && (
                <div className="modal-overlay" onClick={() => setShowEditClient(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Edit Client</h2>
                        <form onSubmit={handleEditClient}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                <div>
                                    <label className="form-label">Company Name *</label>
                                    <input className="form-input" required value={editForm.company_name}
                                        onChange={e => setEditForm({ ...editForm, company_name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">Contact Person</label>
                                    <input className="form-input" value={editForm.contact_person}
                                        onChange={e => setEditForm({ ...editForm, contact_person: e.target.value })} />
                                </div>
                                <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label className="form-label">Phone</label>
                                        <input className="form-input" value={editForm.phone}
                                            onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="form-label">Email</label>
                                        <input className="form-input" type="email" value={editForm.email}
                                            onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowEditClient(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
