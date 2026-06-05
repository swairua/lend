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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/icons/icon-192.png" alt="JECRI BUREAU" className="h-32 w-auto mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-white">JECRI BUREAU</h1>
          <p className="text-slate-400 text-sm mt-1">Set a new password</p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardContent className="p-4 sm:p-6">
            {!token ? (
              <div className="text-center space-y-4 py-4">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                <h2 className="text-xl font-bold">Invalid Link</h2>
                <p className="text-sm text-muted-foreground">
                  This password reset link is invalid. Please request a new one.
                </p>
                <Link to="/forgot-password" className="text-primary hover:underline text-sm">
                  Request new reset link
                </Link>
              </div>
            ) : done ? (
              <div className="text-center space-y-4 py-4">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                <h2 className="text-xl font-bold">Password Reset</h2>
                <p className="text-sm text-muted-foreground">
                  Your password has been successfully reset.
                </p>
                <Link to="/login" className="inline-flex items-center text-sm text-primary hover:underline mt-2">
                  Sign in with new password
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-4">Reset Password</h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm">New Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Minimum 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="h-10 pr-10"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-sm">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Repeat password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        className="h-10 pr-10"
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {error && <p className="text-sm text-red-500">{error}</p>}

                  <Button type="submit" className="w-full h-10" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Reset Password
                  </Button>
                </form>
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
