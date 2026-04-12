import { useState, useEffect } from 'react';
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
import ErrorBoundary from './components/ErrorBoundary';
import { PresenceProvider, usePresence } from './context/PresenceContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import NurtureLeads from './pages/NurtureLeads';
import Pipeline from './pages/Pipeline';
import Projects from './pages/Projects';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import ContactDetails from './pages/ContactDetails';
import Bookings from './pages/Bookings';
import Followups from './pages/Followups';
import SiteVisits from './pages/SiteVisits';
import Analytics from './pages/Analytics';
import Leaderboard from './pages/Leaderboard';
import Admin from './pages/Admin';
import Notifications from './pages/Notifications';
import ChannelPartners from './pages/ChannelPartners';
import PaymentTracker from './pages/PaymentTracker';
import Agreements from './pages/Agreements';
import CalendarPage from './pages/CalendarPage';
import Enquiry from './pages/Enquiry';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import SuperAdmin from './pages/SuperAdmin';
import CustomerPortal from './pages/CustomerPortal';
import BrokerPortal from './pages/BrokerPortal';
import Inbox from './pages/Inbox';
import Automations from './pages/Automations';
import AutomationDistribution from './pages/AutomationDistribution';
import Commissions from './pages/Commissions';
import CallRecords from './pages/CallRecords';
import VoiceAnalytics from './pages/VoiceAnalytics';
import LeadScoreStatus from './pages/LeadScoreStatus';
import Kiosk from './pages/Kiosk';
import Billing from './pages/Billing';
import BillingSuccess from './pages/BillingSuccess';
import Integrations from './pages/Integrations';
import Marketing from './pages/Marketing';
import WhatsAppMarketing from './pages/WhatsAppMarketing';
import PartnerReferral from './pages/public/PartnerReferral';
import CommandCenter from './pages/CommandCenter';
import Reports from './pages/Reports';
import TeamHierarchy from './pages/TeamHierarchy';
import WorkspaceManagement from './pages/WorkspaceManagement';
import './index.css';

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

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
        <main className="page-content">
          <Routes>
            <Route path="/" element={<RoleGuard path="/">{user?.role === 'customer' ? <Navigate to="/customer-portal" replace /> : user?.role === 'broker' ? <Navigate to="/broker-portal" replace /> : <Dashboard />}</RoleGuard>} />
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
        </main>
      </div>
      {(user?.role === 'agent' || user?.role === 'sales_manager') && <AgentCopilotWidget />}
      <Dialer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <PresenceProvider>
          <ErrorBoundary>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginRedirect />} />
                <Route path="/register" element={<RegisterRedirect />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/enquiry" element={<Enquiry />} />
                <Route path="/referral/:partnerId" element={<PartnerReferral />} />
                <Route path="/kiosk" element={<Kiosk />} />
                {/* All other routes — protected */}
                <Route path="/*" element={<ProtectedApp />} />
              </Routes>
            </BrowserRouter>
          </ErrorBoundary>
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

