import { X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect } from "react";
import CopyLinkButton from "./CopyLinkButton";

export default function ShareOverlay({ roomUrl, onClose }: { roomUrl: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="share-overlay" role="dialog" aria-modal="true" aria-label="Jump in" onMouseDown={onClose}>
      <div className="share-overlay-panel">
        <button className="icon-button overlay-close" type="button" onClick={onClose} aria-label="Close share view">
          <X size={22} />
        </button>
        <h1>Jump in</h1>
        <QRCodeSVG
          value={roomUrl}
          size={340}
          bgColor="#ffffff"
          fgColor="#4f535b"
          className="large-qr"
          onClick={onClose}
        />
        <div className="large-link-box" onMouseDown={(event) => event.stopPropagation()}>
          <span>{roomUrl}</span>
          <CopyLinkButton value={roomUrl} />
        </div>
      </div>
    </div>
  );
}
