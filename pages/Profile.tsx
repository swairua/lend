import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ProfilePhoto from "../components/ProfilePhoto";
import DocumentsPanel from "../components/DocumentsPanel";
import { authApi, loansApi, formatKES, formatDate } from '../types/api';
import { Loader2, User, Mail, Phone, Home, Briefcase, Banknote, ArrowLeft, Save, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
}

interface BorrowerProfile {
  national_id: string;
  address: string;
  business_name: string;
  business_type: string;
  monthly_income: number;
  credit_score: number;
}

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [borrower, setBorrower] = useState<BorrowerProfile | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  
  const [form, setForm] = useState({
    client_type: "",
    kra_pin: "",
    tcc_number: "",
    name: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    national_id: '',
    address: '',
    business_name: '',
    business_type: '',
    monthly_income: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || !storedUser.id) {
      navigate('/login');
      return;
    }

    setUser(storedUser);
    // Initialize form with localStorage user data
    setForm((prev) => ({
      ...prev,
      name: storedUser.name || '',
      phone: storedUser.phone || '',
    }));
    loadProfile();
  }, [navigate]);

  const loadProfile = async () => {
    try {
      const response: any = await authApi.getMe();
      // API returns user data in response.data or response.user
      const userData: any = response?.data || response?.user;

      if (userData) {
        setForm((prev) => ({
          ...prev,
          name: userData.name || prev.name || '',
          phone: userData.phone || prev.phone || '',
          national_id: userData.national_id || '',
          address: userData.address || '',
          business_name: userData.business_name || '',
          business_type: userData.business_type || '',
          monthly_income: userData.monthly_income || '',
        }));

        // Load saved profile photo from server (if field exists)
        if (userData?.photo_url) {
          setPhotoUrl(userData.photo_url);
        }

        if (userData.borrower) {
          setBorrower(userData.borrower);
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      // Form already has initial data from localStorage
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await authApi.updateProfile({
        name: form.name,
        phone: form.phone,
        photo_url: photoUrl || undefined,
        address: form.address || undefined,
        business_name: form.business_name || undefined,
        business_type: form.business_type || undefined,
        monthly_income: form.monthly_income ? Number(form.monthly_income) : undefined,
        national_id: form.national_id || undefined,
        kra_pin: form.kra_pin || undefined,
        tcc_number: form.tcc_number || undefined,
      });

      localStorage.setItem('user', JSON.stringify({
        ...user,
        name: form.name,
        phone: form.phone,
        photo_url: photoUrl,
      }));

      toast({ title: 'Profile updated successfully' });
    } catch (error: any) {
      toast({ title: error.message || 'Failed to update profile', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (form.newPassword !== form.confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    
    if (form.newPassword.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    
    setSaving(true);
    
    try {
      await authApi.changePassword(form.currentPassword, form.newPassword);
      toast({ title: 'Password changed successfully' });
      setForm({ ...form, currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast({ title: error.message || 'Failed to change password', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-2xl">
      <div className="flex items-center gap-2 mb-6 min-w-0">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base sm:text-lg md:text-2xl lg:text-3xl font-bold truncate">My Profile</h1>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Profile Photo */}
        <div className="flex justify-center mb-2">
          <ProfilePhoto
            name={user?.name}
            currentUrl={photoUrl}
            borrowerId={user?.id}
            onUploaded={(url) => setPhotoUrl(url)}
          />
        </div>
        {/* Client Type Badge */}
        <div className="flex items-center gap-3 mb-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Account Type:</span>
            <span className={"inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold " + (form.client_type==="corporate" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800")}>
              {form.client_type==="corporate" ? "Corporate" : "Individual"}
            </span>
          </div>
          {user?.role==="borrower" && (
            <span className="text-xs text-muted-foreground ml-auto">Contact admin to change</span>
          )}
        </div>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your full name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Contact admin to change email</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+254 700 000000"
              />
            </div>
          </CardContent>
        </Card>

        {/* Borrower Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Business Information
            </CardTitle>
            <CardDescription>Your loan application details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* KYC Fields */}
            <div className="space-y-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">KYC Information</p>
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="national_id" className="text-xs text-muted-foreground">National ID / Passport *</Label>
                  <Input
                    id="national_id"
                    value={form.national_id}
                    onChange={(e) => setForm({ ...form, national_id: e.target.value })}
                    placeholder="Enter your ID number"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="kra_pin" className="text-xs text-muted-foreground">KRA PIN *</Label>
                  <Input
                    id="kra_pin"
                    value={form.kra_pin}
                    onChange={(e) => setForm({ ...form, kra_pin: e.target.value })}
                    placeholder="Enter your KRA PIN"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tcc_number" className="text-xs text-muted-foreground">TCC Number * (Renewed Annually)</Label>
                  <Input
                    id="tcc_number"
                    value={form.tcc_number}
                    onChange={(e) => setForm({ ...form, tcc_number: e.target.value })}
                    placeholder="Enter your TCC number"
                    className="text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-blue-700">Please provide accurate KYC information. Admin will verify these details.</p>
            </div>

            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Your physical address"
                className="min-h-[80px]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name</Label>
              <Input
                id="business_name"
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                placeholder="Your business name (if any)"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_type">Business Type</Label>
                <Input
                  id="business_type"
                  value={form.business_type}
                  onChange={(e) => setForm({ ...form, business_type: e.target.value })}
                  placeholder="e.g., Retail, Services"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="monthly_income">Monthly Income (KES)</Label>
                <Input
                  id="monthly_income"
                  type="number"
                  value={form.monthly_income}
                  onChange={(e) => setForm({ ...form, monthly_income: e.target.value })}
                  placeholder="50000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credit Score */}
        {borrower?.credit_score && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Credit Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <div className="text-4xl font-bold text-primary">{borrower.credit_score}</div>
                <p className="text-sm text-muted-foreground">Your credit score</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Button type="submit" className="w-full" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </form>


      {/* Documents Section */}
      <DocumentsPanel borrowerId={user?.id} />

      {/* Change Password */}
      <form onSubmit={handleChangePassword} className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>Update your password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                placeholder="Enter current password"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                placeholder="Enter new password"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
              />
            </div>
          </CardContent>
          <CardContent>
            <Button type="submit" variant="outline" className="w-full" disabled={saving || !form.currentPassword}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change Password
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
