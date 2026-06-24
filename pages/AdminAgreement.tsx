import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { adminApi, AgreementSection } from '../types/api';
import { secureStorage } from '@/utils/secureStorage';
import { useNavigate } from 'react-router-dom';
import { Loader2, Save, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminAgreement() {
  const navigate = useNavigate();
  const [sections, setSections] = useState<AgreementSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState<Record<number, string>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    const check = async () => {
      const token = await secureStorage.getToken();
      const storedUser = await secureStorage.getUser();
      if (!token || !storedUser || storedUser.role !== 'admin') {
        navigate('/login');
        return;
      }
      loadSections();
    };
    check();
  }, []);

  const loadSections = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAgreementSections();
      const list = res?.data || [];
      setSections(list);
      const contentMap: Record<number, string> = {};
      list.forEach((s: AgreementSection) => { contentMap[s.id] = s.content; });
      setEditContent(contentMap);
    } catch (err) {
      console.error('Failed to load agreement sections:', err);
      toast.error('Failed to load agreement sections');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (id: number) => {
    setSavingId(id);
    try {
      await adminApi.updateAgreementSection(id, editContent[id] || '');
      toast.success('Section updated');
      setSections(prev => prev.map(s => s.id === id ? { ...s, content: editContent[id] || '', updated_at: new Date().toISOString() } : s));
    } catch (err: any) {
      toast.error(err.message || 'Failed to save section');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Loan Agreement Sections</h1>
        <Badge variant="outline" className="text-xs">Admin only</Badge>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Edit the text sections used in the loan agreement PDF. Use <code className="bg-muted px-1 rounded">{'{{variableName}}'}</code> placeholders for dynamic values.
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((section) => (
            <Card key={section.id}>
              <CardHeader className="p-4 pb-2 cursor-pointer" onClick={() => setExpandedId(expandedId === section.id ? null : section.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {expandedId === section.id ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <div>
                      <CardTitle className="text-sm font-medium">{section.title}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono">{section.section_key}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Updated {new Date(section.updated_at).toLocaleDateString()}</span>
                    {expandedId === section.id && (
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); handleSave(section.id); }} disabled={savingId === section.id}>
                        {savingId === section.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                        Save
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              {expandedId === section.id && (
                <CardContent className="p-4 pt-2">
                  <textarea
                    className="w-full min-h-[200px] font-mono text-xs p-3 border rounded-md bg-background resize-y"
                    value={editContent[section.id] || ''}
                    onChange={(e) => setEditContent(prev => ({ ...prev, [section.id]: e.target.value }))}
                  />
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
