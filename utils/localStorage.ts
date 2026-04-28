/**
 * localStorage utilities for data persistence
 */

export interface User {
  id: string;
  role: "borrower" | "admin";
  name: string;
  email: string;
  phone?: string;
  idNumber?: string;
  createdAt: string;
}

export interface LoanApplication {
  id: string;
  borrowerId: string;
  category: 1 | 2 | 3;
  amount: number;
  loanTermMonths: number;
  status: "pending" | "approved" | "rejected" | "disbursed" | "repaying" | "completed";
  applicationDate: string;
  approvalDate?: string;
  disbursalDate?: string;
  expectedCompletionDate?: string;
  notes?: string;
  includeTrackingSystem?: boolean; // For Category 1
  totalAmount: number;
  interest: number;
  processingFee: number;
  logbookTransferFee?: number;
  trackingSystemCost?: number;
}

export interface RepaymentRecord {
  id: string;
  loanId: string;
  paymentNumber: number;
  dueDate: string;
  amount: number;
  principal: number;
  interest: number;
  penalty: number;
  status: "pending" | "paid" | "overdue";
  paidDate?: string;
  paidAmount?: number;
}

export interface AdminConfig {
  category1: {
    annualInterestRate: number; // 19.5
    processingFeeRate: number; // 4
    logbookTransferFee: number; // 7000
    trackingSystemCost: number; // 25000
  };
  category2: {
    interestRate30Days: number; // 15
    processingFeeRate: number; // 4
    minAmount: number; // 5000
    maxAmount: number; // 50000
  };
  category3: {
    annualInterestRate: number; // Admin-configurable
    processingFeeRate: number;
    minLoanTermMonths: number;
    maxLoanTermMonths: number;
  };
  latePenaltyRate: number; // 2.5 (percent per annum)
}

const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  category1: {
    annualInterestRate: 19.5,
    processingFeeRate: 4,
    logbookTransferFee: 7000,
    trackingSystemCost: 25000,
  },
  category2: {
    interestRate30Days: 15,
    processingFeeRate: 4,
    minAmount: 5000,
    maxAmount: 50000,
  },
  category3: {
    annualInterestRate: 10,
    processingFeeRate: 3,
    minLoanTermMonths: 3,
    maxLoanTermMonths: 36,
  },
  latePenaltyRate: 2.5,
};

// ============================================
// User Management
// ============================================

export function getCurrentUser(): User | null {
  const user = localStorage.getItem("currentUser");
  return user ? JSON.parse(user) : null;
}

export function setCurrentUser(user: User): void {
  localStorage.setItem("currentUser", JSON.stringify(user));
}

export function getAllUsers(): User[] {
  const users = localStorage.getItem("users");
  return users ? JSON.parse(users) : [];
}

export function saveUser(user: User): void {
  const users = getAllUsers();
  const index = users.findIndex((u) => u.id === user.id);
  if (index > -1) {
    users[index] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem("users", JSON.stringify(users));
}

export function getUserById(id: string): User | null {
  const users = getAllUsers();
  return users.find((u) => u.id === id) || null;
}

export function findUserByEmail(email: string): User | null {
  const users = getAllUsers();
  return users.find((u) => u.email === email) || null;
}

// ============================================
// Loan Management
// ============================================

export function getAllLoans(): LoanApplication[] {
  const loans = localStorage.getItem("loans");
  return loans ? JSON.parse(loans) : [];
}

export function saveLoan(loan: LoanApplication): void {
  const loans = getAllLoans();
  const index = loans.findIndex((l) => l.id === loan.id);
  if (index > -1) {
    loans[index] = loan;
  } else {
    loans.push(loan);
  }
  localStorage.setItem("loans", JSON.stringify(loans));
}

export function getLoanById(id: string): LoanApplication | null {
  const loans = getAllLoans();
  return loans.find((l) => l.id === id) || null;
}

export function getLoansByBorrowerId(borrowerId: string): LoanApplication[] {
  const loans = getAllLoans();
  return loans.filter((l) => l.borrowerId === borrowerId);
}

export function getLoansByStatus(
  status: LoanApplication["status"]
): LoanApplication[] {
  const loans = getAllLoans();
  return loans.filter((l) => l.status === status);
}

// ============================================
// Repayment Management
// ============================================

export function getAllRepayments(): RepaymentRecord[] {
  const repayments = localStorage.getItem("repayments");
  return repayments ? JSON.parse(repayments) : [];
}

export function saveRepayment(repayment: RepaymentRecord): void {
  const repayments = getAllRepayments();
  const index = repayments.findIndex((r) => r.id === repayment.id);
  if (index > -1) {
    repayments[index] = repayment;
  } else {
    repayments.push(repayment);
  }
  localStorage.setItem("repayments", JSON.stringify(repayments));
}

export function getRepaymentsByLoanId(loanId: string): RepaymentRecord[] {
  const repayments = getAllRepayments();
  return repayments.filter((r) => r.loanId === loanId);
}

export function getOverdueRepayments(): RepaymentRecord[] {
  const repayments = getAllRepayments();
  const today = new Date();
  return repayments.filter(
    (r) =>
      r.status === "pending" || (r.status === "overdue" && new Date(r.dueDate) < today)
  );
}

// ============================================
// Admin Configuration
// ============================================

export function getAdminConfig(): AdminConfig {
  const config = localStorage.getItem("adminConfig");
  return config ? JSON.parse(config) : DEFAULT_ADMIN_CONFIG;
}

export function saveAdminConfig(config: AdminConfig): void {
  localStorage.setItem("adminConfig", JSON.stringify(config));
}

export function resetAdminConfig(): void {
  saveAdminConfig(DEFAULT_ADMIN_CONFIG);
}

// ============================================
// Helper Functions
// ============================================

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function initializeDefaultData(): void {
  // Initialize default admin config if not exists
  if (!localStorage.getItem("adminConfig")) {
    saveAdminConfig(DEFAULT_ADMIN_CONFIG);
  }

  // Initialize default users for demo if not exists
  if (!localStorage.getItem("users")) {
    const demoUsers: User[] = [
      {
        id: "user-1",
        role: "borrower",
        name: "John Kamau",
        email: "john@example.com",
        phone: "+254712345678",
        idNumber: "12345678",
        createdAt: new Date().toISOString(),
      },
      {
        id: "user-2",
        role: "borrower",
        name: "Jane Ochieng",
        email: "jane@example.com",
        phone: "+254798765432",
        idNumber: "87654321",
        createdAt: new Date().toISOString(),
      },
      {
        id: "admin-1",
        role: "admin",
        name: "Admin User",
        email: "admin@lendhub.com",
        createdAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem("users", JSON.stringify(demoUsers));
  }
}

export function clearAllData(): void {
  localStorage.removeItem("users");
  localStorage.removeItem("loans");
  localStorage.removeItem("repayments");
  localStorage.removeItem("adminConfig");
  localStorage.removeItem("currentUser");
}
