import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/SectionCard';
import { FieldGroup } from '@/components/FieldGroup';
import { Loader2, User, Briefcase } from 'lucide-react';

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

interface ProfileFormProps {
  form: ProfileFormData;
  onChange: (updated: Partial<ProfileFormData>) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  saving?: boolean;
  userEmail?: string;
}

export function ProfileForm({ form, onChange, onSubmit, saving = false, userEmail }: ProfileFormProps) {
  const handleChange = (field: keyof ProfileFormData, value: string) => {
    onChange({ [field]: value });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Personal Information */}
      <SectionCard icon={User} title="Personal Information" description="Update your personal details">
        <div className="space-y-4">
          <FieldGroup label="Full Name">
            <Input
              id="name"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Your full name"
            />
          </FieldGroup>

          <FieldGroup label="Email" helper="Contact admin to change email">
            <Input id="email" value={userEmail || ''} disabled className="bg-muted" />
          </FieldGroup>

          <FieldGroup label="Phone Number">
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+254 700 000000"
            />
          </FieldGroup>
        </div>
      </SectionCard>

      {/* Business Information */}
      <SectionCard icon={Briefcase} title="Business Information" description="Your loan application details">
        <div className="space-y-4">
          {/* KYC Fields */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">KYC Information</p>
            <FieldGroup label="National ID / Passport" required>
              <Input
                id="national_id"
                value={form.national_id}
                onChange={(e) => handleChange('national_id', e.target.value)}
                placeholder="Enter your ID number"
                className="text-sm"
              />
            </FieldGroup>
            <FieldGroup label="KRA PIN" required>
              <Input
                id="kra_pin"
                value={form.kra_pin}
                onChange={(e) => handleChange('kra_pin', e.target.value)}
                placeholder="Enter your KRA PIN"
                className="text-sm"
              />
            </FieldGroup>
            <FieldGroup label="TCC Number (Renewed Annually)" required>
              <Input
                id="tcc_number"
                value={form.tcc_number}
                onChange={(e) => handleChange('tcc_number', e.target.value)}
                placeholder="Enter your TCC number"
                className="text-sm"
              />
            </FieldGroup>
            <p className="text-xs text-blue-700">Please provide accurate KYC information. Admin will verify these details.</p>
          </div>

          <FieldGroup label="Address">
            <Textarea
              id="address"
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Your physical address"
              className="min-h-[80px]"
            />
          </FieldGroup>

          <FieldGroup label="Business Name">
            <Input
              id="business_name"
              value={form.business_name}
              onChange={(e) => handleChange('business_name', e.target.value)}
              placeholder="Your business name (if any)"
            />
          </FieldGroup>

          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Business Type">
              <Input
                id="business_type"
                value={form.business_type}
                onChange={(e) => handleChange('business_type', e.target.value)}
                placeholder="e.g., Retail, Services"
              />
            </FieldGroup>

            <FieldGroup label="Monthly Income (KES)">
              <Input
                id="monthly_income"
                type="number"
                value={form.monthly_income}
                onChange={(e) => handleChange('monthly_income', e.target.value)}
                placeholder="50000"
              />
            </FieldGroup>
          </div>
        </div>
      </SectionCard>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Changes
      </Button>
    </form>
  );
}
