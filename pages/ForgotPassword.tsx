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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6 animate-fade-in">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 sm:mb-10 animate-fade-in">
          <img src="/icons/icon-192.png" alt="JECRI BUREAU" className="h-28 sm:h-32 w-auto mx-auto mb-6 sm:mb-8 object-contain" />
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">JECRI BUREAU</h1>
          <p className="text-slate-300 text-sm sm:text-base mt-2 font-500">Reset your password</p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm transition-all duration-300 hover:shadow-3xl">
          <CardContent className="p-6 sm:p-8">
            {sent ? (
              <div className="text-center space-y-4 py-4">
                <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto animate-fade-in" />
                <h2 className="text-2xl font-bold">Check Your Email</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  If an account exists with <strong className="font-600">{email}</strong>, you will receive a password reset link shortly.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center text-sm font-600 text-primary hover:text-primary/80 transition-colors mt-4 gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Login
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-3">Forgot Password?</h2>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Enter your email and we'll send you a reset link.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2.5">
                    <Label htmlFor="email" className="text-sm font-600 text-foreground">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11 sm:h-12 transition-all duration-200 focus:ring-2 focus:ring-offset-0"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md font-500">{error}</p>
                  )}

                  <Button
                    type="submit"
                    className="w-full min-h-[44px] sm:min-h-[48px] text-base font-600 transition-all duration-200 mt-6"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Reset Link
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm">
                  <Link
                    to="/login"
                    className="text-muted-foreground hover:text-primary transition-colors duration-200 font-500 inline-flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back to Login
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-slate-400 text-xs mt-8 font-500">
          © 2026 JECRI BUREAU. All rights reserved.
        </p>
      </div>
    </div>
  );
}
