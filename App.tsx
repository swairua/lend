import "./global.css";

import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import BorrowerDashboard from "./pages/BorrowerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ApplyLoan from "./pages/ApplyLoan";
import AdminConfig from "./pages/AdminConfig";
import LoanDetails from "./pages/LoanDetails";
import BorrowerLoans from "./pages/BorrowerLoans";
import NotFound from "./pages/NotFound";
import Placeholder from "./pages/Placeholder";
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
import UserLayout from "./components/UserLayout";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const location = useLocation();

  useEffect(() => {
    setUser(JSON.parse(localStorage.getItem('user') || 'null'));
  }, [location.pathname]);
  
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />

      {/* All Authenticated Pages with Layout */}
      <Route path="/dashboard" element={<UserLayout user={user}><BorrowerDashboard /></UserLayout>} />
      <Route path="/apply" element={<UserLayout user={user}><ApplyLoan /></UserLayout>} />
      <Route path="/loans" element={<UserLayout user={user}><BorrowerLoans /></UserLayout>} />
      <Route path="/loans/:loanId" element={<UserLayout user={user}><LoanDetails /></UserLayout>} />
      <Route path="/profile" element={<UserLayout user={user}><Profile /></UserLayout>} />
      <Route path="/messages" element={<UserLayout user={user}><Messages /></UserLayout>} />
      <Route path="/messages/:messageId" element={<UserLayout user={user}><Messages /></UserLayout>} />

      {/* Admin Pages */}
      <Route path="/admin" element={<UserLayout user={user}><AdminDashboard /></UserLayout>} />
      <Route path="/admin/loans" element={<UserLayout user={user}><AdminLoans /></UserLayout>} />
      <Route path="/admin/loans/:loanId" element={<UserLayout user={user}><AdminLoans /></UserLayout>} />
      <Route path="/admin/categories" element={<UserLayout user={user}><AdminCategories /></UserLayout>} />
      <Route path="/admin/products" element={<UserLayout user={user}><AdminProducts /></UserLayout>} />
      <Route path="/admin/borrowers" element={<UserLayout user={user}><AdminBorrowers /></UserLayout>} />
      <Route path="/admin/users" element={<UserLayout user={user}><AdminUsers /></UserLayout>} />
      <Route path="/admin/repayments" element={<UserLayout user={user}><AdminRepayments /></UserLayout>} />
      <Route path="/admin/config" element={<UserLayout user={user}><AdminSettings /></UserLayout>} />
      <Route path="/admin/reports" element={<UserLayout user={user}><AdminReports /></UserLayout>} />
      <Route path="/admin/messages" element={<UserLayout user={user}><Messages /></UserLayout>} />

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

createRoot(document.getElementById("root")!).render(<App />);
