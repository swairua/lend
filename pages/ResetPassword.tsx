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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6 animate-fade-in">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 sm:mb-10 animate-fade-in">
          <img src="/icons/icon-192.png" alt="JECRI BUREAU" className="h-28 sm:h-32 w-auto mx-auto mb-6 sm:mb-8 object-contain" />
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">JECRI BUREAU</h1>
          <p className="text-slate-300 text-sm sm:text-base mt-2 font-500">Set a new password</p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm transition-all duration-300 hover:shadow-3xl">
          <CardContent className="p-6 sm:p-8">
            {!token ? (
              <div className="text-center space-y-4 py-4">
                <AlertCircle className="h-14 w-14 text-red-500 mx-auto" />
                <h2 className="text-2xl font-bold">Invalid Link</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This password reset link is invalid. Please request a new one.
                </p>
                <Link
                  to="/forgot-password"
                  className="text-primary hover:text-primary/80 transition-colors text-sm font-600 inline-block mt-4"
                >
                  Request new reset link
                </Link>
              </div>
            ) : done ? (
              <div className="text-center space-y-4 py-4">
                <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto animate-fade-in" />
                <h2 className="text-2xl font-bold">Password Reset</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your password has been successfully reset.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center text-sm font-600 text-primary hover:text-primary/80 transition-colors mt-4 gap-2"
                >
                  Sign in with new password
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-6">Reset Password</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2.5">
                    <Label htmlFor="password" className="text-sm font-600 text-foreground">New Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Minimum 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="h-11 sm:h-12 pr-12 transition-all duration-200 focus:ring-2 focus:ring-offset-0"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-slate-100 rounded-md"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label htmlFor="confirmPassword" className="text-sm font-600 text-foreground">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Repeat password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        className="h-11 sm:h-12 pr-12 transition-all duration-200 focus:ring-2 focus:ring-offset-0"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-slate-100 rounded-md"
                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                      >
                        {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
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
                    Reset Password
                  </Button>
                </form>
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
