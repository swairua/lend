import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '../types/api';
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!token) setError('Invalid reset link. No token provided.');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token!, password);
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-32 -left-32 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 sm:mb-12 animate-fade-in">
          <img src="/icons/icon-192.png" alt="JECRI BUREAU" className="h-20 sm:h-24 w-auto mx-auto mb-4 sm:mb-6 object-contain rounded-lg backdrop-blur-sm" />
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">JECRI BUREAU</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-2 font-500">Set a new password</p>
        </div>

        {/* Glassmorphic Card */}
        <div className="glass-card-primary p-8 sm:p-10 animate-fade-in">
          {!token ? (
            <div className="text-center space-y-4 py-4">
              <AlertCircle className="h-14 w-14 text-red-400 mx-auto" />
              <h2 className="text-xl sm:text-2xl font-bold text-white">Invalid Link</h2>
              <p className="text-sm text-white/70 leading-relaxed">
                This password reset link is invalid. Please request a new one.
              </p>
              <Link
                to="/forgot-password"
                className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-600 inline-block mt-6"
              >
                Request new reset link
              </Link>
            </div>
          ) : done ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="h-14 w-14 text-emerald-400 mx-auto animate-fade-in" />
              <h2 className="text-xl sm:text-2xl font-bold text-white">Password Reset</h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Your password has been successfully reset.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center text-sm font-600 text-cyan-400 hover:text-cyan-300 transition-colors mt-6 gap-2"
              >
                Sign in with new password
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl sm:text-2xl font-bold mb-8 text-white">Reset Password</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2.5">
                  <Label htmlFor="password" className="text-sm font-600 text-white/90">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      variant="glass"
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="min-h-[44px] pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-md"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="confirmPassword" className="text-sm font-600 text-white/90">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      variant="glass"
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="min-h-[44px] pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-md"
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
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
                  Reset Password
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-slate-500 text-xs mt-8 font-500">
          © 2026 JECRI BUREAU. All rights reserved.
        </p>
      </div>
    </div>
  );
}
