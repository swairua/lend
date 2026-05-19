import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadsApi, UploadedDocument, getFileUrl } from "../utils/api";
import FileUpload, { DOC_TYPES } from "./FileUpload";
import DocumentPreviewModal from "./DocumentPreviewModal";
import { FileText, Image, Trash2, Eye, Plus, Loader2, FolderOpen } from "lucide-react";

interface DocumentsPanelProps {
  borrowerId?: number;
  readOnly?: boolean;
  isBorrower?: boolean;
}

export default function DocumentsPanel({ borrowerId, readOnly, isBorrower }: DocumentsPanelProps) {
  const [docs, setDocs] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("national_id");
  const [viewDoc, setViewDoc] = useState<UploadedDocument | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const res: any = await uploadsApi.getDocuments(borrowerId);
      // Normalize various API shapes to a flat array of UploadedDocument
      const data: any = res?.data ?? res?.documents ?? res ?? [];
      const docs = Array.isArray(data) ? data : [];
      setDocs(docs as UploadedDocument[]);
    } catch (e) { setDocs([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (borrowerId !== undefined) loadDocs(); else setLoading(false); }, [borrowerId]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this document?")) return;
    setDeleting(id);
    try {
      await uploadsApi.deleteDocument(id);
      await loadDocs();
    }
    catch (e) {
      console.error(e);
      alert(e.message || 'Failed to delete document');
    }
    finally { setDeleting(null); }
  };

  const selectedDocType = DOC_TYPES.find(d => d.value === selectedType);
  const isImg = (url: string) => /\\.(jpg|jpeg|png|gif|webp)$/i.test(url || "");
  const docLabel = (type: string) => DOC_TYPES.find(d => d.value === type)?.label || type;

  // Get set of already-uploaded document types
  const uploadedDocTypes = new Set(docs.map(d => d.doc_type));

  // For borrowers, determine if upload should be disabled
  const borrowerCanUpload = !isBorrower || docs.length === 0;

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><FolderOpen className="h-4 w-4" /> Documents</CardTitle>
          {!readOnly && borrowerCanUpload && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddOpen(true)} aria-label="Upload new document">
              <Plus className="h-3 w-3 mr-1" /> Upload
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {loading ? (
          <div className="flex justify-center py-6" role="status" aria-live="polite" aria-label="Loading documents">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-6">
            <FolderOpen className="h-8 w-8 text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No documents uploaded yet</p>
            {!readOnly && borrowerCanUpload && <Button size="sm" variant="ghost" className="mt-2 text-xs" onClick={() => setAddOpen(true)}><Plus className="h-3 w-3 mr-1" /> Add document</Button>}
          </div>
        ) : (
          <div className="space-y-3" role="region" aria-label="Uploaded documents list">
            {isBorrower && docs.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                <p className="text-xs text-amber-800">
                  <strong>Documents are locked.</strong> Contact your administrator to replace or delete documents.
                </p>
              </div>
            )}
            <div className="space-y-2">
              {docs.map((doc, idx) => {
                const fullUrl = getFileUrl(doc.file_url);
                return (
                <div key={doc.id} className="flex items-center gap-2 p-2 border rounded-lg hover:bg-muted/30" role="listitem">
                  {isImg(fullUrl) ? <Image className="h-8 w-8 text-blue-400 flex-shrink-0" aria-hidden="true" /> : <FileText className="h-8 w-8 text-gray-400 flex-shrink-0" aria-hidden="true" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{doc.original_name}</p>
                    <Badge variant="secondary" className="text-xs mt-0.5">{docLabel(doc.doc_type)}</Badge>
                  </div>
                  <div className="flex gap-1 flex-shrink-0" role="toolbar" aria-label={`Actions for document ${idx + 1} of ${docs.length}`}>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setViewDoc(doc)}
                      aria-label={`View ${doc.original_name}`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {!readOnly && !isBorrower && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={() => handleDelete(doc.id)}
                        disabled={deleting === doc.id}
                        aria-label={`Delete ${doc.original_name}`}
                      >
                        {deleting === doc.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
      {/* Upload Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md w-[95vw]">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="doc-type-select" className="text-sm font-medium">Document Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger id="doc-type-select" aria-label="Select document type"><SelectValue /></SelectTrigger>
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
      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={viewDoc}
        isOpen={!!viewDoc}
        onOpenChange={(open) => !open && setViewDoc(null)}
        docLabel={docLabel}
      />
    </Card>
  );
}
