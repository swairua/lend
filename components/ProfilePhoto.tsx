import { useRef, useState } from "react";
import { Loader2, Camera, User } from "lucide-react";
import { uploadsApi } from "../utils/api";

interface ProfilePhotoProps {
  name?: string;
  currentUrl?: string;
  borrowerId?: number;
  onUploaded?: (url: string) => void;
  size?: "sm" | "lg";
}

export default function ProfilePhoto({ name, currentUrl, borrowerId, onUploaded, size = "lg" }: ProfilePhotoProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [photo, setPhoto] = useState(currentUrl || "");
  const [error, setError] = useState("");

  const initials = name ? name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) : "?";
  const dim = size === "lg" ? "w-24 h-24" : "w-14 h-14";
  const iconSize = size === "lg" ? "h-10 w-10" : "h-6 w-6";
  const textSize = size === "lg" ? "text-2xl" : "text-sm";

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setUploading(true);
    try {
      const res = await uploadsApi.upload(file, "profile_photo", borrowerId);
      const url = res.data?.file_url || "";
      setPhoto(url);
      onUploaded?.(url);
    } catch (err: any) { setError(err.message || "Upload failed"); }
    finally { setUploading(false); }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={dim + " relative rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center cursor-pointer group border-4 border-white shadow-lg"}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {photo ? (
          <img src={photo} alt={name || "Profile"} className="w-full h-full object-cover" />
        ) : (
          <span className={textSize + " font-bold text-white"}>{initials}</span>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading ? <Loader2 className={iconSize + " text-white animate-spin"} /> : <Camera className={iconSize + " text-white"} />}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{uploading ? "Uploading..." : "Click to change photo"}</p>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
    </div>
  );
}
