import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Smartphone, AlertCircle, Check } from 'lucide-react';
import { adminApi } from '@/utils/api';
import { useAlert } from '@/hooks/use-alert';

interface MpesaPaymentUIProps {
  loanId: number;
  borrowerPhone: string;
  totalAmount: number;
  paidAmount: number;
  enabled: boolean;
}

export function MpesaPaymentUI({ loanId, borrowerPhone, totalAmount, paidAmount, enabled }: MpesaPaymentUIProps) {
  const [loading, setLoading] = useState(false);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [phone, setPhone] = useState(borrowerPhone);
  const { showAlert } = useAlert();

  const remainingAmount = totalAmount - paidAmount;

  const initiatePayment = async () => {
    if (!phone || phone.trim().length === 0) {
      showAlert({ type: 'error', message: 'Please enter a valid phone number' });
      return;
    }

    setLoading(true);
    try {
      const response = await adminApi.mpesaInitiatePayment(
        loanId,
        phone.trim(),
        remainingAmount
      );

      if (response.success) {
        setCheckoutId(response.checkout_request_id);
        showAlert({
          type: 'success',
          message: `STK prompt sent to ${phone}. Check your phone for the M-Pesa prompt.`,
        });

        // Poll for transaction status after 5 seconds
        setTimeout(() => {
          pollTransactionStatus(response.checkout_request_id);
        }, 5000);
      } else {
        showAlert({ type: 'error', message: response.error || 'Failed to initiate payment' });
      }
    } catch (error: any) {
      showAlert({ type: 'error', message: error.message || 'Payment initiation failed' });
    } finally {
      setLoading(false);
    }
  };

  const pollTransactionStatus = async (checkoutId: string, maxAttempts = 12) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response: any = await adminApi.get(`/admin/mpesa/transactions?loan_id=${loanId}`);
        if (response.success && response.data.length > 0) {
          const txn = response.data.find((t: any) => t.checkout_request_id === checkoutId);
          if (txn && txn.status === 'completed') {
            showAlert({
              type: 'success',
              message: `Payment successful! KES ${txn.amount} received.`,
            });
            return;
          }
        }
      } catch (e) {
        // Silent fail for polling
      }

      // Wait 5 seconds before next attempt
      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  };

  if (!enabled) {
    return null;
  }

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-900">
          <Smartphone className="h-5 w-5" />
          Pay with M-Pesa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-green-100 border border-green-300 rounded-lg">
          <p className="text-sm text-green-900">
            <strong>Amount to pay:</strong> KES {remainingAmount.toLocaleString()}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium">Phone Number (M-Pesa Account)</label>
          <Input
            type="tel"
            placeholder="0712345678 or 254712345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading || checkoutId !== null}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">Format: 0712345678 or 254712345678</p>
        </div>

        {checkoutId && (
          <div className="p-3 bg-blue-100 border border-blue-300 rounded-lg flex items-start gap-2">
            <Check className="h-4 w-4 text-blue-900 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-900 font-medium">STK prompt sent!</p>
              <p className="text-xs text-blue-800">Check your phone for the M-Pesa popup. Enter your PIN to confirm payment.</p>
              <p className="text-xs text-blue-800 mt-1">If you don't see the popup, try again in a moment.</p>
            </div>
          </div>
        )}

        <Button
          onClick={initiatePayment}
          disabled={loading || !remainingAmount || checkoutId !== null}
          className="w-full bg-green-600 hover:bg-green-700"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending prompt...
            </>
          ) : checkoutId ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Prompt sent
            </>
          ) : (
            <>
              <Smartphone className="h-4 w-4 mr-2" />
              Send M-Pesa Prompt
            </>
          )}
        </Button>

        {remainingAmount <= 0 && (
          <div className="p-3 bg-gray-100 border border-gray-300 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700">No outstanding balance on this loan.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
