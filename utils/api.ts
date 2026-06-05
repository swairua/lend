import { User, Loan, LoanProduct, LoanCategory, Repayment, DashboardStats, Customer, InvoiceProduct, Quotation, Invoice } from '../types/api';
import { secureStorage } from './secureStorage';

// API base URL — use VITE_API_BASE env var, production backend for all environments
const API_BASE = import.meta.env.VITE_API_BASE || 'https://lending.wayrus.co.ke/api.php';
const API_ORIGIN = API_BASE.replace(/\/api\.php.*$/, '');
const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL || API_ORIGIN + '/uploads';

// Helper to construct full file URL
export function getFileUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.includes('lending.wayrus.co.ke')) return path;
  const cleanPath = path.replace(/^\/uploads\//, '');
  return UPLOADS_URL + (cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath);
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Mock implementation - returns empty data instead of making API calls
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  console.log('[STUBBED API] Would have called:', endpoint);
  await new Promise(r => setTimeout(r, 100));
  return {} as T;
}

// ==================== Auth ====================
export const authApi = {
  login: (email: string, password: string) =>
    Promise.resolve({ success: false, user: null, token: null } as any),

  register: (data: { email: string; password: string; name: string; phone?: string; client_type?: 'individual' | 'corporate' }) =>
    Promise.resolve({ success: false, user: null, token: null } as any),

  getMe: () =>
    Promise.resolve({ success: false, user: null } as any),

  updateProfile: (data: { name?: string; phone?: string; photo_url?: string; address?: string; business_name?: string; business_type?: string; monthly_income?: number; national_id?: string; kra_pin?: string; tcc_number?: string }) =>
    Promise.resolve({ success: false, user: null } as any),

  changePassword: (currentPassword: string, newPassword: string) =>
    Promise.resolve({ success: false } as any),

  forgotPassword: (email: string) =>
    Promise.resolve({ success: false, message: '' } as any),

  resetPassword: (token: string, password: string) =>
    Promise.resolve({ success: false, message: '' } as any),
};

// ==================== Categories & Products ====================
export const productsApi = {
  getCategories: () =>
    Promise.resolve({ success: true, data: [] } as any),
  
  getProducts: (categoryId?: number) =>
    Promise.resolve({ success: true, data: [] } as any),

  getProduct: (id: number) =>
    Promise.resolve({ success: false, data: null } as any),

  calculate: (productId: number, amount: number, termMonths: number) =>
    Promise.resolve({
      success: true,
      data: {
        principal: 0,
        interest: 0,
        processing_fee: 0,
        asset_transfer_fee: 0,
        tracking_system_fee: 0,
        total_amount: 0,
        monthly_payment: 0,
      },
    } as any),
};

// ==================== Loans ====================
export const loansApi = {
  apply: (data: any) =>
    Promise.resolve({ success: false, message: '', data: { id: 0 } } as any),

  getMyLoans: () =>
    Promise.resolve({ success: true, data: { loans: [], pagination: {} } } as any),

  getMyLoan: (id: number) =>
    Promise.resolve({ success: false, data: null } as any),

  getDashboard: () =>
    Promise.resolve({
      success: true,
      data: {
        active_loans: 0,
        pending_loans: 0,
        total_borrowed: 0,
        total_paid: 0,
        credit_score: 0,
        recent_loans: [],
      },
    } as any),
};

// ==================== Repayments ====================
export const repaymentsApi = {
  getMyRepayments: () =>
    Promise.resolve({ success: true, data: [] } as any),

  record: (data: any) =>
    Promise.resolve({ success: false, message: '' } as any),
};

// ==================== Admin ====================
export const adminApi = {
  getDashboard: () =>
    Promise.resolve({ success: true, data: {} } as any),

  getAnalytics: (period = 30) =>
    Promise.resolve({ success: true, data: {} } as any),

  getLoans: (params?: any) =>
    Promise.resolve({ success: true, data: { loans: [], pagination: {} } } as any),

  getLoan: (id: number) =>
    Promise.resolve({ success: false, data: null } as any),

  approveLoan: (id: number, approve = true, reason?: string) =>
    Promise.resolve({ success: false, message: '' } as any),

  releaseLoan: (id: number) =>
    Promise.resolve({ success: false, message: '' } as any),

  disburseLoan: (id: number, reference?: string) =>
    Promise.resolve({ success: false, message: '' } as any),

  markDefaulted: (id: number) =>
    Promise.resolve({ success: false, message: '' } as any),

  reactivateLoan: (id: number) =>
    Promise.resolve({ success: false, message: '' } as any),

  createLoan: (data: any) =>
    Promise.resolve({ success: false, message: '', data: { id: 0 } } as any),

  getConfig: () =>
    Promise.resolve({ success: true, data: {} } as any),

  saveConfig: (config: any) =>
    Promise.resolve({ success: false, message: '' } as any),

  getBorrowers: (params?: any) =>
    Promise.resolve({ success: true, data: { borrowers: [], pagination: {} } } as any),

  createBorrower: (data: any) =>
    Promise.resolve({ success: false, data: null, generated_password: '' } as any),

  updateBorrowerKYC: (id: number, data: any) =>
    Promise.resolve({ success: false } as any),

  getBorrower: (id: number) =>
    Promise.resolve({ success: false, data: null } as any),

  updateBorrower: (id: number, data: any) =>
    Promise.resolve({ success: false, message: '' } as any),

  getCategories: () =>
    Promise.resolve({ success: true, data: [] } as any),

  createCategory: (data: any) =>
    Promise.resolve({ success: false, data: { id: 0 } } as any),

  updateCategory: (id: number, data: any) =>
    Promise.resolve({ success: false } as any),

  deleteCategory: (id: number) =>
    Promise.resolve({ success: false } as any),

  toggleCategory: (id: number, is_active: boolean) =>
    Promise.resolve({ success: false } as any),

  getProducts: () =>
    Promise.resolve({ success: true, data: [] } as any),

  createProduct: (data: any) =>
    Promise.resolve({ success: false, data: { id: 0 } } as any),

  updateProduct: (id: number, data: any) =>
    Promise.resolve({ success: false } as any),

  deleteProduct: (id: number) =>
    Promise.resolve({ success: false } as any),

  getRepayments: (params?: any) =>
    Promise.resolve({ success: true, data: { repayments: [], pagination: {} } } as any),

  deleteRepayment: (id: number) =>
    Promise.resolve({ success: false } as any),

  getUsers: () =>
    Promise.resolve({ success: true, data: { users: [] } } as any),

  createUser: (data: any) =>
    Promise.resolve({ success: false, data: { id: 0 } } as any),

  updateUser: (id: number, data: any) =>
    Promise.resolve({ success: false } as any),

  deleteUser: (id: number) =>
    Promise.resolve({ success: false } as any),

  toggleUser: (id: number) =>
    Promise.resolve({ success: false } as any),

  getSettings: () =>
    Promise.resolve({ success: true, data: [] } as any),

  updateSetting: (key_name: string, key_value: string, description?: string) =>
    Promise.resolve({ success: false } as any),

  bulkUpdateSettings: (settings: any) =>
    Promise.resolve({ success: false } as any),

  getReports: (params?: any) =>
    Promise.resolve({ success: true, data: {} } as any),

  exportLoans: (params?: any) =>
    Promise.resolve({ success: true, data: [] } as any),

  getAdmins: () =>
    Promise.resolve({ success: true, data: [] } as any),

  createAdmin: (data: any) =>
    Promise.resolve({ success: false, data: { id: 0 } } as any),

  mpesaTestCredentials: (config: any) =>
    Promise.resolve({ success: false, error: 'Backend offline' } as any),

  mpesaInitiatePayment: (loan_id: number, phone_number: string, amount?: number) =>
    Promise.resolve({ success: false, checkout_request_id: '', error: 'Backend offline' } as any),

  mpesaInitiateDisbursement: (loan_id: number, phone: string) =>
    Promise.resolve({ success: false, command_id: '', error: 'Backend offline' } as any),

  mpesaGetTransactions: (loan_id?: number) =>
    Promise.resolve({ success: true, data: [] } as any),

  post: (endpoint: string, data: any) =>
    Promise.resolve({ success: false } as any),

  get: (endpoint: string) =>
    Promise.resolve({ success: false } as any),

  syncMpesaPayments: async (loanId?: number) =>
    Promise.resolve({
      success: true,
      message: 'No orphaned payments to sync',
      data: { applied: 0, created: 0, skipped: 0, errors: 0 }
    } as any),

  getOrphanedPayments: () =>
    Promise.resolve({ success: true, data: { orphaned: [], pending_timeout: [], total_orphaned: 0, total_pending: 0 } } as any),

  getDisbursements: (params?: any) =>
    Promise.resolve({ success: true, data: { disbursements: [], pagination: {} } } as any),

  createDisbursement: (data: any) =>
    Promise.resolve({ success: false, message: '', data: { id: 0 } } as any),

  deleteDisbursement: (id: number) =>
    Promise.resolve({ success: false } as any),

  getLogs: (params?: any) =>
    Promise.resolve({ success: true, data: { logs: [], pagination: { page: 0, limit: 0, total: 0 } } } as any),

  cleanupLogs: (days: number = 90) =>
    Promise.resolve({ success: false, message: '' } as any),

  getInvoiceProducts: () =>
    Promise.resolve({ success: true, data: [] } as any),

  createInvoiceProduct: (data: any) =>
    Promise.resolve({ success: false, data: { id: 0 } } as any),

  updateInvoiceProduct: (id: number, data: any) =>
    Promise.resolve({ success: false } as any),

  deleteInvoiceProduct: (id: number) =>
    Promise.resolve({ success: false } as any),

  getCustomers: (search?: string) =>
    Promise.resolve({ success: true, data: [] } as any),

  createCustomer: (data: any) =>
    Promise.resolve({ success: false, data: { id: 0 } } as any),

  updateCustomer: (id: number, data: any) =>
    Promise.resolve({ success: false } as any),

  deleteCustomer: (id: number) =>
    Promise.resolve({ success: false } as any),

  getQuotations: (params?: any) =>
    Promise.resolve({ success: true, data: { quotations: [], pagination: {} } } as any),

  getQuotation: (id: number) =>
    Promise.resolve({ success: false, data: null } as any),

  createQuotation: (data: any) =>
    Promise.resolve({ success: false, data: { id: 0, quote_number: '' } } as any),

  deleteQuotation: (id: number) =>
    Promise.resolve({ success: false } as any),

  updateQuotationStatus: (id: number, status: string) =>
    Promise.resolve({ success: false } as any),

  convertQuotation: (id: number) =>
    Promise.resolve({ success: false, data: { invoice_number: '' } } as any),

  getInvoices: (params?: any) =>
    Promise.resolve({ success: true, data: { invoices: [], pagination: {} } } as any),

  getInvoice: (id: number) =>
    Promise.resolve({ success: false, data: null } as any),

  createInvoice: (data: any) =>
    Promise.resolve({ success: false, data: { id: 0, invoice_number: '' } } as any),

  updateInvoice: (id: number, data: any) =>
    Promise.resolve({ success: false } as any),

  deleteInvoice: (id: number) =>
    Promise.resolve({ success: false } as any),

  updateInvoiceStatus: (id: number, status: string) =>
    Promise.resolve({ success: false } as any),

  getRoles: () =>
    Promise.resolve({ success: true, data: [] } as any),

  getRoleWithPermissions: (roleKey: string) =>
    Promise.resolve({ success: false, data: null } as any),

  updateRole: (roleKey: string, data: any) =>
    Promise.resolve({ success: false, message: '' } as any),

  updateRolePermissions: (roleKey: string, permissions: any) =>
    Promise.resolve({ success: false, message: '' } as any),
};

// ==================== Helpers ====================
export const formatKES = (amount: number): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (date: string | null): string => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: 'bg-primary/10 text-primary',
    approved: 'bg-primary/10 text-primary',
    rejected: 'bg-primary/10 text-primary',
    active: 'bg-primary/10 text-primary',
    disbursed: 'bg-primary/10 text-primary',
    completed: 'bg-primary/10 text-primary',
    defaulted: 'bg-primary/10 text-primary',
    written_off: 'bg-primary/10 text-primary',
  };
  return colors[status] || 'bg-muted text-muted-foreground';
};

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    active: 'Active',
    disbursed: 'Disbursed',
    completed: 'Completed',
    defaulted: 'Defaulted',
    written_off: 'Written Off',
  };
  return labels[status] || status;
};

// ==================== Messages ====================
interface Message {
  id: number;
  sender_id: number;
  recipient_id: number;
  loan_id: number | null;
  subject: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
  recipient_name?: string;
}

export const messagesApi = {
  getMessages: (folder: 'inbox' | 'sent' = 'inbox', page = 1, limit = 20) =>
    Promise.resolve({ success: true, data: { messages: [], unread_count: 0, pagination: {} } } as any),

  getUnreadCount: () =>
    Promise.resolve({ success: true, data: { unread: 0 } } as any),

  getMessage: (id: number) =>
    Promise.resolve({ success: false, data: null } as any),

  send: (data: any) =>
    Promise.resolve({ success: false, message: '' } as any),

  markRead: (id: number) =>
    Promise.resolve({ success: false } as any),

  delete: (id: number) =>
    Promise.resolve({ success: false } as any),
};

export { ApiError };

// ==================== Uploads ====================
export interface UploadedDocument {
  id: number;
  borrower_id: number;
  filename: string;
  original_name: string;
  file_type: string;
  doc_type: string;
  file_url: string;
  uploaded_at: string;
}

async function uploadRequest<T>(endpoint: string, formData: FormData): Promise<T> {
  console.log('[STUBBED API] Would have uploaded to:', endpoint);
  await new Promise(r => setTimeout(r, 100));
  return {} as T;
}

export const uploadsApi = {
  upload: (file: File, docType: string, borrowerId?: number) =>
    Promise.resolve({ success: false, data: null } as any),

  getDocuments: (borrowerId?: number) =>
    Promise.resolve({ success: true, data: [] } as any),

  getDocument: (id: number) =>
    Promise.resolve({ success: false, data: null } as any),

  deleteDocument: (id: number) =>
    Promise.resolve({ success: false } as any),
};

export const uploadCompanyLogo = async (file: File): Promise<{ success: boolean; data: { file_url: string } }> => {
  console.log('[STUBBED API] Would have uploaded logo');
  return { success: false, data: { file_url: '' } };
};

// ==================== Email / Communication ====================
export const emailApi = {
  getEmailSettings: () =>
    Promise.resolve({ success: true, data: {} } as any),

  updateEmailSettings: (smtp_host: string, smtp_port: number, smtp_user: string, smtp_pass: string, smtp_from: string) =>
    Promise.resolve({ success: false, message: '' } as any),

  testEmailSettings: () =>
    Promise.resolve({ success: false, message: '' } as any),

  sendReceipt: (loanId: number, repaymentId: number, recipientEmail: string) =>
    Promise.resolve({ success: false, message: '' } as any),

  sendInvoice: (loanId: number, recipientEmail: string) =>
    Promise.resolve({ success: false, message: '' } as any),
};
