import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { leadsApi, projectsApi, aiApi } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import axios from 'axios';
import { 
    FileText, Download, Printer, Send, Sparkles, Loader2, 
    ArrowLeft, CheckCircle2, AlertCircle, Building2, User, 
    CreditCard, Layout, History, Wand2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { PageLoader, PageError } from '../../components/feedback/Feedback';

const AgreementGenerator: React.FC = () => {
    const [searchParams] = useSearchParams();
    const leadId = searchParams.get('leadId');
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [generating, setGenerating] = useState(false);
    const [agreementContent, setAgreementContent] = useState('');
    const [step, setStep] = useState(1); // 1: Form, 2: Preview

    const { data: lead, loading: leadLoading, error: leadError } = useApi(() => leadId ? leadsApi.get(leadId) : null, [leadId]);
    const { data: projectsData, loading: projLoading } = useApi(() => projectsApi.list());
    const projects = projectsData || [];
    
    const [selectedProject, setSelectedProject] = useState('');

    const [unitDetails, setUnitDetails] = useState({
        number: '',
        type: '3BHK Luxury',
        floor: '12th',
        price: '1.25 Cr',
        bookingAmount: '5,00,000',
        plan: 'Construction Linked Plan (CLP)'
    });

    useEffect(() => {
        if (projects.length > 0 && !selectedProject) {
            setSelectedProject(projects[0].id);
        }
    }, [projects]);

    const handleGenerate = async () => {
        if (!unitDetails.number) {
            showToast('Please enter a unit number', 'error');
            return;
        }
        try {
            setGenerating(true);
            const res = await aiApi.generateAgreement({
                lead_id: leadId,
                project_id: selectedProject,
                unit_details: unitDetails
            });
            setAgreementContent(res.content || res);
            setStep(2);
            showToast('Agreement generated successfully', 'success');
        } catch (err) {
            console.error('Generation failed', err);
            showToast('Failed to generate agreement', 'error');
        } finally {
            setGenerating(false);
        }
    };

    if (leadLoading || projLoading) return <PageLoader />;
    if (leadError) return <PageError message={leadError} />;

    return (
        <div className="animate-fadeIn" style={{ padding: '0 20px', paddingBottom: '100px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button 
                        onClick={() => navigate(-1)}
                        className="btn-icon"
                        style={{ width: 40, height: 40, background: 'var(--bg-light)', border: '1px solid var(--border-medium)' }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="page-title" style={{ margin: 0 }}>Booking Agreement Generator</h1>
                        <p className="page-subtitle" style={{ margin: '4px 0 0' }}>Drafting for {lead?.name || 'Customer'}</p>
                    </div>
                </div>

                <div className="tabs" style={{ background: 'white', padding: 4, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <button 
                        className={`tab ${step === 1 ? 'active' : ''}`}
                        onClick={() => setStep(1)}
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                        1. Unit Details
                    </button>
                    <button 
                        className={`tab ${step === 2 ? 'active' : ''}`}
                        onClick={() => agreementContent && setStep(2)}
                        disabled={!agreementContent}
                        style={{ padding: '8px 16px', fontSize: '0.85rem', opacity: !agreementContent ? 0.5 : 1 }}
                    >
                        2. Review & Sign
                    </button>
                </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: step === 2 ? '1fr 2fr' : '1fr', gap: 24, alignItems: 'start' }}>
                {/* Form Column */}
                <div className="card" style={{ padding: 32, display: step === 2 && window.innerWidth < 1024 ? 'none' : 'block' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy-900)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Layout size={20} color="var(--accent-indigo)" />
                        Configuration
                    </h2>

                    <div className="form-grid form-grid-2">
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Select Project</label>
                            <select 
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                                className="form-control"
                            >
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Unit Number *</label>
                            <input 
                                type="text"
                                value={unitDetails.number}
                                onChange={(e) => setUnitDetails({...unitDetails, number: e.target.value})}
                                placeholder="e.g. 1204"
                                className="form-control"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Inventory Type</label>
                            <select 
                                value={unitDetails.type}
                                onChange={(e) => setUnitDetails({...unitDetails, type: e.target.value})}
                                className="form-control"
                            >
                                <option>Studio</option>
                                <option>1BHK Premium</option>
                                <option>2BHK Luxury</option>
                                <option>3BHK Grand</option>
                                <option>4BHK Sky Villa</option>
                            </select>
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Total Agreement Value</label>
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type="text"
                                    value={unitDetails.price}
                                    onChange={(e) => setUnitDetails({...unitDetails, price: e.target.value})}
                                    className="form-control"
                                    style={{ paddingLeft: 40 }}
                                />
                                <Building2 size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Booking Amount</label>
                            <input 
                                type="text"
                                value={unitDetails.bookingAmount}
                                onChange={(e) => setUnitDetails({...unitDetails, bookingAmount: e.target.value})}
                                className="form-control"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Floor</label>
                            <input 
                                type="text"
                                value={unitDetails.floor}
                                onChange={(e) => setUnitDetails({...unitDetails, floor: e.target.value})}
                                className="form-control"
                            />
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Payment Plan</label>
                            <select 
                                value={unitDetails.plan}
                                onChange={(e) => setUnitDetails({...unitDetails, plan: e.target.value})}
                                className="form-control"
                            >
                                <option>Down Payment Plan (DPP)</option>
                                <option>Construction Linked Plan (CLP)</option>
                                <option>Flexi Payment Plan (FPP)</option>
                                <option>Possession Linked Plan (PLP)</option>
                            </select>
                        </div>
                    </div>

                    <button 
                        onClick={handleGenerate}
                        disabled={generating || !unitDetails.number}
                        className="btn btn-primary"
                        style={{ 
                            width: '100%', 
                            marginTop: 32, 
                            height: 52, 
                            borderRadius: 16, 
                            fontSize: '0.95rem', 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.05em',
                            display: 'flex',
                            justifyContent: 'center',
                            gap: 12
                        }}
                    >
                        {generating ? (
                            <><Loader2 size={18} className="animate-spin" /> Generating...</>
                        ) : (
                            <><Sparkles size={18} /> GENERATE WITH AI</>
                        )}
                    </button>
                </div>

                {/* Preview Column */}
                {step === 2 && (
                    <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: 600, display: 'flex', flexDirection: 'column' }}>
                        {/* Toolbar */}
                        <div style={{ padding: '16px 24px', background: 'var(--bg-light)', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 36, height: 36, background: 'var(--accent-indigo)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FileText size={18} color="white" />
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--navy-900)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Document Preview</span>
                            </div>
                            
                            {agreementContent && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <button className="btn-icon" style={{ color: 'var(--text-muted)' }}>
                                        <Printer size={18} />
                                    </button>
                                    <button className="btn-icon" style={{ color: 'var(--text-muted)' }}>
                                        <Download size={18} />
                                    </button>
                                    <button className="btn btn-primary btn-sm" style={{ padding: '0 16px', height: 36, gap: 8 }}>
                                        <Send size={14} /> SEND FOR E-SIGN
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div style={{ 
                            flex: 1, 
                            padding: '40px', 
                            overflowY: 'auto', 
                            background: 'white',
                            backgroundImage: 'url("https://www.transparenttextures.com/patterns/clean-gray-paper.png")'
                        }}>
                            {agreementContent ? (
                                <div>
                                    <div style={{ 
                                        lineHeight: 1.8, 
                                        color: 'var(--navy-900)', 
                                        fontSize: '0.95rem',
                                        maxWidth: 800,
                                        margin: '0 auto'
                                    }}>
                                        <ReactMarkdown>{agreementContent}</ReactMarkdown>
                                    </div>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 80, paddingTop: 40, borderTop: '1px solid var(--border-medium)', maxWidth: 800, margin: '80px auto 0' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ width: 200, height: 40, borderBottom: '1px solid var(--navy-300)', marginBottom: 12 }}></div>
                                            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Authorized Signatory</p>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ width: 200, height: 40, borderBottom: '1px solid var(--navy-300)', marginBottom: 12 }}></div>
                                            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Applicant Signature</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5, gap: 16 }}>
                                    <Wand2 size={48} color="var(--slate-400)" />
                                    <div style={{ textAlign: 'center' }}>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy-900)', marginBottom: 8 }}>Waiting for Data</h3>
                                        <p style={{ color: 'var(--text-secondary)' }}>Configure the unit details and click generate.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AgreementGenerator;
