import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import { ToastProvider } from './components/feedback/ToastProvider';
import { useToast } from './hooks/useToast';
import Dialer from './components/telephony/Dialer';
import AgentCopilotWidget from './components/shared/AgentCopilotWidget';
import MobileBottomNav from './components/layout/MobileBottomNav';
import PWAInstallManager from './components/shared/PWAInstallManager';
import ErrorBoundary from './components/feedback/ErrorBoundary';
import { PresenceProvider, usePresence } from './context/PresenceContext';
import { BrandingProvider, useBranding } from './context/BrandingContext';

// --- Lazy Loaded Pages (domain-grouped) ---
// Auth
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const PublicSignup = lazy(() => import('./pages/auth/PublicSignup'));

// Dashboard
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const AdminDashboardView = lazy(() => import('./pages/dashboard/AdminDashboardView'));
const CommandCenter = lazy(() => import('./pages/dashboard/CommandCenter'));

// Leads & Pipeline
const Leads = lazy(() => import('./pages/leads/Leads'));
const NurtureLeads = lazy(() => import('./pages/leads/NurtureLeads'));
const Pipeline = lazy(() => import('./pages/leads/Pipeline'));
const ContactDetails = lazy(() => import('./pages/leads/ContactDetails'));
const LeadScoreStatus = lazy(() => import('./pages/leads/LeadScoreStatus'));
const Followups = lazy(() => import('./pages/leads/Followups'));

// Properties
const Projects = lazy(() => import('./pages/properties/Projects'));
const Inventory = lazy(() => import('./pages/properties/Inventory'));
const Bookings = lazy(() => import('./pages/properties/Bookings'));
const SiteVisits = lazy(() => import('./pages/properties/SiteVisits'));

// Communications
const Inbox = lazy(() => import('./pages/communications/Inbox'));
const Notifications = lazy(() => import('./pages/communications/Notifications'));
const WhatsAppMarketing = lazy(() => import('./pages/communications/WhatsAppMarketing'));
const Marketing = lazy(() => import('./pages/communications/Marketing'));
const CallRecords = lazy(() => import('./pages/communications/CallRecords'));

// Analytics
const Analytics = lazy(() => import('./pages/analytics/Analytics'));
const Leaderboard = lazy(() => import('./pages/analytics/Leaderboard'));
const Reports = lazy(() => import('./pages/analytics/Reports'));
const VoiceAnalytics = lazy(() => import('./pages/analytics/VoiceAnalytics'));
const TeamHierarchy = lazy(() => import('./pages/analytics/TeamHierarchy'));
const Academy = lazy(() => import('./pages/analytics/Academy'));

// Finance
const Billing = lazy(() => import('./pages/finance/Billing'));
const BillingSuccess = lazy(() => import('./pages/finance/BillingSuccess'));
const PaymentTracker = lazy(() => import('./pages/finance/PaymentTracker'));
const Commissions = lazy(() => import('./pages/finance/Commissions'));
const Agreements = lazy(() => import('./pages/bookings/AgreementGenerator'));

// Admin
const Admin = lazy(() => import('./pages/admin/Admin'));
const SuperAdmin = lazy(() => import('./pages/admin/SuperAdmin'));
const WorkspaceManagement = lazy(() => import('./pages/admin/WorkspaceManagement'));
const Automations = lazy(() => import('./pages/admin/Automations'));
const AutomationDistribution = lazy(() => import('./pages/admin/AutomationDistribution'));
const Integrations = lazy(() => import('./pages/admin/Integrations'));

// Partners
const ChannelPartners = lazy(() => import('./pages/partners/ChannelPartners'));
const BrokerPortal = lazy(() => import('./pages/partners/BrokerPortal'));
const CustomerPortal = lazy(() => import('./pages/partners/CustomerPortal'));
const Customers = lazy(() => import('./pages/partners/Customers'));

// Public
const Enquiry = lazy(() => import('./pages/public/Enquiry'));
const ProjectMicrosite = lazy(() => import('./pages/public/ProjectMicrosite'));
const Kiosk = lazy(() => import('./pages/public/Kiosk'));
const CalendarPage = lazy(() => import('./pages/public/CalendarPage'));
const PartnerReferral = lazy(() => import('./pages/public/PartnerReferral'));

// --- Pre-loaded Critical Components ---
import { PageLoader } from './components/feedback/Feedback';

// --- UI Overlays ---
function LockoutOverlay() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000, 
      background: 'rgba(10, 22, 40, 0.95)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center'
    }}>
      <div style={{ maxWidth: 400, padding: 40 }}>
        <div style={{ fontSize: '4rem', marginBottom: 20 }}>❄️</div>
        <h2 style={{ color: 'white', fontWeight: 900, marginBottom: 16 }}>Operational Lockout</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
          This workspace has been temporarily suspended by the Zentrix Systems administrator. 
          Please settle outstanding dues or contact support to restore access.
        </p>
      </div>
    </div>
  );
}

// ─── Role-based access guard ────────────────────────────────────────
function RoleGuard({ path, children }) {
  const { canAccess } = useAuth();
  if (!canAccess(path)) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '60vh', textAlign: 'center', gap: 16,
      }}>
        <div style={{ fontSize: '3rem' }}>🔒</div>
        <h2 style={{ fontWeight: 800, color: 'var(--accent-rose)' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: 400 }}>
          You don't have permission to view this page. Contact your administrator to request access.
        </p>
        <button className="btn btn-primary btn-sm" onClick={() => window.history.back()}>
          Go Back
        </button>
      </div>
    );
  }
  return children;
}

function ProtectedApp() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const { branding } = useBranding();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const handleLock = () => setIsLocked(true);
    window.addEventListener('zentrix_lockout', handleLock);
    return () => window.removeEventListener('zentrix_lockout', handleLock);
  }, []);

  const { trackPage, socket } = usePresence();
  const location = useLocation();

  useEffect(() => {
    trackPage(location.pathname);
  }, [location.pathname]);

  // Handle Notifications selectively through context socket
  useEffect(() => {
    if (!socket) return;
    
    const onNotify = (data) => {
      addToast({
        type: 'info',
        title: data.title || 'New Notification',
        message: data.message || 'You have a new update.',
        duration: 8000
      });
    };

    socket.on('notification', onNotify);
    return () => socket.off('notification', onNotify);
  }, [socket, addToast]);

  // Listen for resize
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    const handler = (e) => {
      setIsMobile(e.matches);
      if (!e.matches) setMobileOpen(false);
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  const handleNavToggle = () => {
    if (isMobile) {
      setMobileOpen(v => !v);
    } else {
      setSidebarCollapsed(v => !v);
    }
  };

  // Close mobile sidebar when navigating
  const closeMobileSidebar = () => {
    if (isMobile) setMobileOpen(false);
  };

  return (
    <>
      {isLocked && <LockoutOverlay />}
      <div className="app-layout">
      {/* Mobile backdrop */}
      {isMobile && mobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />
      )}
      <Sidebar
        collapsed={isMobile ? false : sidebarCollapsed}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onToggle={handleNavToggle}
        onLogout={logout}
        onNavigate={closeMobileSidebar}
      />
      <div className={`main-content${sidebarCollapsed && !isMobile ? ' sidebar-collapsed' : ''}${isMobile ? ' mobile' : ''}`}>
        <Header
          collapsed={sidebarCollapsed}
          isMobile={isMobile}
          onToggle={handleNavToggle}
        />
        <main className="page-content" style={isMobile ? { paddingBottom: 80 } : undefined}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
            <Route path="/" element={<RoleGuard path="/">{user?.role === 'customer' ? <Navigate to="/customer-portal" replace /> : user?.role === 'broker' ? <Navigate to="/broker-portal" replace /> : <Dashboard />}</RoleGuard>} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/leads" element={<RoleGuard path="/leads"><Leads /></RoleGuard>} />
            <Route path="/nurture-leads" element={<RoleGuard path="/nurture-leads"><NurtureLeads /></RoleGuard>} />
            <Route path="/leads/:id" element={<RoleGuard path="/leads"><ContactDetails /></RoleGuard>} />
            <Route path="/pipeline" element={<RoleGuard path="/pipeline"><Pipeline /></RoleGuard>} />
            <Route path="/projects" element={<RoleGuard path="/projects"><Projects /></RoleGuard>} />
            <Route path="/inventory" element={<RoleGuard path="/inventory"><Inventory /></RoleGuard>} />
            <Route path="/customers" element={<RoleGuard path="/customers"><Customers /></RoleGuard>} />
            <Route path="/bookings" element={<RoleGuard path="/bookings"><Bookings /></RoleGuard>} />
            <Route path="/payment-tracker" element={<RoleGuard path="/payment-tracker"><PaymentTracker /></RoleGuard>} />
            <Route path="/agreements" element={<RoleGuard path="/agreements"><Agreements /></RoleGuard>} />
            <Route path="/followups" element={<RoleGuard path="/followups"><Followups /></RoleGuard>} />
            <Route path="/site-visits" element={<RoleGuard path="/site-visits"><SiteVisits /></RoleGuard>} />
            <Route path="/notifications" element={<RoleGuard path="/notifications"><Notifications /></RoleGuard>} />
            <Route path="/channel-partners" element={<RoleGuard path="/channel-partners"><ChannelPartners /></RoleGuard>} />
            <Route path="/analytics" element={<RoleGuard path="/analytics"><Analytics /></RoleGuard>} />
            <Route path="/team-hierarchy" element={<RoleGuard path="/team-hierarchy"><TeamHierarchy /></RoleGuard>} />
            <Route path="/leaderboard" element={<RoleGuard path="/leaderboard"><Leaderboard /></RoleGuard>} />
            <Route path="/reports" element={<RoleGuard path="/reports"><Reports /></RoleGuard>} />
            <Route path="/admin" element={<RoleGuard path="/admin"><Admin /></RoleGuard>} />
            <Route path="/calendar" element={<RoleGuard path="/calendar"><CalendarPage /></RoleGuard>} />
            <Route path="/superadmin" element={<RoleGuard path="/superadmin"><SuperAdmin /></RoleGuard>} />
            <Route path="/workspace-management" element={<RoleGuard path="/superadmin"><WorkspaceManagement /></RoleGuard>} />
            <Route path="/customer-portal" element={<RoleGuard path="/customer-portal"><CustomerPortal /></RoleGuard>} />
            <Route path="/broker-portal" element={<RoleGuard path="/broker-portal"><BrokerPortal /></RoleGuard>} />
            <Route path="/inbox" element={<RoleGuard path="/inbox"><Inbox /></RoleGuard>} />
            <Route path="/automations" element={<RoleGuard path="/automations"><Automations /></RoleGuard>} />
            <Route path="/automation-distribution" element={<RoleGuard path="/automation-distribution"><AutomationDistribution /></RoleGuard>} />
            <Route path="/integrations" element={<RoleGuard path="/integrations"><Integrations /></RoleGuard>} />
            <Route path="/commissions" element={<RoleGuard path="/commissions"><Commissions /></RoleGuard>} />
            <Route path="/call-records" element={<RoleGuard path="/call-records"><CallRecords /></RoleGuard>} />
            <Route path="/voice-analytics" element={<RoleGuard path="/voice-analytics"><VoiceAnalytics /></RoleGuard>} />
            <Route path="/lead-scoring" element={<RoleGuard path="/lead-scoring"><LeadScoreStatus /></RoleGuard>} />
            <Route path="/marketing" element={<RoleGuard path="/marketing"><Marketing /></RoleGuard>} />
            <Route path="/whatsapp-marketing" element={<RoleGuard path="/whatsapp-marketing"><WhatsAppMarketing /></RoleGuard>} />
            <Route path="/billing" element={<RoleGuard path="/billing"><Billing /></RoleGuard>} />
            <Route path="/command-center" element={<RoleGuard path="/command-center"><CommandCenter /></RoleGuard>} />
            <Route path="/academy" element={<RoleGuard path="/academy"><Academy /></RoleGuard>} />
            <Route path="/billing/success" element={<BillingSuccess />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </main>
      </div>
      {(user?.role === 'agent' || user?.role === 'sales_manager') && !isMobile && <AgentCopilotWidget />}
      {isMobile && <MobileBottomNav onOpenSidebar={() => setMobileOpen(true)} />}
      <PWAInstallManager isMobile={isMobile} />
    </div>
    <Dialer />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <PresenceProvider>
          <BrandingProvider>
          <ErrorBoundary>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/login" element={<LoginRedirect />} />
                  <Route path="/register" element={<RegisterRedirect />} />
                  <Route path="/signup" element={<PublicSignup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/enquiry" element={<Enquiry />} />
                  <Route path="/project/:projectId" element={<ProjectMicrosite />} />
                  <Route path="/referral/:partnerId" element={<PartnerReferral />} />
                  <Route path="/kiosk" element={<Kiosk />} />
                  {/* All other routes — protected */}
                  <Route path="/*" element={<ProtectedApp />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ErrorBoundary>
          </BrandingProvider>
        </PresenceProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

// Redirect already-logged-in users from /login to dashboard
function LoginRedirect() {
  const { user } = useAuth();
  if (user) {
    if (user.role === 'customer') return <Navigate to="/customer-portal" replace />;
    if (user.role === 'broker') return <Navigate to="/broker-portal" replace />;
    return <Navigate to="/" replace />;
  }
  return <Login />;
}

function RegisterRedirect() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <Register />;
}

