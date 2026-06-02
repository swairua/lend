import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '../types/api';
import { secureStorage } from '../utils/secureStorage';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAlert } from '@/hooks/use-alert';

interface LoginForm {
  email: string;
  password: string;
  name: string;
  phone: string;
  client_type: 'individual' | 'corporate';
}

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<LoginForm>({
    email: '',
    password: '',
    name: '',
    phone: '',
    client_type: 'individual',
  });
  const { showAlert, AlertComponent } = useAlert();

  useEffect(() => {
    const checkAuth = async () => {
      const token = await secureStorage.getToken();
      const user = await secureStorage.getUser();
      if (token) {
        const isStaff = ['admin', 'releaser', 'manager', 'agent'].includes(user?.role);
        navigate(isStaff ? '/admin' : '/dashboard');
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;
      if (isLogin) {
        response = await authApi.login(form.email, form.password);
      } else {
        response = await authApi.register(form);
      }

      await secureStorage.setToken(response.token);
      await secureStorage.setUser(response.user);

      const isStaff = ['admin', 'releaser', 'manager', 'agent'].includes(response?.user?.role);
      navigate(isStaff ? '/admin' : '/dashboard');
    } catch (error: any) {
      showAlert({ type: 'error', message: error.message || 'Authentication failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8 p-0">
          <img src="/icons/icon-192.png" alt="JECRI BUREAU" className="h-32 w-auto mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-white">JECRI BUREAU</h1>
          <p className="text-slate-400 text-sm mt-1">Fast, transparent lending solutions</p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardContent className="p-4 sm:p-6">
            <h2 className="text-xl font-bold mb-4">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              {!isLogin && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-sm">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required={!isLogin}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Client Type</Label>
                    <div className="flex gap-4 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="radio" name="client_type" value="individual" checked={form.client_type==="individual"} onChange={()=>setForm({...form,client_type:"individual"})} className="accent-primary" /> Individual
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="radio" name="client_type" value="corporate" checked={form.client_type==="corporate"} onChange={()=>setForm({...form,client_type:"corporate"})} className="accent-primary" /> Corporate
                      </label>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-sm">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+254700000000"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="h-10"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {isLogin && (
                <div className="text-right text-sm">
                  <Link to="/forgot-password" className="text-muted-foreground hover:text-primary">Forgot Password?</Link>
                </div>
              )}

              <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}
              </span>
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="ml-1 text-primary font-medium hover:underline"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>

          </CardContent>
        </Card>

        <p className="text-center text-slate-500 text-xs mt-6">
          © 2026 JECRI BUREAU. All rights reserved.
        </p>
        </div>
        
        {/* Custom Alert */}
        {AlertComponent}
      </div>   
  );
}
