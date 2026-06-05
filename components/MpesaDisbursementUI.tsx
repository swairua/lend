import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Send, AlertCircle, Check } from 'lucide-react';
import { adminApi } from '@/utils/api';
import { useAlert } from '@/hooks/use-alert';

interface MpesaDisbursementUIProps {
  loanId: number;
  borrowerPhone: string;
  principalAmount: number;
  loanStatus: string;
  enabled: boolean;
  onDisbursed?: () => void;
}

export function MpesaDisbursementUI({
  loanId,
  borrowerPhone,
  principalAmount,
  loanStatus,
  enabled,
  onDisbursed,
}: MpesaDisbursementUIProps) {
  const [loading, setLoading] = useState(false);
  const [commandId, setCommandId] = useState<string | null>(null);
  const [phone, setPhone] = useState(borrowerPhone);
  const { showAlert } = useAlert();

  const isApproved = loanStatus === 'approved';

  const initiateDisbursement = async () => {
    if (!phone || phone.trim().length === 0) {
      showAlert({ type: 'error', message: 'Please enter a valid phone number' });
      return;
    }

    const confirmed = window.confirm(
      `Disburse KES ${principalAmount.toLocaleString()} to ${phone}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await adminApi.post('/admin/mpesa/disburse', {
        loan_id: loanId,
        phone: phone.trim(),
      });

      if (response.success) {
        setCommandId(response.command_id);
        showAlert({
          type: 'success',
          message: `Disbursement initiated. Amount should arrive at ${phone} within seconds.`,
        });

        // Poll for transaction status
        setTimeout(() => {
          pollDisbursementStatus(response.command_id);
        }, 3000);

        if (onDisbursed) {
          setTimeout(onDisbursed, 2000);
        }
      } else {
        showAlert({ type: 'error', message: response.error || 'Failed to initiate disbursement' });
      }
    } catch (error: any) {
      showAlert({ type: 'error', message: error.message || 'Disbursement initiation failed' });
    } finally {
      setLoading(false);
    }
  };

  const pollDisbursementStatus = async (commandId: string, maxAttempts = 8) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response: any = await adminApi.get(`/admin/mpesa/transactions?loan_id=${loanId}`);
        if (response.success && response.data.length > 0) {
          const txn = response.data.find((t: any) => t.command_id === commandId);
          if (txn && txn.status === 'disbursed') {
            showAlert({
              type: 'success',
              message: `Disbursement completed! KES ${txn.amount} sent to ${phone}.`,
            });
            return;
          }
          if (txn && txn.status === 'failed') {
            showAlert({
              type: 'error',
              message: `Disbursement failed: ${txn.response_message}`,
            });
            return;
          }
        }
      } catch (e) {
        console.error(`M-Pesa disbursement status check attempt ${i + 1} failed:`, e);
      }

      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    console.warn(`M-Pesa disbursement status polling completed without confirmation after ${maxAttempts} attempts. Command ID: ${commandId}`);
  };

  if (!enabled || !isApproved) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Send className="h-5 w-5" />
          Disburse via M-Pesa (B2C)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-blue-100 border border-blue-300 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Amount to disburse:</strong> KES {principalAmount.toLocaleString()}
          </p>
          <p className="text-xs text-blue-800 mt-1">Funds will be sent directly to borrower's M-Pesa account.</p>
        </div>

        <div>
          <label className="text-sm font-medium">Recipient Phone Number</label>
          <Input
            type="tel"
            placeholder="0712345678 or 254712345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading || commandId !== null}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">Format: 0712345678 or 254712345678</p>
        </div>

        {commandId && (
          <div className="p-3 bg-green-100 border border-green-300 rounded-lg flex items-start gap-2">
            <Check className="h-4 w-4 text-green-900 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-green-900 font-medium">Disbursement initiated!</p>
              <p className="text-xs text-green-800">Funds are being sent. They should arrive within seconds.</p>
            </div>
          </div>
        )}

        <Button
          onClick={initiateDisbursement}
          disabled={loading || commandId !== null}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="lg"
          variant={commandId ? 'outline' : 'default'}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : commandId ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Disbursement sent
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Disburse now
            </>
          )}
        </Button>

        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-yellow-800">
            Ensure the phone number matches the borrower's M-Pesa account. Incorrect numbers will fail.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
