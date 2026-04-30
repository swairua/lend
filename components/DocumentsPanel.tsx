import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadsApi, UploadedDocument } from "../utils/api";
import FileUpload, { DOC_TYPES } from "./FileUpload";
import { FileText, Image, Trash2, Eye, Plus, Loader2, FolderOpen } from "lucide-react";

interface DocumentsPanelProps {
  borrowerId?: number;
  readOnly?: boolean;
}

export default function DocumentsPanel({ borrowerId, readOnly }: DocumentsPanelProps) {
  const [docs, setDocs] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("national_id");
  const [viewDoc, setViewDoc] = useState<UploadedDocument | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const res = await uploadsApi.getDocuments(borrowerId);
      setDocs(Array.isArray(res.data) ? res.data : []);
    } catch (e) { setDocs([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadDocs(); }, [borrowerId]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this document?")) return;
    setDeleting(id);
    try { await uploadsApi.deleteDocument(id); await loadDocs(); }
    catch (e) { console.error(e); }
    finally { setDeleting(null); }
  };

  const selectedDocType = DOC_TYPES.find(d => d.value === selectedType);
  const isImg = (url: string) => /\\.(jpg|jpeg|png|gif|webp)$/i.test(url || "");
  const docLabel = (type: string) => DOC_TYPES.find(d => d.value === type)?.label || type;

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><FolderOpen className="h-4 w-4" /> Documents</CardTitle>
          {!readOnly && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddOpen(true)}>
              <Plus className="h-3 w-3 mr-1" /> Upload
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : docs.length === 0 ? (
          <div className="text-center py-6">
            <FolderOpen className="h-8 w-8 text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No documents uploaded yet</p>
            {!readOnly && <Button size="sm" variant="ghost" className="mt-2 text-xs" onClick={() => setAddOpen(true)}><Plus className="h-3 w-3 mr-1" /> Add document</Button>}
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map(doc => (
              <div key={doc.id} className="flex items-center gap-2 p-2 border rounded-lg hover:bg-muted/30">
                {isImg(doc.file_url) ? <Image className="h-8 w-8 text-blue-400 flex-shrink-0" /> : <FileText className="h-8 w-8 text-gray-400 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{doc.original_name}</p>
                  <Badge variant="secondary" className="text-xs mt-0.5">{docLabel(doc.doc_type)}</Badge>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewDoc(doc)}><Eye className="h-3.5 w-3.5" /></Button>
                  {!readOnly && <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleDelete(doc.id)} disabled={deleting === doc.id}>{deleting === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {/* Upload Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md w-[95vw]">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Document Type</p>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map(dt => <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {selectedDocType && (
              <FileUpload
                key={selectedType}
                docType={selectedType}
                label={selectedDocType.label}
                accept={selectedDocType.accept}
                borrowerId={borrowerId}
                onUploaded={() => { loadDocs(); setAddOpen(false); }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* View Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewDoc && docLabel(viewDoc.doc_type)}</DialogTitle></DialogHeader>
          {viewDoc && (
            isImg(viewDoc.file_url) ? (
              <img src={viewDoc.file_url} alt={viewDoc.original_name} className="w-full rounded-lg" />
            ) : (
              <div className="flex flex-col items-center gap-4 py-8">
                <FileText className="h-16 w-16 text-blue-300" />
                <p className="text-sm text-muted-foreground">{viewDoc.original_name}</p>
                <a href={viewDoc.file_url} target="_blank" rel="noreferrer">
                  <Button>Open Document</Button>
                </a>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
