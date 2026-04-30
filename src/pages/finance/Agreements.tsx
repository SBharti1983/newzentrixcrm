import { useState, useRef } from 'react';
import {
    FileText, Upload, Download, Eye, CheckCircle, Clock, X, Plus,
    AlertTriangle, Search, Filter, FolderOpen, Shield, FileBadge,
    Stamp, File, Paperclip, Trash2, Send, Zap, PenTool
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { PageLoader, PageError } from '../../components/feedback/Feedback';
import { bookingsApi, customersApi, documentsApi } from '../../api/client';
import { useToast } from '../../hooks/useToast';

const DOC_TYPE_CONFIG = {
    'Sale Agreement': { icon: '📜', color: 'var(--navy-500)', bg: 'var(--navy-50)', border: 'var(--navy-100)' },
    'KYC Documents': { icon: '🪪', color: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.2)' },
    'Allotment Letter': { icon: '📋', color: 'var(--accent-violet)', bg: 'rgba(139,92,246,0.07)', border: 'rgba(139,92,246,0.2)' },
    'Payment Receipt': { icon: '🧾', color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.2)' },
    'NOC Certificate': { icon: '✅', color: 'var(--accent-cyan)', bg: 'rgba(6,182,212,0.07)', border: 'rgba(6,182,212,0.2)' },
    'Loan Sanction': { icon: '🏦', color: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.2)' },
    'Other': { icon: '📁', color: 'var(--slate-500)', bg: 'var(--slate-50)', border: 'var(--border-light)' },
};

const STATUS_CONFIG = {
    Signed: { badge: 'badge-green', label: 'Signed' },
    'Pending Signature': { badge: 'badge-amber', label: 'Pending Signature' },
    'Under Review': { badge: 'badge-blue', label: 'Under Review' },
    Draft: { badge: 'badge-slate', label: 'Draft' },
    Expired: { badge: 'badge-red', label: 'Expired' },
};

const DEFAULT_UPLOAD = {
    bookingId: '', customerName: '', docType: 'Sale Agreement', docName: '',
    status: 'Draft', notes: '', expiryDate: '',
};

export default function Agreements() {
    const { showToast } = useToast();
    const { data: docsRaw, loading, error, refetch } = useApi(() => documentsApi.list());
    const { data: bookingsRaw } = useApi(() => bookingsApi.list({ limit: 200 }));
    const { data: customersRaw } = useApi(() => customersApi.list());
    const BOOKINGS_DATA = bookingsRaw?.data || bookingsRaw || [];
    const CUSTOMERS_DATA = customersRaw || [];
    const agreements = docsRaw || [];

    const [showUpload, setShowUpload] = useState(false);
    const [showGenerate, setShowGenerate] = useState(false);
    const [form, setForm] = useState(DEFAULT_UPLOAD);
    const [searchQ, setSearchQ] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [activeTab, setActiveTab] = useState('documents');
    const [dragOver, setDragOver] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef(null);

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    const totalDocs = agreements.length;
    const signedDocs = agreements.filter(a => (a.status || '').includes('Signed')).length;
    const pendingDocs = agreements.filter(a => (a.status || '').includes('Pending')).length;
    const expiringDocs = agreements.filter(a => a.expires_at && new Date(a.expires_at) <= new Date(Date.now() + 30 * 86400000)).length;

    const filtered = agreements.filter(a => {
        const docType = a.type || a.docType || '';
        const docStatus = a.status || '';
        const matchType = filterType === 'All' || docType === filterType;
        const matchStatus = filterStatus === 'All' || docStatus === filterStatus;
        const cName = a.customer_name || a.customerName || '';
        const dName = a.name || a.docName || '';
        const pName = a.project_name || a.projectName || '';
        const matchQ = !searchQ || cName.toLowerCase().includes(searchQ.toLowerCase()) || dName.toLowerCase().includes(searchQ.toLowerCase()) || pName.toLowerCase().includes(searchQ.toLowerCase());
        return matchType && matchStatus && matchQ;
    });

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        setUploadedFiles(prev => [...prev, ...files.map(f => ({ name: f.name, size: f.size, type: f.type }))]);
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        setUploadedFiles(prev => [...prev, ...files.map(f => ({ name: f.name, size: f.size, type: f.type }))]);
    };

    const handleSave = async () => {
        if (!form.customerName || !form.docName) { showToast('Customer name and doc name are required', 'error'); return; }
        setSaving(true);
        try {
            const customer = CUSTOMERS_DATA.find(c => c.name === form.customerName);
            await documentsApi.create({
                name: form.docName,
                type: form.docType,
                booking_id: form.bookingId || null,
                customer_id: customer?.id || null,
                status: form.status || 'Draft',
                expires_at: form.expiryDate || null,
                notes: form.notes || null,
                file_size: uploadedFiles.length > 0 ? uploadedFiles[0].size : null,
                mime_type: uploadedFiles.length > 0 ? uploadedFiles[0].type : null,
            });
            showToast('Document uploaded successfully!', 'success');
            setShowUpload(false);
            setForm(DEFAULT_UPLOAD);
            setUploadedFiles([]);
            refetch();
        } catch (err) {
            showToast(err.error || 'Failed to save document', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await documentsApi.delete(id);
            showToast('Document deleted', 'success');
            if (selectedDoc?.id === id) setSelectedDoc(null);
            refetch();
        } catch { showToast('Failed to delete', 'error'); }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            await documentsApi.update(id, { status: newStatus });
            showToast(`Status changed to ${newStatus}`, 'success');
            refetch();
        } catch { showToast('Failed to update status', 'error'); }
    };

    const formatSize = (bytes) => {
        if (!bytes || bytes === 0) return '—';
        if (bytes > 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
        return `${(bytes / 1024).toFixed(0)} KB`;
    };

    // Document checklist per booking
    const CHECKLIST_ITEMS = [
        { key: 'kyc', label: 'KYC / Identity Documents', required: true },
        { key: 'token', label: 'Token Receipt Acknowledgment', required: true },
        { key: 'allotment', label: 'Allotment Letter', required: true },
        { key: 'agreement', label: 'Sale Agreement / ATS', required: true },
        { key: 'payment_schedule', label: 'Payment Schedule Letter', required: true },
        { key: 'loan', label: 'Loan Sanction Letter', required: false },
        { key: 'noc', label: 'NOC from Previous Owner', required: false },
        { key: 'registration', label: 'Registration Documents', required: false },
    ];

    const bookingChecklists = BOOKINGS_DATA.map(b => ({
        ...b,
        docs: CHECKLIST_ITEMS.map(item => ({
            ...item,
            uploaded: agreements.some(a => a.bookingId === String(b.id) && a.docType.toLowerCase().includes(item.key.split('_')[0])),
        }))
    }));

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Agreements & Documents</h1>
                    <p className="page-subtitle">{totalDocs} documents · {signedDocs} signed · {pendingDocs} awaiting signature</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-secondary btn-sm">
                        <Download size={14} /> Export All
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowGenerate(true)} style={{ background: 'var(--slate-50)' }}>
                        <Zap size={14} style={{ color: 'var(--accent-violet)' }} /> Auto-Generate
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
                        <Upload size={14} /> Upload Document
                    </button>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-4 mb-6">
                {[
                    { label: 'Total Docs', value: totalDocs, icon: '📁', color: 'var(--navy-500)', bg: 'var(--navy-50)', border: 'var(--navy-100)' },
                    { label: 'Signed', value: signedDocs, icon: '✅', color: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.2)' },
                    { label: 'Pending Sign', value: pendingDocs, icon: '⏳', color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.2)' },
                    { label: 'Expiring Soon', value: expiringDocs, icon: '⚠️', color: 'var(--accent-rose)', bg: 'rgba(244,63,94,0.07)', border: 'rgba(244,63,94,0.2)' },
                ].map(s => (
                    <div key={s.label} style={{
                        background: s.bg, borderRadius: 'var(--border-radius-lg)',
                        border: `1px solid ${s.border}`, padding: '18px 20px',
                        transition: 'transform 0.2s', cursor: 'default',
                    }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <span style={{ fontSize: '1.4rem' }}>{s.icon}</span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--slate-100)', borderRadius: 'var(--border-radius-md)', padding: 4, width: 'fit-content' }}>
                {[
                    { key: 'documents', label: '📄 Document Library' },
                    { key: 'checklist', label: '✅ Booking Checklist' },
                ].map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                        padding: '7px 18px', borderRadius: 'var(--border-radius-sm)',
                        border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                        background: activeTab === t.key ? 'white' : 'transparent',
                        color: activeTab === t.key ? 'var(--navy-600)' : 'var(--text-muted)',
                        boxShadow: activeTab === t.key ? 'var(--shadow-sm)' : 'none',
                        transition: 'all 0.15s',
                    }}>{t.label}</button>
                ))}
            </div>

            {activeTab === 'documents' && (
                <>
                    {/* Search & Filters */}
                    <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8, background: 'white',
                            border: '1px solid var(--border-light)', borderRadius: 'var(--border-radius-md)',
                            padding: '8px 12px', flex: 1, minWidth: 200,
                        }}>
                            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                                placeholder="Search by customer, document, project..."
                                style={{ border: 'none', outline: 'none', fontSize: '0.85rem', width: '100%', color: 'var(--text-primary)', background: 'transparent' }} />
                        </div>
                        <select className="form-control" style={{ width: 'auto', fontSize: '0.82rem', padding: '8px 12px' }}
                            value={filterType} onChange={e => setFilterType(e.target.value)}>
                            <option value="All">All Types</option>
                            {Object.keys(DOC_TYPE_CONFIG).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select className="form-control" style={{ width: 'auto', fontSize: '0.82rem', padding: '8px 12px' }}
                            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="All">All Statuses</option>
                            {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {/* Document Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
                        {filtered.map(doc => {
                            const tc = DOC_TYPE_CONFIG[doc.docType] || DOC_TYPE_CONFIG['Other'];
                            const sc = STATUS_CONFIG[doc.status] || STATUS_CONFIG['Draft'];
                            return (
                                <div key={doc.id} className="card" style={{ padding: '18px 20px', transition: 'all 0.2s', cursor: 'pointer' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
                                    onClick={() => setSelectedDoc(doc)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                                        <div style={{
                                            width: 44, height: 44, borderRadius: 'var(--border-radius-md)', flexShrink: 0,
                                            background: tc.bg, border: `1px solid ${tc.border}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
                                        }}>{tc.icon}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.docName}</div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{doc.docType}</div>
                                        </div>
                                        <span className={`badge ${sc.badge}`} style={{ fontSize: '0.65rem', flexShrink: 0 }}>{doc.status}</span>
                                    </div>

                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
                                        <div>👤 <strong style={{ color: 'var(--text-primary)' }}>{doc.customerName}</strong></div>
                                        {doc.projectName && <div>🏢 {doc.projectName} {doc.unitNo && `· ${doc.unitNo}`}</div>}
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <span>📅 {doc.uploadDate}</span>
                                            {doc.fileSize && <span>💾 {doc.fileSize}</span>}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: 12, marginTop: 4 }}>
                                        <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); }} style={{ fontSize: '0.75rem' }}>
                                            <Eye size={12} /> View
                                        </button>
                                        <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); }} style={{ fontSize: '0.75rem' }}>
                                            <Download size={12} /> Download
                                        </button>
                                        {doc.status === 'Pending Signature' && (
                                            <button className="btn btn-primary btn-sm" onClick={e => {
                                                e.stopPropagation();
                                                handleStatusChange(doc.id, 'Signed');
                                            }} style={{ fontSize: '0.75rem' }}>
                                                <Stamp size={12} /> Mark Signed
                                            </button>
                                        )}
                                        <button className="btn btn-ghost btn-sm" onClick={e => {
                                            e.stopPropagation();
                                            handleDelete(doc.id);
                                        }} style={{ fontSize: '0.75rem', color: 'var(--accent-rose)' }}>
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {filtered.length === 0 && (
                            <div style={{ gridColumn: '1/-1' }}>
                                <div className="empty-state">
                                    <div className="empty-state-icon">📁</div>
                                    <div className="empty-state-title">No documents found</div>
                                    <div className="empty-state-desc">Upload your first document to get started</div>
                                    <button className="btn btn-primary" onClick={() => setShowUpload(true)} style={{ marginTop: 16 }}>
                                        <Upload size={14} /> Upload Document
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* CHECKLIST TAB */}
            {activeTab === 'checklist' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {bookingChecklists.map(booking => {
                        const completedCount = booking.docs.filter(d => d.uploaded).length;
                        const requiredCount = booking.docs.filter(d => d.required).length;
                        const requiredDone = booking.docs.filter(d => d.required && d.uploaded).length;
                        const progress = Math.round((completedCount / booking.docs.length) * 100);
                        return (
                            <div key={booking.id} className="card" style={{ padding: '18px 22px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 'var(--border-radius-md)', flexShrink: 0,
                                        background: progress === 100 ? 'rgba(16,185,129,0.1)' : 'var(--navy-50)',
                                        border: `1px solid ${progress === 100 ? 'rgba(16,185,129,0.3)' : 'var(--navy-100)'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.7rem', fontWeight: 800, color: 'var(--navy-600)',
                                    }}>#{booking.id}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 2 }}>{booking.customerName}</div>
                                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                            <span>🏢 {booking.projectName}</span>
                                            <span>🔑 {booking.unitNo}</span>
                                            <span>📅 {booking.bookingDate}</span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>{completedCount}/{booking.docs.length} uploaded</div>
                                        <div style={{ height: 6, width: 120, background: 'var(--slate-100)', borderRadius: 3, overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%', width: `${progress}%`,
                                                background: progress === 100 ? 'var(--accent-emerald)' : 'linear-gradient(90deg, var(--navy-500), var(--accent-cyan))',
                                                borderRadius: 3, transition: 'width 0.5s',
                                            }} />
                                        </div>
                                        {requiredDone < requiredCount && (
                                            <div style={{ fontSize: '0.7rem', color: 'var(--accent-rose)', marginTop: 3, fontWeight: 600 }}>
                                                {requiredCount - requiredDone} required docs missing
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                                    {booking.docs.map(doc => (
                                        <div key={doc.key} style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '10px 12px', borderRadius: 'var(--border-radius-md)',
                                            background: doc.uploaded ? 'rgba(16,185,129,0.06)' : 'var(--slate-50)',
                                            border: `1px solid ${doc.uploaded ? 'rgba(16,185,129,0.2)' : 'var(--border-light)'}`,
                                        }}>
                                            <div style={{
                                                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                                                background: doc.uploaded ? 'var(--accent-emerald)' : (doc.required ? 'rgba(244,63,94,0.1)' : 'var(--slate-100)'),
                                                border: `2px solid ${doc.uploaded ? 'var(--accent-emerald)' : (doc.required ? 'rgba(244,63,94,0.3)' : 'var(--border-light)')}`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                {doc.uploaded && <CheckCircle size={12} style={{ color: 'white' }} />}
                                                {!doc.uploaded && doc.required && <AlertTriangle size={10} style={{ color: 'var(--accent-rose)' }} />}
                                            </div>
                                            <div style={{ flex: 1, fontSize: '0.8rem' }}>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.label}</div>
                                                {doc.required && !doc.uploaded && <div style={{ fontSize: '0.68rem', color: 'var(--accent-rose)' }}>Required</div>}
                                                {doc.uploaded && <div style={{ fontSize: '0.68rem', color: 'var(--accent-emerald)' }}>Uploaded ✓</div>}
                                            </div>
                                            {!doc.uploaded && (
                                                <button onClick={() => setShowUpload(true)} className="btn btn-ghost btn-sm btn-icon" title="Upload">
                                                    <Upload size={12} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Document Detail Drawer */}
            {selectedDoc && (
                <div className="modal-overlay" onClick={() => setSelectedDoc(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Document Details</h3>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelectedDoc(null)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            {(() => {
                                const tc = DOC_TYPE_CONFIG[selectedDoc.docType] || DOC_TYPE_CONFIG['Other'];
                                const sc = STATUS_CONFIG[selectedDoc.status] || STATUS_CONFIG['Draft'];
                                return (
                                    <>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20,
                                            padding: '16px', background: tc.bg, border: `1px solid ${tc.border}`,
                                            borderRadius: 'var(--border-radius-md)',
                                        }}>
                                            <span style={{ fontSize: '2.2rem' }}>{tc.icon}</span>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 4 }}>{selectedDoc.docName}</div>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedDoc.docType}</span>
                                                    <span className={`badge ${sc.badge}`} style={{ fontSize: '0.68rem' }}>{selectedDoc.status}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.85rem', marginBottom: 16 }}>
                                            {[
                                                { label: 'Customer', value: selectedDoc.customerName },
                                                { label: 'Project', value: selectedDoc.projectName || '—' },
                                                { label: 'Unit', value: selectedDoc.unitNo || '—' },
                                                { label: 'Upload Date', value: selectedDoc.uploadDate },
                                                { label: 'Uploaded By', value: selectedDoc.uploadedBy || '—' },
                                                { label: 'File Size', value: selectedDoc.fileSize || '—' },
                                                { label: 'File Name', value: selectedDoc.fileName || '—' },
                                                { label: 'Expiry', value: selectedDoc.expiryDate || 'N/A' },
                                            ].map(row => (
                                                <div key={row.label} style={{ background: 'var(--slate-50)', borderRadius: 'var(--border-radius-sm)', padding: '10px 12px', border: '1px solid var(--border-light)' }}>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{row.label}</div>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.value}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {selectedDoc.notes && (
                                            <div style={{ background: 'var(--slate-50)', borderRadius: 'var(--border-radius-sm)', padding: '12px', border: '1px solid var(--border-light)', marginBottom: 16 }}>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>NOTES</div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedDoc.notes}</div>
                                            </div>
                                        )}

                                        {/* Preview Area */}
                                        <div style={{
                                            height: 140, background: 'linear-gradient(135deg, var(--navy-50), var(--slate-100))',
                                            borderRadius: 'var(--border-radius-md)', border: '2px dashed var(--border-medium)',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                            gap: 8, color: 'var(--text-muted)', fontSize: '0.85rem',
                                        }}>
                                            <FileText size={28} style={{ opacity: 0.4 }} />
                                            <span>Document Preview</span>
                                            <span style={{ fontSize: '0.75rem' }}>{selectedDoc.fileName || 'No file attached'}</span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setSelectedDoc(null)}>Close</button>
                            <button className="btn btn-ghost"><Send size={14} /> Send to Client</button>
                            <button className="btn btn-primary"><Download size={14} /> Download</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Modal */}
            {showUpload && (
                <div className="modal-overlay" onClick={() => setShowUpload(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Upload Document</h3>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowUpload(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            {/* Dropzone */}
                            <div
                                onDrop={handleDrop}
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    height: 130, background: dragOver ? 'var(--navy-50)' : 'var(--slate-50)',
                                    border: `2px dashed ${dragOver ? 'var(--navy-400)' : 'var(--border-medium)'}`,
                                    borderRadius: 'var(--border-radius-md)', cursor: 'pointer',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    gap: 8, transition: 'all 0.2s', marginBottom: 18,
                                }}
                            >
                                <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileSelect} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                                <Upload size={26} style={{ color: dragOver ? 'var(--navy-500)' : 'var(--text-muted)', opacity: 0.7 }} />
                                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: dragOver ? 'var(--navy-600)' : 'var(--text-secondary)' }}>
                                    Drop files here or <span style={{ color: 'var(--navy-500)', textDecoration: 'underline' }}>browse</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PDF, DOC, JPG, PNG supported</div>
                            </div>

                            {uploadedFiles.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                                    {uploadedFiles.map((f, i) => (
                                        <div key={i} style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '8px 12px', background: 'rgba(16,185,129,0.06)',
                                            border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--border-radius-sm)',
                                        }}>
                                            <Paperclip size={13} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
                                            <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600 }}>{f.name}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatSize(f.size)}</span>
                                            <button onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))} className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--accent-rose)' }}>
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="form-grid form-grid-2">
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Document Name *</label>
                                    <input className="form-control" value={form.docName} onChange={e => setForm({ ...form, docName: e.target.value })} placeholder="e.g. Sale Agreement - Kiran Reddy" />
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Customer Name *</label>
                                    <input className="form-control" list="customers-list" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} placeholder="Select or type customer name" />
                                    <datalist id="customers-list">
                                        {CUSTOMERS_DATA.map(c => <option key={c.id} value={c.name} />)}
                                    </datalist>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Booking</label>
                                    <select className="form-control" value={form.bookingId} onChange={e => setForm({ ...form, bookingId: e.target.value })}>
                                        <option value="">Select booking</option>
                                        {BOOKINGS_DATA.map(b => <option key={b.id} value={b.id}>{b.customer_name || b.customerName} — {b.unit_no || b.unitNo}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Document Type</label>
                                    <select className="form-control" value={form.docType} onChange={e => setForm({ ...form, docType: e.target.value })}>
                                        {Object.keys(DOC_TYPE_CONFIG).map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                        {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Expiry Date (optional)</label>
                                    <input type="date" className="form-control" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} />
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Notes</label>
                                    <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes or context..." />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowUpload(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : <><Upload size={14} /> Upload & Save</>}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Smart Document Generation Modal */}
            {showGenerate && (
                <div className="modal-overlay" onClick={() => setShowGenerate(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Zap size={18} style={{ color: 'var(--accent-violet)' }} /> Smart Document Generation</h3>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowGenerate(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                                Automatically generate legally compliant documents using dynamic customer and property data from the CRM, and optionally request a secure E-Signature.
                            </p>
                            <div className="form-grid form-grid-2">
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Select Booking to Autofill *</label>
                                    <select className="form-control" defaultValue="">
                                        <option value="" disabled>Select booking...</option>
                                        {BOOKINGS_DATA.map(b => <option key={b.id} value={b.id}>{b.customer_name || b.customerName} — Unit {b.unit_no || b.unitNo}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Template Engine *</label>
                                    <select className="form-control" defaultValue="allotment">
                                        <option value="allotment">Standard Allotment Letter (PDF)</option>
                                        <option value="sale_agreement">Agreement to Sale / ATS (PDF)</option>
                                        <option value="payment_demand">Payment Demand Notice (PDF)</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2', background: 'var(--slate-50)', padding: 12, borderRadius: 8, border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <input type="checkbox" defaultChecked style={{ transform: 'scale(1.2)', accentColor: 'var(--accent-violet)' }} />
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Request Digital E-Signature</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Automatically route the generated document to the customer portal for signing.</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowGenerate(false)}>Cancel</button>
                            <button className="btn" style={{ background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-violet-dark))', color: 'white' }} onClick={() => {
                                showToast('Document generated and routed for E-Signature!', 'success');
                                setShowGenerate(false);
                            }}>
                                <PenTool size={14} /> Generate & Send via E-Sign
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
