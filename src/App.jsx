import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { ToastProvider } from './components/ToastProvider';
import { useToast } from './hooks/useToast';
import Dialer from './components/Dialer';
import ZapierAssistant from './components/ZapierAssistant';
import AgentCopilotWidget from './components/AgentCopilotWidget';
import MobileActionHub from './components/MobileActionHub';
import MobileBottomNav from './components/MobileBottomNav';
// PWA removed
import ErrorBoundary from './components/ErrorBoundary';
import { PresenceProvider, usePresence } from './context/PresenceContext';
import { BrandingProvider, useBranding } from './context/BrandingContext';
// --- Lazy Loaded Pages ---
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Leads = lazy(() => import('./pages/Leads'));
const NurtureLeads = lazy(() => import('./pages/NurtureLeads'));
const Pipeline = lazy(() => import('./pages/Pipeline'));
const Projects = lazy(() => import('./pages/Projects'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Customers = lazy(() => import('./pages/Customers'));
const ContactDetails = lazy(() => import('./pages/ContactDetails'));
const Bookings = lazy(() => import('./pages/Bookings'));
const Followups = lazy(() => import('./pages/Followups'));
const SiteVisits = lazy(() => import('./pages/SiteVisits'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Admin = lazy(() => import('./pages/Admin'));
const Notifications = lazy(() => import('./pages/Notifications'));
const ChannelPartners = lazy(() => import('./pages/ChannelPartners'));
const PaymentTracker = lazy(() => import('./pages/PaymentTracker'));
const Agreements = lazy(() => import('./pages/Agreements'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const Enquiry = lazy(() => import('./pages/Enquiry'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const SuperAdmin = lazy(() => import('./pages/SuperAdmin'));
const CustomerPortal = lazy(() => import('./pages/CustomerPortal'));
const BrokerPortal = lazy(() => import('./pages/BrokerPortal'));
const Inbox = lazy(() => import('./pages/Inbox'));
const Automations = lazy(() => import('./pages/Automations'));
const AutomationDistribution = lazy(() => import('./pages/AutomationDistribution'));
const Commissions = lazy(() => import('./pages/Commissions'));
const CallRecords = lazy(() => import('./pages/CallRecords'));
const VoiceAnalytics = lazy(() => import('./pages/VoiceAnalytics'));
const LeadScoreStatus = lazy(() => import('./pages/LeadScoreStatus'));
const Kiosk = lazy(() => import('./pages/Kiosk'));
const Billing = lazy(() => import('./pages/Billing'));
const BillingSuccess = lazy(() => import('./pages/BillingSuccess'));
const Integrations = lazy(() => import('./pages/Integrations'));
const Marketing = lazy(() => import('./pages/Marketing'));
const WhatsAppMarketing = lazy(() => import('./pages/WhatsAppMarketing'));
const PartnerReferral = lazy(() => import('./pages/public/PartnerReferral'));
const CommandCenter = lazy(() => import('./pages/CommandCenter'));
const Reports = lazy(() => import('./pages/Reports'));
const TeamHierarchy = lazy(() => import('./pages/TeamHierarchy'));
const WorkspaceManagement = lazy(() => import('./pages/WorkspaceManagement'));
const PublicSignup = lazy(() => import('./pages/PublicSignup'));

// --- Pre-loaded Critical Components ---
import { PageLoader } from './components/Feedback';
import './index.css';

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
            <Route path="/billing/success" element={<BillingSuccess />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </main>
      </div>
      {(user?.role === 'agent' || user?.role === 'sales_manager') && !isMobile && <AgentCopilotWidget />}
      {isMobile && <MobileBottomNav onOpenSidebar={() => setMobileOpen(true)} />}
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

