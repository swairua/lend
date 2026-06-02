import "./global.css";

import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { initializeCapacitor } from "./utils/capacitorInit";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import BorrowerDashboard from "./pages/BorrowerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ApplyLoan from "./pages/ApplyLoan";
import LoanDetails from "./pages/LoanDetails";
import BorrowerLoans from "./pages/BorrowerLoans";
import NotFound from "./pages/NotFound";
import Messages from "./pages/Messages";
import AdminReports from "./pages/AdminReports";
import Profile from "./pages/Profile";
import AdminLoans from "./pages/AdminLoans";
import AdminCategories from "./pages/AdminCategories";
import AdminProducts from "./pages/AdminProducts";
import AdminUsers from "./pages/AdminUsers";
import AdminBorrowers from "./pages/AdminBorrowers";
import AdminSettings from "./pages/AdminSettings";
import AdminRepayments from "./pages/AdminRepayments";
import AdminSystemLogs from "./pages/AdminSystemLogs";
import RepaymentSchedule from "./pages/RepaymentSchedule";
import AdminRepaymentSchedule from "./pages/AdminRepaymentSchedule";
import AdminDisbursements from "./pages/AdminDisbursements";
import AdminCreateLoan from "./pages/AdminCreateLoan";
import AdminInvoiceProducts from "./pages/AdminInvoiceProducts";
import AdminQuotations from "./pages/AdminQuotations";
import AdminInvoices from "./pages/AdminInvoices";
import AdminCustomers from "./pages/AdminCustomers";
import AdminRoles from "./pages/AdminRoles";
import AdminDocumentation from "./pages/AdminDocumentation";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import BorrowerPayments from "./pages/BorrowerPayments";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import { AppLayout } from "./components/layouts/AppLayout";
import PrivateRoute from "./components/PrivateRoute";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const [user, setUser] = useState<any>(null);
  const location = useLocation();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { secureStorage } = await import('./utils/secureStorage');
        const storedUser = await secureStorage.getUser();
        setUser(storedUser);
      } catch (error) {
        console.log('Error loading user:', error);
      }
    };
    loadUser();
  }, [location.pathname]);
  
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* All Authenticated Pages with Layout */}
      <Route path="/dashboard" element={<PrivateRoute requiredRole="borrower"><AppLayout user={user}><BorrowerDashboard /></AppLayout></PrivateRoute>} />
      <Route path="/apply" element={<PrivateRoute requiredRole="borrower"><AppLayout user={user}><ApplyLoan /></AppLayout></PrivateRoute>} />
      <Route path="/loans" element={<PrivateRoute requiredRole="borrower"><AppLayout user={user}><BorrowerLoans /></AppLayout></PrivateRoute>} />
      <Route path="/loans/:loanId" element={<PrivateRoute requiredRole="borrower"><AppLayout user={user}><LoanDetails /></AppLayout></PrivateRoute>} />
      <Route path="/loans/:loanId/repayment-schedule" element={<PrivateRoute requiredRole="borrower"><AppLayout user={user}><RepaymentSchedule /></AppLayout></PrivateRoute>} />
      <Route path="/payments" element={<PrivateRoute requiredRole="borrower"><AppLayout user={user}><BorrowerPayments /></AppLayout></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><AppLayout user={user}><Profile /></AppLayout></PrivateRoute>} />
      <Route path="/messages" element={<PrivateRoute><AppLayout user={user}><Messages /></AppLayout></PrivateRoute>} />
      <Route path="/messages/:messageId" element={<PrivateRoute><AppLayout user={user}><Messages /></AppLayout></PrivateRoute>} />

      {/* Admin Pages — role-gated */}
      <Route path="/admin" element={<PrivateRoute requiredRole={['admin','releaser','manager','agent']}><AppLayout user={user}><AdminDashboard /></AppLayout></PrivateRoute>} />
      <Route path="/admin/loans" element={<PrivateRoute requiredRole={['admin','releaser','manager','agent']}><AppLayout user={user}><AdminLoans /></AppLayout></PrivateRoute>} />
      <Route path="/admin/loans/create" element={<PrivateRoute requiredRole={['admin','manager']}><AppLayout user={user}><AdminCreateLoan /></AppLayout></PrivateRoute>} />
      <Route path="/admin/loans/:loanId" element={<PrivateRoute requiredRole={['admin','releaser','manager','agent']}><AppLayout user={user}><AdminLoans /></AppLayout></PrivateRoute>} />
      <Route path="/admin/loans/:loanId/repayment-schedule" element={<PrivateRoute requiredRole={['admin','releaser','manager','agent']}><AppLayout user={user}><AdminRepaymentSchedule /></AppLayout></PrivateRoute>} />
      <Route path="/admin/categories" element={<PrivateRoute requiredRole={['admin','manager']}><AppLayout user={user}><AdminCategories /></AppLayout></PrivateRoute>} />
      <Route path="/admin/products" element={<PrivateRoute requiredRole={['admin','manager']}><AppLayout user={user}><AdminProducts /></AppLayout></PrivateRoute>} />
      <Route path="/admin/borrowers" element={<PrivateRoute requiredRole={['admin','manager','agent']}><AppLayout user={user}><AdminBorrowers /></AppLayout></PrivateRoute>} />
      <Route path="/admin/users" element={<PrivateRoute requiredRole="admin"><AppLayout user={user}><AdminUsers /></AppLayout></PrivateRoute>} />
      <Route path="/admin/roles" element={<PrivateRoute requiredRole="admin"><AppLayout user={user}><AdminRoles /></AppLayout></PrivateRoute>} />
      <Route path="/admin/repayments" element={<PrivateRoute requiredRole={['admin','manager']}><AppLayout user={user}><AdminRepayments /></AppLayout></PrivateRoute>} />
      <Route path="/admin/logs" element={<PrivateRoute requiredRole={['admin','manager']}><AppLayout user={user}><AdminSystemLogs /></AppLayout></PrivateRoute>} />
      <Route path="/admin/config" element={<PrivateRoute requiredRole="admin"><AppLayout user={user}><AdminSettings /></AppLayout></PrivateRoute>} />
      <Route path="/admin/reports" element={<PrivateRoute requiredRole={['admin','manager']}><AppLayout user={user}><AdminReports /></AppLayout></PrivateRoute>} />
      <Route path="/admin/messages" element={<PrivateRoute requiredRole={['admin','manager']}><AppLayout user={user}><Messages /></AppLayout></PrivateRoute>} />
      <Route path="/admin/disbursements" element={<PrivateRoute requiredRole={['admin','releaser']}><AppLayout user={user}><AdminDisbursements /></AppLayout></PrivateRoute>} />
      <Route path="/admin/customers" element={<PrivateRoute requiredRole={['admin','manager','releaser','agent']}><AppLayout user={user}><AdminCustomers /></AppLayout></PrivateRoute>} />
      <Route path="/admin/invoice-products" element={<PrivateRoute requiredRole={['admin','manager','releaser','agent']}><AppLayout user={user}><AdminInvoiceProducts /></AppLayout></PrivateRoute>} />
      <Route path="/admin/quotations" element={<PrivateRoute requiredRole={['admin','manager','releaser','agent']}><AppLayout user={user}><AdminQuotations /></AppLayout></PrivateRoute>} />
      <Route path="/admin/invoices" element={<PrivateRoute requiredRole={['admin','manager','releaser','agent']}><AppLayout user={user}><AdminInvoices /></AppLayout></PrivateRoute>} />
      <Route path="/admin/documentation" element={<PrivateRoute requiredRole={['admin','releaser','manager','agent']}><AppLayout user={user}><AdminDocumentation /></AppLayout></PrivateRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);

  // Initialize after React renders
  setTimeout(() => {
    initializeCapacitor();

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered:', registration);

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                const event = new CustomEvent('sw-update-ready', { detail: { registration } });
                window.dispatchEvent(event);
                console.log('Service Worker update available');
              }
            });
          });
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      });
    }
  }, 0);
}
