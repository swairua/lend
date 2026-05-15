import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ProfilePhoto from "@/components/ProfilePhoto";
import DocumentsPanel from "@/components/DocumentsPanel";
import { ProfileForm } from "@/components/ProfileForm";
import { PasswordChangeForm } from "@/components/PasswordChangeForm";
import { authApi, formatKES } from '@/utils/api';
import { secureStorage } from '@/utils/secureStorage';
import { Loader2, ArrowLeft, Banknote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';

interface BorrowerProfile {
  national_id: string;
  address: string;
  business_name: string;
  business_type: string;
  monthly_income: number;
  credit_score: number;
}

interface ProfileFormData {
  name: string;
  phone: string;
  national_id: string;
  address: string;
  business_name: string;
  business_type: string;
  monthly_income: string;
  kra_pin: string;
  tcc_number: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuthenticatedUser();
  const [saving, setSaving] = useState(false);
  const [borrower, setBorrower] = useState<BorrowerProfile | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");

  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    name: '',
    phone: '',
    national_id: '',
    address: '',
    business_name: '',
    business_type: '',
    monthly_income: '',
    kra_pin: '',
    tcc_number: '',
  });

  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!authLoading && user) {
      setProfileForm((prev) => ({
        ...prev,
        name: user.name || '',
        phone: user.phone || '',
      }));
      loadProfile();
    }
  }, [authLoading, user]);

  const loadProfile = async () => {
    try {
      const response: any = await authApi.getMe();
      const userData: any = response?.data || response?.user;

      if (userData) {
        setProfileForm((prev) => ({
          ...prev,
          name: userData.name || prev.name || '',
          phone: userData.phone || prev.phone || '',
          national_id: userData.national_id || '',
          address: userData.address || '',
          business_name: userData.business_name || '',
          business_type: userData.business_type || '',
          monthly_income: userData.monthly_income || '',
          kra_pin: userData.kra_pin || '',
          tcc_number: userData.tcc_number || '',
        }));

        if (userData?.photo_url) {
          setPhotoUrl(userData.photo_url);
        }

        if (userData.borrower) {
          setBorrower(userData.borrower);
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await authApi.updateProfile({
        name: profileForm.name,
        phone: profileForm.phone,
        photo_url: photoUrl || undefined,
        address: profileForm.address || undefined,
        business_name: profileForm.business_name || undefined,
        business_type: profileForm.business_type || undefined,
        monthly_income: profileForm.monthly_income ? Number(profileForm.monthly_income) : undefined,
        national_id: profileForm.national_id || undefined,
        kra_pin: profileForm.kra_pin || undefined,
        tcc_number: profileForm.tcc_number || undefined,
      });

      await secureStorage.setUser({
        ...user,
        name: profileForm.name,
        phone: profileForm.phone,
        photo_url: photoUrl,
      } as any);

      toast({ title: 'Profile updated successfully' });
    } catch (error: any) {
      toast({ title: error.message || 'Failed to update profile', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      await authApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      toast({ title: 'Password changed successfully' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast({ title: error.message || 'Failed to change password', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-2xl">
      <div className="flex items-center gap-2 mb-6 min-w-0">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base sm:text-lg md:text-2xl lg:text-3xl font-bold truncate">My Profile</h1>
      </div>

      {/* Profile Photo */}
      <div className="flex justify-center mb-6">
        <ProfilePhoto
          name={user?.name}
          currentUrl={photoUrl}
          borrowerId={user?.borrower_id}
          onUploaded={(url) => setPhotoUrl(url)}
        />
      </div>

      {/* Profile Form */}
      <ProfileForm
        form={profileForm}
        onChange={(updated) => setProfileForm({ ...profileForm, ...updated })}
        onSubmit={handleSaveProfile}
        saving={saving}
        userEmail={user?.email}
      />

      {/* Credit Score */}
      {borrower?.credit_score && (
        <Card className="my-6">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Banknote className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Your Credit Score</span>
            </div>
            <div className="text-4xl font-bold text-primary">{borrower.credit_score}</div>
          </CardContent>
        </Card>
      )}

      {/* Documents Section */}
      <DocumentsPanel borrowerId={user?.borrower_id} />

      {/* Password Form */}
      <PasswordChangeForm
        form={passwordForm}
        onChange={(updated) => setPasswordForm({ ...passwordForm, ...updated })}
        onSubmit={handleChangePassword}
        saving={saving}
      />
    </div>
  );
}
