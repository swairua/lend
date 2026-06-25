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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6 animate-fade-in">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8 sm:mb-10 p-0 animate-fade-in">
          <img
            src={logoUrl || '/icons/icon-192.png'}
            alt="JECRI BUREAU"
            className="h-28 sm:h-32 w-auto mx-auto mb-6 sm:mb-8 object-contain"
          />
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">JECRI BUREAU</h1>
          <p className="text-slate-300 text-sm sm:text-base mt-2 font-500">Fast, transparent lending solutions</p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm transition-all duration-300 hover:shadow-3xl">
          <CardContent className="p-6 sm:p-8">
            <h2 className="text-2xl sm:text-2xl font-bold mb-6 text-foreground tracking-tight">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <>
                  <div className="space-y-2.5">
                    <Label htmlFor="name" className="text-sm font-600 text-foreground">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required={!isLogin}
                      className="h-11 sm:h-12 transition-all duration-200 focus:ring-2 focus:ring-offset-0"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-sm font-600 text-foreground">Client Type</Label>
                    <div className="flex gap-6 pt-1">
                      <label className="flex items-center gap-3 cursor-pointer text-sm font-500 hover:text-primary transition-colors">
                        <input
                          type="radio"
                          name="client_type"
                          value="individual"
                          checked={form.client_type==="individual"}
                          onChange={()=>setForm({...form,client_type:"individual"})}
                          className="w-5 h-5 accent-primary cursor-pointer"
                        />
                        Individual
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer text-sm font-500 hover:text-primary transition-colors">
                        <input
                          type="radio"
                          name="client_type"
                          value="corporate"
                          checked={form.client_type==="corporate"}
                          onChange={()=>setForm({...form,client_type:"corporate"})}
                          className="w-5 h-5 accent-primary cursor-pointer"
                        />
                        Corporate
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="phone" className="text-sm font-600 text-foreground">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+254700000000"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="h-11 sm:h-12 transition-all duration-200 focus:ring-2 focus:ring-offset-0"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-sm font-600 text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="h-11 sm:h-12 transition-all duration-200 focus:ring-2 focus:ring-offset-0"
                />
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="password" className="text-sm font-600 text-foreground">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
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

              {isLogin && (
                <div className="text-right pt-1">
                  <Link
                    to="/forgot-password"
                    className="text-sm font-500 text-muted-foreground hover:text-primary transition-colors duration-200"
                  >
                    Forgot Password?
                  </Link>
                </div>
              )}

              <Button
                type="submit"
                className="w-full min-h-[44px] sm:min-h-[48px] text-base font-600 transition-all duration-200 mt-6"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground font-500">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}
              </span>
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-primary font-600 hover:underline transition-colors duration-200"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>

          </CardContent>
        </Card>

        <p className="text-center text-slate-400 text-xs mt-8 font-500">
          © 2026 JECRI BUREAU. All rights reserved.
        </p>
        </div>

        {/* Custom Alert */}
        {AlertComponent}
      </div>
  );
}
