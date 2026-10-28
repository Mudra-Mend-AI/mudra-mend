import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { I18nProvider } from '@/i18n/I18nContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import Landing from '@/pages/Landing';
import Login from '@/pages/auth/Login';
import Signup from '@/pages/auth/Signup';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ProfessionalApply from '@/pages/auth/ProfessionalApply';

// Dashboards
import CustomerDashboard from '@/pages/dashboards/CustomerDashboard';
import AdminDashboard from '@/pages/dashboards/AdminDashboard';
import FraudAnalystDashboard from '@/pages/dashboards/FraudAnalystDashboard';
import BankOfficerDashboard from '@/pages/dashboards/BankOfficerDashboard';
import InvestigatorDashboard from '@/pages/dashboards/InvestigatorDashboard';
import AuditorDashboard from '@/pages/dashboards/AuditorDashboard';
import CustomerSupportDashboard from '@/pages/dashboards/CustomerSupportDashboard';
import NgoCoordinatorDashboard from '@/pages/dashboards/NgoCoordinatorDashboard';
import GovOfficialDashboard from '@/pages/dashboards/GovOfficialDashboard';

// Feature pages
import BankAccounts from '@/pages/BankAccounts';
import Payments from '@/pages/Payments';
import Transactions from '@/pages/Transactions';
import ScamReports from '@/pages/ScamReports';
import Alerts from '@/pages/Alerts';
import Cases from '@/pages/Cases';
import GovtSchemes from '@/pages/GovtSchemes';
import NgoOutreach from '@/pages/NgoOutreach';
import Recommendations from '@/pages/Recommendations';
import Reports from '@/pages/Reports';
import Support from '@/pages/Support';
import Settings from '@/pages/Settings';

// Admin pages
import UsersAdmin from '@/pages/admin/UsersAdmin';
import Approvals from '@/pages/admin/Approvals';
import AuditLogs from '@/pages/admin/AuditLogs';
import AIMonitoring from '@/pages/admin/AIMonitoring';
import SystemHealth from '@/pages/admin/SystemHealth';
import AccountPending from '@/pages/AccountPending';
import DatasetManagement from '@/pages/DatasetManagement';
import FraudIntelligence from '@/pages/FraudIntelligence';
import FraudScanner from '@/pages/FraudScanner';
import FraudPatternExplorer from '@/pages/FraudPatternExplorer';
import LearningCenter from '@/pages/LearningCenter';
import IntegrationSettings from '@/pages/admin/IntegrationSettings';

function DashboardRouter() {
  const { profile } = useAuth();
  if (!profile) return null;
  if (profile.status === 'pending') return <AccountPending />;
  switch (profile.role) {
    case 'customer': return <CustomerDashboard />;
    case 'admin': return <AdminDashboard />;
    case 'fraud_analyst': return <FraudAnalystDashboard />;
    case 'bank_officer': return <BankOfficerDashboard />;
    case 'investigator': return <InvestigatorDashboard />;
    case 'auditor': return <AuditorDashboard />;
    case 'customer_support': return <CustomerSupportDashboard />;
    case 'ngo_coordinator': return <NgoCoordinatorDashboard />;
    case 'gov_official': return <GovOfficialDashboard />;
    default: return <CustomerDashboard />;
  }
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/professional-apply" element={<ProfessionalApply />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardRouter />} />
        <Route path="payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
        <Route path="bank-accounts" element={<ProtectedRoute><BankAccounts /></ProtectedRoute>} />
        <Route path="transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
        <Route path="scam-reports" element={<ProtectedRoute><ScamReports /></ProtectedRoute>} />
        <Route path="alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
        <Route path="cases" element={<ProtectedRoute><Cases /></ProtectedRoute>} />
        <Route path="evidence" element={<ProtectedRoute><Cases /></ProtectedRoute>} />
        <Route path="schemes" element={<ProtectedRoute><GovtSchemes /></ProtectedRoute>} />
        <Route path="ngo-outreach" element={<ProtectedRoute><NgoOutreach /></ProtectedRoute>} />
        <Route path="recommendations" element={<ProtectedRoute><Recommendations /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute roles={['admin']}><UsersAdmin /></ProtectedRoute>} />
        <Route path="approvals" element={<ProtectedRoute roles={['admin']}><Approvals /></ProtectedRoute>} />
        <Route path="audit-logs" element={<ProtectedRoute roles={['admin', 'auditor']}><AuditLogs /></ProtectedRoute>} />
        <Route path="ai-monitoring" element={<ProtectedRoute roles={['admin', 'auditor']}><AIMonitoring /></ProtectedRoute>} />
        <Route path="system-health" element={<ProtectedRoute roles={['admin']}><SystemHealth /></ProtectedRoute>} />
        <Route path="datasets" element={<ProtectedRoute><DatasetManagement /></ProtectedRoute>} />
        <Route path="fraud-intelligence" element={<ProtectedRoute><FraudIntelligence /></ProtectedRoute>} />
        <Route path="fraud-scanner" element={<ProtectedRoute><FraudScanner /></ProtectedRoute>} />
        <Route path="fraud-patterns" element={<ProtectedRoute><FraudPatternExplorer /></ProtectedRoute>} />
        <Route path="learning-center" element={<ProtectedRoute><LearningCenter /></ProtectedRoute>} />
        <Route path="integration-settings" element={<ProtectedRoute roles={['admin']}><IntegrationSettings /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
