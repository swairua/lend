import { getStatusColor, getStatusLabel } from './api';

interface Loan {
  id: number;
  status: string;
  product_name?: string;
  category_name?: string;
  principal_amount: number;
  due_date?: string;
  created_at?: string;
}

export function getLoanStatusLabel(status: string): string {
  return getStatusLabel(status);
}

export function getLoanStatusColor(status: string): string {
  return getStatusColor(status);
}

export function isActiveLoan(loan: Loan): boolean {
  return loan.status === 'active' || loan.status === 'approved';
}

export function isPendingLoan(loan: Loan): boolean {
  return loan.status === 'pending';
}

export function isCompletedLoan(loan: Loan): boolean {
  return loan.status === 'completed' || loan.status === 'paid_off';
}

export function filterLoansByStatus(loans: Loan[], status: string | 'all'): Loan[] {
  if (status === 'all') return loans;
  if (status === 'active') return loans.filter(isActiveLoan);
  if (status === 'pending') return loans.filter(isPendingLoan);
  if (status === 'completed') return loans.filter(isCompletedLoan);
  return loans.filter(l => l.status === status);
}

export function sortLoansByDate(loans: Loan[], order: 'asc' | 'desc' = 'desc'): Loan[] {
  return [...loans].sort((a, b) => {
    const dateA = new Date(a.due_date || 0).getTime();
    const dateB = new Date(b.due_date || 0).getTime();
    return order === 'desc' ? dateB - dateA : dateA - dateB;
  });
}
