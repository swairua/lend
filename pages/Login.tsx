import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi, publicApi, getFileUrl } from '../utils/api';
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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await publicApi.getSettings();
        if (res.success && res.data) {
          const arr = Array.isArray(res.data) ? res.data :
            res.data.data ? res.data.data :
            Object.entries(res.data).map(([k, v]) => ({ key_name: k, key_value: v }));
          const settings = Object.fromEntries(arr.map((item: any) => [item.key_name, item.key_value]));
          if (settings.company_logo) setLogoUrl(getFileUrl(settings.company_logo));
        }
      } catch {}
    };
    loadSettings();
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-red-900 to-red-950 flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-32 -left-32 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Header */}
        <div className="text-center mb-8 sm:mb-12 p-0 animate-fade-in">
          <img
            src={logoUrl || '/icons/icon-192.png'}
            alt="JECRI BUREAU"
            className="h-20 sm:h-24 w-auto mx-auto mb-4 sm:mb-6 object-contain rounded-lg backdrop-blur-sm"
          />
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">JECRI BUREAU</h1>
          <p className="text-red-200 text-xs sm:text-sm mt-2 font-500">Fast, transparent lending solutions</p>
        </div>

        {/* Glassmorphic Card */}
        <div className="glass-card-primary p-8 sm:p-10 animate-fade-in">
          <h2 className="text-xl sm:text-2xl font-bold mb-8 text-white tracking-tight">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                <div className="space-y-2.5">
                  <Label htmlFor="name" className="text-sm font-600 text-white/90">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    variant="glass"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required={!isLogin}
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-600 text-white/90">Client Type</Label>
                  <div className="flex gap-4 sm:gap-6 pt-2 flex-wrap">
                    <label className="flex items-center gap-3 cursor-pointer text-sm font-500 text-white/80 hover:text-white transition-colors">
                      <input
                        type="radio"
                        name="client_type"
                        value="individual"
                        checked={form.client_type==="individual"}
                        onChange={()=>setForm({...form,client_type:"individual"})}
                        className="w-4 h-4 cursor-pointer accent-red-500"
                      />
                      Individual
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer text-sm font-500 text-white/80 hover:text-white transition-colors">
                      <input
                        type="radio"
                        name="client_type"
                        value="corporate"
                        checked={form.client_type==="corporate"}
                        onChange={()=>setForm({...form,client_type:"corporate"})}
                        className="w-4 h-4 cursor-pointer accent-red-500"
                      />
                      Corporate
                    </label>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="phone" className="text-sm font-600 text-white/90">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    variant="glass"
                    placeholder="+254700000000"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="min-h-[44px]"
                  />
                </div>
              </>
            )}

            <div className="space-y-2.5">
              <Label htmlFor="email" className="text-sm font-600 text-white/90">Email</Label>
              <Input
                id="email"
                type="email"
                variant="glass"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="password" className="text-sm font-600 text-white/90">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  variant="glass"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
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

            {isLogin && (
              <div className="text-right pt-2">
                <Link
                  to="/forgot-password"
                  className="text-xs sm:text-sm font-500 text-white/70 hover:text-white transition-colors duration-200"
                >
                  Forgot Password?
                </Link>
              </div>
            )}

            <Button
              type="submit"
              className="w-full min-h-[44px] sm:min-h-[48px] text-base font-600 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 mt-8"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm">
            <span className="text-white/70 font-500">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
            </span>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 text-cyan-400 font-600 hover:text-cyan-300 transition-colors duration-200"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>

        <p className="text-center text-red-300 text-xs mt-8 font-500">
          © 2026 JECRI BUREAU. All rights reserved.
        </p>
      </div>

      {/* Custom Alert */}
      {AlertComponent}
    </div>
  );
}
