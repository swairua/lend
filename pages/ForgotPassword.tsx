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
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-red-900 to-red-950 flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-32 -left-32 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 sm:mb-12 animate-fade-in">
          <img src="/icons/icon-192.png" alt="JECRI BUREAU" className="h-20 sm:h-24 w-auto mx-auto mb-4 sm:mb-6 object-contain rounded-lg backdrop-blur-sm" />
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">JECRI BUREAU</h1>
          <p className="text-red-200 text-xs sm:text-sm mt-2 font-500">Reset your password</p>
        </div>

        {/* Glassmorphic Card */}
        <div className="glass-card-primary p-8 sm:p-10 animate-fade-in">
          {sent ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="h-14 w-14 text-emerald-400 mx-auto animate-fade-in" />
              <h2 className="text-xl sm:text-2xl font-bold text-white">Check Your Email</h2>
              <p className="text-sm text-white/70 leading-relaxed">
                If an account exists with <strong className="font-600">{email}</strong>, you will receive a password reset link shortly.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center text-sm font-600 text-cyan-400 hover:text-cyan-300 transition-colors mt-6 gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl sm:text-2xl font-bold mb-4 text-white">Forgot Password?</h2>
              <p className="text-sm text-white/70 mb-8 leading-relaxed">
                Enter your email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2.5">
                  <Label htmlFor="email" className="text-sm font-600 text-white/90">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    variant="glass"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="min-h-[44px]"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-400 bg-red-500/20 border border-red-400/30 p-3 rounded-lg font-500">{error}</p>
                )}

                <Button
                  type="submit"
                  className="w-full min-h-[44px] sm:min-h-[48px] text-base font-600 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 mt-8"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>
              </form>

              <div className="mt-8 text-center text-sm">
                <Link
                  to="/login"
                  className="text-white/70 hover:text-white transition-colors duration-200 font-500 inline-flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Login
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-red-300 text-xs mt-8 font-500">
          © 2026 JECRI BUREAU. All rights reserved.
        </p>
      </div>
    </div>
  );
}
