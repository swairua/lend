export interface User {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: 'admin' | 'borrower' | 'releaser' | 'manager' | 'agent';
  client_type?: 'individual' | 'corporate';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Borrower {
  id: number;
  user_id: number;
  national_id: string | null;
  address: string | null;
  business_name: string | null;
  business_type: string | null;
  monthly_income: number | null;
  credit_score: number;
  kra_pin?: string | null;
  tcc_number?: string | null;
  client_type?: string | null;
  is_verified?: boolean;
}

export interface LoanProduct {
  id: number;
  category_id: number | null;
  name: string;
  description: string | null;
  min_amount: number;
  max_amount: number;
  min_term_months: number;
  max_term_months: number;
  interest_rate: number;
  interest_type: 'flat' | 'reducing';
  processing_fee_percent: number;
  asset_transfer_fee: number;
  tracking_system_fee: number;
  late_fee_percent: number;
  requires_security: boolean;
  requires_guarantor: boolean;
  requires_postdated_checks: boolean;
  min_income: number;
  is_active: boolean;
}

export interface Loan {
  id: number;
  borrower_id: number;
  product_id: number;
  principal_amount: number;
  interest_amount: number;
  processing_fee: number;
  asset_transfer_fee: number;
  tracking_system_fee: number;
  late_fee_rate: number;
  total_amount: number;
  term_months: number;
  status: 'pending' | 'approved' | 'released' | 'rejected' | 'active' | 'completed' | 'defaulted' | 'written_off';
  approved_by: number | null;
  approved_at: string | null;
  released_by: number | null;
  released_at: string | null;
  disbursed_at: string | null;
  due_date: string | null;
  security_details: string | null;
  guarantor_details: string | null;
  postdated_check_no: string | null;
  logbook_no: string | null;
  asset_description: string | null;
  asset_value: number | null;
  created_at: string;
  updated_at: string;
  borrower_name?: string;
  borrower_email?: string;
  borrower_phone?: string;
  product_name?: string;
  category_name?: string;
  total_paid?: number;
  balance?: number;
}

export interface LoanCategory {
  id: number;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
}

export interface LoanApplication {
  product_id: number;
  amount: number;
  term_months: number;
  purpose?: string;
  security_details?: string;
  guarantor_details?: string;
  postdated_check_no?: string;
  logbook_no?: string;
  asset_description?: string;
  asset_value?: number;
}

export interface LoanWithDetails extends Loan {
  borrower?: User;
  product?: LoanProduct;
  repayments?: Repayment[];
  total_paid?: number;
  balance?: number;
}

export interface Repayment {
  id: number;
  loan_id: number;
  amount: number;
  principal_paid: number;
  interest_paid: number;
  penalty_paid: number;
  payment_method: 'cash' | 'mpesa' | 'bank' | 'other';
  reference_number: string | null;
  paid_by: number | null;
  paid_at: string;
  payment_status?: 'applied' | 'pending' | 'unreconciled';
}

export interface Payment {
  id: number;
  loan_id: number;
  type: 'disbursement' | 'repayment' | 'refund';
  amount: number;
  method: 'cash' | 'mpesa' | 'bank' | 'other';
  reference: string | null;
  status: 'pending' | 'completed' | 'failed';
  processed_at: string;
}

export interface Setting {
  id: number;
  key_name: string;
  key_value: string | null;
  description: string | null;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface DashboardStats {
  total_borrowers: number;
  total_loans: number;
  active_loans: number;
  pending_loans: number;
  total_disbursed: number;
  total_collected: number;
  default_rate: number;
  approval_rate: number;
  monthly_disbursements?: Array<{month: string; count: number; total: number}>;
  category_distribution?: Array<{category: string; count: number; percentage: number}>;
  recent_loans?: Loan[];
  recent_repayments?: (Repayment & { borrower_name: string })[];
  changes?: {
    borrowers: number;
    loans: number;
    active_loans: number;
    disbursed: number;
    collected: number;
  };
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceProduct {
  id: number;
  name: string;
  description: string;
  unit_price: number;
  tax_rate: number;
  unit_type: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface QuotationItem {
  id: number;
  quotation_id: number;
  invoice_product_id: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
  product_name?: string;
}

export interface Quotation {
  id: number;
  quote_number: string;
  customer_id: number | null;
  customer_name?: string;
  customer_company?: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  quote_date: string;
  expiry_date: string;
  subtotal: number;
  tax_total: number;
  discount: number;
  grand_total: number;
  notes: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  items?: QuotationItem[];
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  invoice_product_id: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
  product_name?: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  quotation_id: number | null;
  quote_number?: string;
  customer_id: number | null;
  customer_name?: string;
  customer_company?: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_total: number;
  discount: number;
  grand_total: number;
  notes: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
}

// Re-export API functions from utils for backwards compatibility
export {
  authApi,
  productsApi,
  loansApi,
  repaymentsApi,
  adminApi,
  messagesApi,
  emailApi,
  formatKES,
  formatDate,
  getStatusColor,
  getStatusLabel,
  ApiError
} from '../utils/api';
