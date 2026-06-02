import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '../types/api';
import { Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/icons/icon-192.png" alt="JECRI BUREAU" className="h-32 w-auto mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-white">JECRI BUREAU</h1>
          <p className="text-slate-400 text-sm mt-1">Reset your password</p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardContent className="p-4 sm:p-6">
            {sent ? (
              <div className="text-center space-y-4 py-4">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                <h2 className="text-xl font-bold">Check Your Email</h2>
                <p className="text-sm text-muted-foreground">
                  If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
                </p>
                <Link to="/login" className="inline-flex items-center text-sm text-primary hover:underline mt-2">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back to Login
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-2">Forgot Password?</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Enter your email and we'll send you a reset link.
                </p>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-10"
                    />
                  </div>

                  {error && <p className="text-sm text-red-500">{error}</p>}

                  <Button type="submit" className="w-full h-10" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Reset Link
                  </Button>
                </form>

                <div className="mt-4 text-center text-sm">
                  <Link to="/login" className="text-primary hover:underline inline-flex items-center">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Login
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-slate-500 text-xs mt-6">
          &copy; 2026 JECRI BUREAU. All rights reserved.
        </p>
      </div>
    </div>
  );
}
