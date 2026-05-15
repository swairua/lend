import "./global.css";

import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
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
import RepaymentSchedule from "./pages/RepaymentSchedule";
import AdminRepaymentSchedule from "./pages/AdminRepaymentSchedule";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import BorrowerPayments from "./pages/BorrowerPayments";
import UserLayout from "./components/UserLayout";
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

      {/* All Authenticated Pages with Layout */}
      <Route path="/dashboard" element={<PrivateRoute requiredRole="borrower"><UserLayout user={user}><BorrowerDashboard /></UserLayout></PrivateRoute>} />
      <Route path="/apply" element={<PrivateRoute requiredRole="borrower"><UserLayout user={user}><ApplyLoan /></UserLayout></PrivateRoute>} />
      <Route path="/loans" element={<PrivateRoute requiredRole="borrower"><UserLayout user={user}><BorrowerLoans /></UserLayout></PrivateRoute>} />
      <Route path="/loans/:loanId" element={<PrivateRoute requiredRole="borrower"><UserLayout user={user}><LoanDetails /></UserLayout></PrivateRoute>} />
      <Route path="/loans/:loanId/repayment-schedule" element={<PrivateRoute requiredRole="borrower"><UserLayout user={user}><RepaymentSchedule /></UserLayout></PrivateRoute>} />
      <Route path="/payments" element={<PrivateRoute requiredRole="borrower"><UserLayout user={user}><BorrowerPayments /></UserLayout></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><UserLayout user={user}><Profile /></UserLayout></PrivateRoute>} />
      <Route path="/messages" element={<PrivateRoute><UserLayout user={user}><Messages /></UserLayout></PrivateRoute>} />
      <Route path="/messages/:messageId" element={<PrivateRoute><UserLayout user={user}><Messages /></UserLayout></PrivateRoute>} />

      {/* Admin Pages */}
      <Route path="/admin" element={<PrivateRoute requiredRole="admin"><UserLayout user={user}><AdminDashboard /></UserLayout></PrivateRoute>} />
      <Route path="/admin/loans" element={<PrivateRoute requiredRole="admin"><UserLayout user={user}><AdminLoans /></UserLayout></PrivateRoute>} />
      <Route path="/admin/loans/:loanId" element={<PrivateRoute requiredRole="admin"><UserLayout user={user}><AdminLoans /></UserLayout></PrivateRoute>} />
      <Route path="/admin/loans/:loanId/repayment-schedule" element={<PrivateRoute requiredRole="admin"><UserLayout user={user}><AdminRepaymentSchedule /></UserLayout></PrivateRoute>} />
      <Route path="/admin/categories" element={<PrivateRoute requiredRole="admin"><UserLayout user={user}><AdminCategories /></UserLayout></PrivateRoute>} />
      <Route path="/admin/products" element={<PrivateRoute requiredRole="admin"><UserLayout user={user}><AdminProducts /></UserLayout></PrivateRoute>} />
      <Route path="/admin/borrowers" element={<PrivateRoute requiredRole="admin"><UserLayout user={user}><AdminBorrowers /></UserLayout></PrivateRoute>} />
      <Route path="/admin/users" element={<PrivateRoute requiredRole="admin"><UserLayout user={user}><AdminUsers /></UserLayout></PrivateRoute>} />
      <Route path="/admin/repayments" element={<PrivateRoute requiredRole="admin"><UserLayout user={user}><AdminRepayments /></UserLayout></PrivateRoute>} />
      <Route path="/admin/config" element={<PrivateRoute requiredRole="admin"><UserLayout user={user}><AdminSettings /></UserLayout></PrivateRoute>} />
      <Route path="/admin/reports" element={<PrivateRoute requiredRole="admin"><UserLayout user={user}><AdminReports /></UserLayout></PrivateRoute>} />
      <Route path="/admin/messages" element={<PrivateRoute requiredRole="admin"><UserLayout user={user}><Messages /></UserLayout></PrivateRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

// Initialize Capacitor (native mobile features)
initializeCapacitor();

// Register service worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);

      // Listen for service worker updates
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

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
