import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/SectionCard';
import { FieldGroup } from '@/components/FieldGroup';
import { Loader2, Lock } from 'lucide-react';

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordChangeFormProps {
  form: PasswordFormData;
  onChange: (updated: Partial<PasswordFormData>) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  saving?: boolean;
}

export function PasswordChangeForm({ form, onChange, onSubmit, saving = false }: PasswordChangeFormProps) {
  const handleChange = (field: keyof PasswordFormData, value: string) => {
    onChange({ [field]: value });
  };

  const isValid = form.currentPassword && form.newPassword && form.confirmPassword;

  return (
    <form onSubmit={onSubmit} className="mt-6">
      <SectionCard icon={Lock} title="Change Password" description="Update your password">
        <div className="space-y-4">
          <FieldGroup label="Current Password">
            <Input
              id="currentPassword"
              type="password"
              value={form.currentPassword}
              onChange={(e) => handleChange('currentPassword', e.target.value)}
              placeholder="Enter current password"
            />
          </FieldGroup>

          <FieldGroup label="New Password">
            <Input
              id="newPassword"
              type="password"
              value={form.newPassword}
              onChange={(e) => handleChange('newPassword', e.target.value)}
              placeholder="Enter new password"
            />
          </FieldGroup>

          <FieldGroup label="Confirm New Password">
            <Input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              placeholder="Confirm new password"
            />
          </FieldGroup>

          <Button type="submit" variant="outline" className="w-full" disabled={saving || !isValid}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Change Password
          </Button>
        </div>
      </SectionCard>
    </form>
  );
}
