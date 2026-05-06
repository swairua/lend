import { useRef, useState } from "react";
import { Loader2, UploadCloud, X, CheckCircle2, FileText } from "lucide-react";
import { uploadsApi, getFileUrl } from "../utils/api";

export const DOC_TYPES = [
  { value: "profile_photo", label: "Profile Photo", accept: "image/*" },
  { value: "national_id", label: "National ID (Front & Back)", accept: "image/*,.pdf" },
  { value: "kra_certificate", label: "KRA PIN Certificate", accept: "image/*,.pdf" },
  { value: "tcc_document", label: "Tax Compliance Certificate", accept: "image/*,.pdf" },
  { value: "bank_statement", label: "Bank Statement (3 months)", accept: ".pdf,image/*" },
  { value: "logbook", label: "Vehicle Logbook", accept: "image/*,.pdf" },
  { value: "payslip", label: "Payslip", accept: ".pdf,image/*" },
  { value: "other", label: "Other Document", accept: "image/*,.pdf,.doc,.docx" },
];

interface FileUploadProps {
  docType: string;
  label: string;
  accept?: string;
  borrowerId?: number;
  onUploaded?: (doc: any) => void;
  currentUrl?: string;
  compact?: boolean;
}

export default function FileUpload({ docType, label, accept = "image/*,.pdf", borrowerId, onUploaded, currentUrl, compact }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<string | null>(currentUrl || null);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const handleFile = async (file: File) => {
    if (!file) return;
    setError(""); setUploading(true); setFileName(file.name);
    try {
      const res = await uploadsApi.upload(file, docType, borrowerId);
      const url = getFileUrl(res.data?.file_url || "");
      setUploaded(url);
      onUploaded?.(res.data);
    } catch (e: any) {
      setError(e.message || "Upload failed. Please try again.");
    } finally { setUploading(false); }
  };

  const isImg = (url: string) => /\\.(jpg|jpeg|png|gif|webp)$/i.test(url);

  return (
    <div className={"space-y-2" + (compact ? " text-xs" : "")}>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {uploaded ? (
        <div className="relative border rounded-lg overflow-hidden bg-gray-50">
          {isImg(uploaded) ? (
            <img src={uploaded} alt={label} className={compact ? "w-full h-28 object-cover" : "w-full max-h-56 object-contain p-2"} />
          ) : (
            <div className="flex items-center gap-2 p-3">
              <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <a href={uploaded} target="_blank" rel="noreferrer" className="text-blue-600 text-sm hover:underline truncate flex-1">{fileName || "View Document"}</a>
            </div>
          )}
          <div className="absolute top-1 right-1 flex gap-1">
            <span className="bg-green-500 text-white rounded-full p-0.5"><CheckCircle2 className="h-3 w-3" /></span>
            <button type="button" onClick={() => { setUploaded(null); setFileName(""); }} className="bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5"><X className="h-3 w-3" /></button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => !uploading && inputRef.current?.click()}
          className={"border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors " + (dragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50") + (compact ? " p-3 gap-1" : " p-8 gap-2")}
        >
          {uploading ? (
            <><Loader2 className="h-6 w-6 animate-spin text-blue-500" /><p className="text-xs text-gray-500">Uploading...</p></>
          ) : (
            <>
              <UploadCloud className={(compact ? "h-6 w-6" : "h-10 w-10") + " text-gray-300"} />
              <p className={(compact ? "text-xs" : "text-sm") + " text-gray-500 text-center"}>Drop file here or <span className="text-blue-600 font-medium">click to browse</span></p>
              <p className="text-xs text-gray-400">{accept}</p>
            </>
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
}
