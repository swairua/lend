import { Label } from '@/components/ui/label';
import { formatKES } from '@/utils/api';

interface LoanAmountTermSelectorProps {
  product: any;
  amount: number;
  termMonths: number;
  onAmountChange: (amount: number) => void;
  onTermChange: (term: number) => void;
}

export function LoanAmountTermSelector({
  product,
  amount,
  termMonths,
  onAmountChange,
  onTermChange,
}: LoanAmountTermSelectorProps) {
  if (!product) return null;

  return (
    <>
      {/* Amount */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Loan Amount</Label>
          <span className="text-lg font-bold text-primary">{formatKES(amount)}</span>
        </div>
        <input
          type="range"
          min={product.min_amount}
          max={product.max_amount}
          step={1000}
          value={amount}
          onChange={(e) => onAmountChange(parseInt(e.target.value))}
          className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
          aria-label="Loan amount slider"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatKES(product.min_amount)}</span>
          <span>{formatKES(product.max_amount)}</span>
        </div>
      </div>

      {/* Term */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Loan Term</Label>
          <span className="text-lg font-bold text-primary">
            {termMonths} month{termMonths > 1 ? 's' : ''}
          </span>
        </div>
        <input
          type="range"
          min={product.min_term_months || 1}
          max={product.max_term_months || 60}
          step={1}
          value={termMonths}
          onChange={(e) => onTermChange(parseInt(e.target.value))}
          className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
          aria-label="Loan term slider"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{product.min_term_months || 1} month</span>
          <span>{product.max_term_months || 60} months</span>
        </div>
      </div>
    </>
  );
}
