import { UploadedDocument, getFileUrl } from "@/utils/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Download, X } from "lucide-react";

interface DocumentPreviewModalProps {
  document: UploadedDocument | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  docLabel: (type: string) => string;
}

export default function DocumentPreviewModal({
  document,
  isOpen,
  onOpenChange,
  docLabel,
}: DocumentPreviewModalProps) {
  if (!document) return null;

  const fullUrl = getFileUrl(document.file_url);
  const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(fullUrl || "");

  const getFormattedDate = (dateString: string | undefined) => {
    if (!dateString) return "Unknown date";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Unknown date";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div className="flex-1">
            <DialogTitle className="text-lg font-semibold">
              {docLabel(document.doc_type)}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {document.original_name}
            </p>
            {document.created_at && (
              <p className="text-xs text-muted-foreground">
                Uploaded: {getFormattedDate(document.created_at)}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-7 w-7 flex-shrink-0"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="flex-1 flex flex-col items-center justify-center py-8 overflow-auto bg-muted/20 rounded-lg my-4">
          {isImg ? (
            <img
              src={fullUrl}
              alt={document.original_name}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center px-4">
                {document.original_name}
              </p>
              <a href={fullUrl} target="_blank" rel="noreferrer">
                <Button size="sm">
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Open Document
                </Button>
              </a>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <a href={fullUrl} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              <Download className="h-3.5 w-3.5 mr-1" />
              Download
            </Button>
          </a>
          <Button
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
