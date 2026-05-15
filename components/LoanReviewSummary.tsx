import { Loader2, AlertCircle } from 'lucide-react';
import { formatKES } from '@/utils/api';

interface LoanReviewSummaryProps {
  product: any;
  amount: number;
  termMonths: number;
  calculating: boolean;
  estimate: any;
  estimateError: string;
  apr: number | null;
}

export function LoanReviewSummary({
  product,
  amount,
  termMonths,
  calculating,
  estimate,
  estimateError,
  apr,
}: LoanReviewSummaryProps) {
  const summaryRows = [
    { label: 'Principal Amount', value: formatKES(amount), bold: false },
    { label: 'Interest Rate', value: `${product?.interest_rate || 0}% p.a.`, bold: false },
    {
      label: 'Annual Percentage Rate (APR)',
      value: apr !== null ? `${apr.toFixed(2)}%` : '—',
      bold: true,
      highlight: true,
    },
    { label: 'Loan Term', value: `${termMonths} months`, bold: false },
    { label: 'Interest Amount', value: estimate ? formatKES(estimate.interest || 0) : '—', bold: false },
    { label: 'Processing Fee', value: estimate ? formatKES(estimate.processing_fee || 0) : '—', bold: false },
    { label: 'Monthly Payment', value: estimate ? formatKES(estimate.monthly_payment || 0) : '—', bold: true },
    { label: 'Total Repayable', value: estimate ? formatKES(estimate.total_amount || amount) : formatKES(amount), bold: true },
  ];

  return (
    <div className="space-y-3">
      {calculating && (
        <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Calculating loan details...
        </div>
      )}
      {estimateError && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-yellow-800">Could not load exact estimate</p>
            <p className="text-yellow-700 text-xs">{estimateError}</p>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {summaryRows.map((row) => (
          <div
            key={row.label}
            className={`flex justify-between text-sm ${row.bold ? 'font-bold border-t pt-2' : ''} ${
              row.highlight ? 'bg-blue-50 -mx-3 px-3 py-2 rounded' : ''
            }`}
          >
            <span className={row.bold ? '' : 'text-muted-foreground'}>{row.label}</span>
            <span className={row.highlight ? 'text-blue-700 font-bold' : ''}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
