import { User, Loan, LoanProduct, LoanCategory, Repayment, DashboardStats } from '../types/api';

const API_BASE = '/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  
  const token = localStorage.getItem('token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(response.status, data.error || 'Request failed');
    }

    return data;
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

// ==================== Auth ====================
export const authApi = {
  login: (email: string, password: string) =>
    request<{ success: boolean; user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (data: { email: string; password: string; name: string; phone?: string }) =>
    request<{ success: boolean; user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: () => request<{ success: boolean; user: User }>('/auth/me'),

  updateProfile: (data: { name?: string; phone?: string }) =>
    request<{ success: boolean; user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// ==================== Categories & Products ====================
export const productsApi = {
  getCategories: async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch('/api/categories', { signal: controller.signal });
      clearTimeout(timeout);
      const data = await res.json();
      return data;
    } catch (e) {
      clearTimeout(timeout);
      throw e;
    }
  },
  
  getProducts: (categoryId?: number) => {
    const query = categoryId ? `?category_id=${categoryId}` : '';
    return request<{ success: boolean; data: LoanProduct[] }>(`/products${query}`);
  },

  getProduct: (id: number) =>
    request<{ success: boolean; data: LoanProduct }>(`/products/${id}`),

  calculate: (productId: number, amount: number, termMonths: number) =>
    request<{
      success: boolean;
      data: {
        principal: number;
        interest: number;
        processing_fee: number;
        asset_transfer_fee: number;
        tracking_system_fee: number;
        total_amount: number;
        monthly_payment: number;
      };
    }>('/loans/calculate', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, amount, term_months: termMonths }),
    }),
};

// ==================== Loans ====================
export const loansApi = {
  apply: (data: {
    product_id: number;
    amount: number;
    term_months: number;
    security_details?: string;
    guarantor_details?: string;
    postdated_check_no?: string;
    logbook_no?: string;
    asset_description?: string;
    asset_value?: number;
  }) =>
    request<{ success: boolean; message: string; data: { id: number } }>('/loans', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMyLoans: () =>
    request<{ success: boolean; data: Loan[] }>('/borrower/loans'),

  getMyLoan: (id: number) =>
    request<{ success: boolean; data: Loan & { repayments: Repayment[]; total_paid: number; balance: number } }>(
      `/borrower/loans/${id}`
    ),

  getDashboard: () =>
    request<{
      success: boolean;
      data: {
        active_loans: number;
        pending_loans: number;
        total_borrowed: number;
        total_paid: number;
        credit_score: number;
        recent_loans: Loan[];
      };
    }>('/borrower/dashboard'),
};

// ==================== Repayments ====================
export const repaymentsApi = {
  getMyRepayments: () =>
    request<{ success: boolean; data: Repayment[] }>('/borrower/repayments'),

  record: (data: {
    loan_id: number;
    amount: number;
    principal_paid?: number;
    interest_paid?: number;
    payment_method: string;
    reference_number?: string;
  }) =>
    request<{ success: boolean; message: string }>('/repayments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ==================== Admin ====================
export const adminApi = {
  getDashboard: () =>
    request<{ success: boolean; data: DashboardStats }>('/admin/dashboard'),

  getAnalytics: (period = 30) =>
    request<{ success: boolean; data: any }>(`/admin/analytics?period=${period}`),

  getLoans: (params?: { status?: string; category_id?: number; page?: number; limit?: number }) => {
    const filtered = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== ''));
    const query = new URLSearchParams(filtered as any).toString();
    return request<{ success: boolean; data: { loans: Loan[]; pagination: any } }>(
      `/admin/loans${query ? `?${query}` : ''}`
    );
  },

  getLoan: (id: number) =>
    request<{ success: boolean; data: any }>(`/admin/loans/${id}`),

  approveLoan: (id: number, approve = true, reason?: string) =>
    request<{ success: boolean; message: string }>(`/admin/loans/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approve, reason }),
    }),

  disburseLoan: (id: number, reference?: string) =>
    request<{ success: boolean; message: string }>(`/admin/loans/${id}/disburse`, {
      method: 'POST',
      body: JSON.stringify({ reference }),
    }),

  markDefaulted: (id: number) =>
    request<{ success: boolean; message: string }>(`/admin/loans/${id}/default`, {
      method: 'POST',
    }),

  reactivateLoan: (id: number) =>
    request<{ success: boolean; message: string }>(`/admin/loans/${id}/reactivate`, {
      method: 'POST',
    }),

  getConfig: () =>
    request<{ success: boolean; data: any[] }>('/admin/settings'),

  saveConfig: (config: any) =>
    request<{ success: boolean; message: string }>('/admin/settings/bulk', {
      method: 'POST',
      body: JSON.stringify({
        settings: Object.entries(config).map(([key_name, key_value]) => ({ key_name, key_value: String(key_value), description: '' }))
      }),
    }),

  getBorrowers: (params?: { search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ success: boolean; data: { borrowers: any[]; pagination: any } }>(
      `/admin/borrowers${query ? `?${query}` : ''}`
    );
  },

  getBorrower: (id: number) =>
    request<{ success: boolean; data: any }>(`/admin/borrowers/${id}`),

  updateBorrower: (id: number, data: any) =>
    request<{ success: boolean; message: string }>(`/admin/borrowers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getCategories: () =>
    request<{ success: boolean; data: any[] }>('/admin/categories'),

  createCategory: (data: { name: string; code: string; description?: string; is_active?: boolean }) =>
    request<{ success: boolean; data: { id: number } }>('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCategory: (id: number, data: { name?: string; code?: string; description?: string; is_active?: boolean }) =>
    request<{ success: boolean }>(`/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteCategory: (id: number) =>
    request<{ success: boolean }>(`/admin/categories/${id}`, {
      method: 'DELETE',
    }),

  toggleCategory: (id: number, is_active: boolean) =>
    request<{ success: boolean }>(`/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ is_active }),
    }),

  getProducts: () =>
    request<{ success: boolean; data: LoanProduct[] }>('/admin/products'),

  createProduct: (data: Partial<LoanProduct>) =>
    request<{ success: boolean; data: { id: number } }>('/admin/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProduct: (id: number, data: Partial<LoanProduct>) =>
    request<{ success: boolean }>(`/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteProduct: (id: number) =>
    request<{ success: boolean }>(`/admin/products/${id}`, {
      method: 'DELETE',
    }),

  getRepayments: (params?: { loan_id?: number; page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ success: boolean; data: any[] }>(
      `/admin/repayments${query ? `?${query}` : ''}`
    );
  },

  deleteRepayment: (id: number) =>
    request<{ success: boolean }>(`/admin/repayments/${id}`, {
      method: 'DELETE',
    }),

  getUsers: () =>
    request<{ success: boolean; data: { users: any[] } }>('/admin/users'),

  createUser: (data: { name: string; email: string; phone?: string; role: string; password: string }) =>
    request<{ success: boolean; data: { id: number } }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateUser: (id: number, data: { name?: string; phone?: string; role?: string; password?: string }) =>
    request<{ success: boolean }>(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteUser: (id: number) =>
    request<{ success: boolean }>(`/admin/users/${id}`, {
      method: 'DELETE',
    }),

  toggleUser: (id: number) =>
    request<{ success: boolean }>(`/admin/users/${id}/toggle`, {
      method: 'POST',
    }),

  getSettings: () =>
    request<{ success: boolean; data: any[] }>('/admin/settings'),

  updateSetting: (key_name: string, key_value: string, description?: string) =>
    request<{ success: boolean }>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ key_name, key_value, description }),
    }),

  bulkUpdateSettings: (settings: { key_name: string; key_value: string; description?: string }[]) =>
    request<{ success: boolean }>('/admin/settings/bulk', {
      method: 'POST',
      body: JSON.stringify({ settings }),
    }),

  getReports: (params?: { type?: string; start_date?: string; end_date?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ success: boolean; data: any }>(
      `/admin/reports${query ? `?${query}` : ''}`
    );
  },

  exportLoans: (params?: { status?: string; start_date?: string; end_date?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ success: boolean; data: Loan[] }>(
      `/admin/export/loans${query ? `?${query}` : ''}`
    );
  },

  getAdmins: () =>
    request<{ success: boolean; data: any[] }>('/admin/admins'),

  createAdmin: (data: { email: string; password: string; name: string; phone?: string }) =>
    request<{ success: boolean; data: { id: number } }>('/admin/admins', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
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
    pending: 'bg-yellow-500/10 text-yellow-600',
    approved: 'bg-blue-500/10 text-blue-600',
    rejected: 'bg-red-500/10 text-red-600',
    active: 'bg-green-500/10 text-green-600',
    disbursed: 'bg-green-500/10 text-green-600',
    completed: 'bg-gray-500/10 text-gray-600',
    defaulted: 'bg-red-500/10 text-red-600',
    written_off: 'bg-purple-500/10 text-purple-600',
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
    request<{ success: boolean; data: { messages: Message[]; unread_count: number; pagination: any } }>(
      `/messages?folder=${folder}&page=${page}&limit=${limit}`
    ),

  getUnreadCount: () =>
    request<{ success: boolean; data: { unread: number } }>('/messages/unread'),

  getMessage: (id: number) =>
    request<{ success: boolean; data: Message }>(`/messages/${id}`),

  send: (data: { recipient_id: number; loan_id?: number; subject: string; message: string; type?: string }) =>
    request<{ success: boolean; message: string }>('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  markRead: (id: number) =>
    request<{ success: boolean }>(`/messages/${id}/read`, { method: 'PUT' }),

  delete: (id: number) =>
    request<{ success: boolean }>(`/messages/${id}`, { method: 'DELETE' }),
};

export { ApiError };