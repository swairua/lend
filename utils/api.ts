import { secureStorage } from './secureStorage';

// Direct calls to PHP backend in BOTH dev and production.
const API_BASE = (import.meta.env.VITE_API_BASE || 'https://lending.wayrus.co.ke/api.php').replace(/\/$/, '');
const API_ORIGIN = API_BASE.replace(/\/api\.php.*$/, '');
const UPLOADS_URL = (import.meta.env.VITE_UPLOADS_URL || API_ORIGIN + '/uploads').replace(/\/$/, '');

export function getFileUrl(path: string): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const cleanPath = path.replace(/^\/?uploads\//, '').replace(/^\/+/, '');
  return `${UPLOADS_URL}/${cleanPath}`;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public payload?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

async function authHeader(): Promise<Record<string, string>> {
  try {
    const token = await secureStorage.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

function buildUrl(endpoint: string, query?: Record<string, any>): string {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${path}`;
  if (!query) return url;
  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `${url}${url.includes('?') ? '&' : '?'}${qs}` : url;
}

async function request<T = any>(
  endpoint: string,
  options: { method?: string; body?: any; query?: Record<string, any>; headers?: Record<string, string> } = {}
): Promise<T> {
  const { method = 'GET', body, query, headers = {} } = options;
  const url = buildUrl(endpoint, query);
  const auth = await authHeader();
  const init: RequestInit = {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...auth,
      ...headers,
    },
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e: any) {
    throw new ApiError(0, e?.message || 'Network error');
  }
  const text = await res.text();
  let data: any = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `HTTP ${res.status}`;
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}

async function uploadRequest<T = any>(endpoint: string, formData: FormData): Promise<T> {
  const auth = await authHeader();
  let res: Response;
  try {
    res = await fetch(buildUrl(endpoint), { method: 'POST', body: formData, headers: { Accept: 'application/json', ...auth } });
  } catch (e: any) {
    throw new ApiError(0, e?.message || 'Network error');
  }
  const text = await res.text();
  let data: any = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!res.ok) throw new ApiError(res.status, (data && (data.message || data.error)) || `HTTP ${res.status}`, data);
  return data as T;
}

const get = <T = any>(endpoint: string, query?: Record<string, any>) => request<T>(endpoint, { query });
const post = <T = any>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'POST', body });
const put = <T = any>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'PUT', body });
const patch = <T = any>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'PATCH', body });
const del = <T = any>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'DELETE', body });

async function getBlob(endpoint: string, query?: Record<string, any>): Promise<Blob> {
  const url = buildUrl(endpoint, query);
  const auth = await authHeader();
  const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/pdf', ...auth } });
  if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`);
  return res.blob();
}

// ==================== Auth ====================
export const authApi = {
  login: (email: string, password: string) => post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string; phone?: string; client_type?: 'individual' | 'corporate' }) =>
    post('/auth/register', data),
  getMe: () => get('/auth/me'),
  updateProfile: (data: any) => put('/auth/profile', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    post('/auth/change-password', { current_password: currentPassword, new_password: newPassword }),
  forgotPassword: (email: string) => post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => post('/auth/reset-password', { token, password }),
};

// ==================== Categories & Products ====================
export const productsApi = {
  getCategories: () => get('/public/categories'),
  getProducts: (categoryId?: number) => get('/public/products', { category_id: categoryId }),
  getProduct: (id: number) => get(`/public/products/${id}`),
  calculate: (productId: number, amount: number, termMonths: number) =>
    post('/public/loans/calculate', { product_id: productId, amount, term_months: termMonths }),
};

// ==================== Public (no auth) ====================
export const publicApi = {
  getSettings: () => get('/public/settings'),
};

// ==================== Loans ====================
export const loansApi = {
  apply: (data: any) => post('/borrower/loans', data),
  getMyLoans: (params?: Record<string, any>) => get('/borrower/loans', params),
  getMyLoan: (id: number) => get(`/borrower/loans/${id}`),
  getDashboard: () => get('/borrower/dashboard'),
};

// ==================== Repayments ====================
export const repaymentsApi = {
  getMyRepayments: () => get('/repayments/mine'),
  getMyReceipts: (params?: any) => get('/borrower/receipts', params),
  getMyReceiptPdf: (id: number) => getBlob(`/borrower/receipts/${id}/pdf`),
  record: (data: any) => post('/repayments', data),
};

// ==================== Admin ====================
export const adminApi = {
  getDashboard: () => get('/admin/dashboard'),
  getAnalytics: (period = 30) => get('/admin/analytics', { period }),

  getLoans: (params?: any) => get('/admin/loans', params),
  getLoan: (id: number) => get(`/admin/loans/${id}`),
  approveLoan: (id: number, approve = true, reason?: string) =>
    post(`/admin/loans/${id}/approve`, { approve, reason }),
  releaseLoan: (id: number) => post(`/admin/loans/${id}/release`),
  disburseLoan: (id: number, reference?: string) => post(`/admin/loans/${id}/disburse`, { reference }),
  markDefaulted: (id: number) => post(`/admin/loans/${id}/default`),
  reactivateLoan: (id: number) => post(`/admin/loans/${id}/reactivate`),
  createLoan: (data: any) => post('/admin/loans', data),

  getConfig: () => get('/admin/settings'),
  saveConfig: (config: any) => put('/admin/settings', config),

  getBorrowers: (params?: any) => get('/admin/borrowers', params),
  createBorrower: (data: any) => post('/admin/borrowers', data),
  updateBorrowerKYC: (id: number, data: any) => put(`/admin/borrowers/${id}/kyc`, data),
  getBorrower: (id: number) => get(`/admin/borrowers/${id}`),
  updateBorrower: (id: number, data: any) => put(`/admin/borrowers/${id}`, data),

  getCategories: () => get('/admin/categories'),
  createCategory: (data: any) => post('/admin/categories', data),
  updateCategory: (id: number, data: any) => put(`/admin/categories/${id}`, data),
  deleteCategory: (id: number) => del(`/admin/categories/${id}`),
  toggleCategory: (id: number, is_active: boolean) => patch(`/admin/categories/${id}/toggle`, { is_active }),

  getProducts: () => get('/admin/products'),
  createProduct: (data: any) => post('/admin/products', data),
  updateProduct: (id: number, data: any) => put(`/admin/products/${id}`, data),
  deleteProduct: (id: number) => del(`/admin/products/${id}`),

  getRepayments: (params?: any) => get('/admin/repayments', params),
  deleteRepayment: (id: number) => del(`/admin/repayments/${id}`),

  getUsers: () => get('/admin/users'),
  createUser: (data: any) => post('/admin/users', data),
  updateUser: (id: number, data: any) => put(`/admin/users/${id}`, data),
  deleteUser: (id: number) => del(`/admin/users/${id}`),
  toggleUser: (id: number) => patch(`/admin/users/${id}/toggle`),
  resetPassword: (id: number, password: string) => post(`/admin/users/${id}/reset-password`, { password }),

  getSettings: () => get('/admin/settings'),
  updateSetting: (key_name: string, key_value: string, description?: string) =>
    put('/admin/settings', { key_name, key_value, description }),
  bulkUpdateSettings: (settings: any) => post('/admin/settings/bulk', settings),

  getReports: (params?: any) => get('/admin/reports', params),
  exportLoans: (params?: any) => get('/admin/loans/export', params),

  getAdmins: () => get('/admin/admins'),
  createAdmin: (data: any) => post('/admin/admins', data),

  mpesaTestCredentials: (config: any) => post('/admin/mpesa/test-credentials', config),
  mpesaInitiatePayment: (loan_id: number, phone_number: string, amount?: number) =>
    post('/admin/mpesa/payment', { loan_id, phone_number, amount }),
  mpesaInitiateDisbursement: (loan_id: number, phone: string) =>
    post('/admin/mpesa/disbursement', { loan_id, phone }),
  mpesaGetTransactions: (loan_id?: number) => get('/admin/mpesa/transactions', { loan_id }),

  post: (endpoint: string, data: any) => post(endpoint, data),
  get: (endpoint: string) => get(endpoint),

  syncMpesaPayments: (loanId?: number) => post('/admin/mpesa/sync', { loan_id: loanId }),
  getOrphanedPayments: () => get('/admin/mpesa/orphaned'),

  getDisbursements: (params?: any) => get('/admin/disbursements', params),
  createDisbursement: (data: any) => post('/admin/disbursements', data),
  deleteDisbursement: (id: number) => del(`/admin/disbursements/${id}`),

  getLogs: (params?: any) => get('/admin/logs', params),
  cleanupLogs: (days: number = 90) => post('/admin/logs/cleanup', { days }),

  getInvoiceProducts: () => get('/admin/invoice-products'),
  createInvoiceProduct: (data: any) => post('/admin/invoice-products', data),
  updateInvoiceProduct: (id: number, data: any) => put(`/admin/invoice-products/${id}`, data),
  deleteInvoiceProduct: (id: number) => del(`/admin/invoice-products/${id}`),

  getCustomers: (search?: string) => get('/admin/customers', { search }),
  createCustomer: (data: any) => post('/admin/customers', data),
  updateCustomer: (id: number, data: any) => put(`/admin/customers/${id}`, data),
  deleteCustomer: (id: number) => del(`/admin/customers/${id}`),

  getQuotations: (params?: any) => get('/admin/quotations', params),
  getQuotation: (id: number) => get(`/admin/quotations/${id}`),
  createQuotation: (data: any) => post('/admin/quotations', data),
  deleteQuotation: (id: number) => del(`/admin/quotations/${id}`),
  updateQuotation: (id: number, data: any) => put(`/admin/quotations/${id}`, data),
  updateQuotationStatus: (id: number, status: string) => patch(`/admin/quotations/${id}/status`, { status }),
  convertQuotation: (id: number) => post(`/admin/quotations/${id}/convert`),

  getInvoices: (params?: any) => get('/admin/invoices', params),
  getInvoice: (id: number) => get(`/admin/invoices/${id}`),
  createInvoice: (data: any) => post('/admin/invoices', data),
  updateInvoice: (id: number, data: any) => put(`/admin/invoices/${id}`, data),
  deleteInvoice: (id: number) => del(`/admin/invoices/${id}`),
  updateInvoiceStatus: (id: number, status: string) => patch(`/admin/invoices/${id}/status`, { status }),

  getRoles: () => get('/admin/roles'),
  getRoleWithPermissions: (roleKey: string) => get(`/admin/roles/${roleKey}`),
  updateRole: (roleKey: string, data: any) => put(`/admin/roles/${roleKey}`, data),
  updateRolePermissions: (roleKey: string, permissions: any) =>
    put(`/admin/roles/${roleKey}/permissions`, { permissions }),

  // ---- Receipts ----
  getReceipts: (params?: any) => get('/admin/receipts', params),
  getReceipt: (id: number) => get(`/admin/receipts/${id}`),
  getReceiptPdf: (id: number) => getBlob(`/admin/receipts/${id}/pdf`),
  generateReceipt: (repaymentId: number) => post('/admin/receipts', { repayment_id: repaymentId }),

  // ---- Petty Cash ----
  getPettyCashAccounts: () => get('/admin/petty-cash/accounts'),
  createPettyCashAccount: (data: any) => post('/admin/petty-cash/accounts', data),
  updatePettyCashAccount: (id: number, data: any) => put(`/admin/petty-cash/accounts/${id}`, data),
  deletePettyCashAccount: (id: number) => del(`/admin/petty-cash/accounts/${id}`),
  getPettyCashTransactions: (params?: any) => get('/admin/petty-cash/transactions', params),
  createPettyCashTransaction: (data: any) => post('/admin/petty-cash/transactions', data),
  updatePettyCashTransaction: (id: number, data: any) => put(`/admin/petty-cash/transactions/${id}`, data),
  approvePettyCashTransaction: (id: number, status: string) => put(`/admin/petty-cash/transactions/${id}/approve`, { status }),
  getPettyCashCashBook: (startDate?: string, endDate?: string) => get('/admin/petty-cash/reports/cash-book', { start_date: startDate, end_date: endDate }),
  getPettyCashDailySummary: (date?: string) => get('/admin/petty-cash/reports/daily-summary', { date }),
  getPettyCashStatement: (accountId: number) => get(`/admin/petty-cash/reports/statement/${accountId}`),
};

// ==================== Messages ====================
export const messagesApi = {
  getMessages: (folder: 'inbox' | 'sent' = 'inbox', page = 1, limit = 20) =>
    get('/messages', { folder, page, limit }),
  getUnreadCount: () => get('/messages/unread-count'),
  getMessage: (id: number) => get(`/messages/${id}`),
  send: (data: any) => post('/messages', data),
  markRead: (id: number) => put(`/messages/${id}/read`),
  delete: (id: number) => del(`/messages/${id}`),
};

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

export const uploadsApi = {
  upload: (file: File, docType: string, borrowerId?: number) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('doc_type', docType);
    if (borrowerId !== undefined) fd.append('borrower_id', String(borrowerId));
    return uploadRequest('/uploads', fd);
  },
  getDocuments: (borrowerId?: number) => get('/uploads', { borrower_id: borrowerId }),
  getDocument: (id: number) => get(`/uploads/${id}`),
  deleteDocument: (id: number) => del(`/uploads/${id}`),
};

export const uploadCompanyLogo = async (file: File): Promise<{ success: boolean; data: { file_url: string } }> => {
  const fd = new FormData();
  fd.append('file', file);
  return uploadRequest('/admin/upload-logo', fd);
};

// ==================== Email ====================
export const emailApi = {
  getEmailSettings: () => get('/admin/email/settings'),
  updateEmailSettings: (smtp_host: string, smtp_port: number, smtp_user: string, smtp_pass: string, smtp_from: string) =>
    put('/admin/email/settings', { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from }),
  testEmailSettings: () => post('/admin/email/test'),
  sendReceipt: (loanId: number, repaymentId: number, recipientEmail: string) =>
    post('/admin/send-receipt', { loan_id: loanId, repayment_id: repaymentId, recipient_email: recipientEmail }),
  sendInvoice: (loanId: number, recipientEmail: string) =>
    post('/admin/send-invoice', { loan_id: loanId, recipient_email: recipientEmail }),
};

// ==================== Helpers ====================
export const formatKES = (amount: number): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const formatDate = (date: string | null): string => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
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
