import { X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import CopyLinkButton from "./CopyLinkButton";

export default function ShareOverlay({ roomUrl, onClose }: { roomUrl: string; onClose: () => void }) {
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 200);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closing]);

  return (
    <div
      className={`share-overlay${closing ? " closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Jump in"
      onMouseDown={handleClose}
    >
      <button className="icon-button overlay-close" type="button" onClick={handleClose} aria-label="Close share view">
        <X size={22} />
      </button>
      <div className="share-overlay-panel">
        <h1>Jump in</h1>
        <QRCodeSVG
          value={roomUrl}
          size={340}
          bgColor="#ffffff"
          fgColor="#4f535b"
          className="large-qr"
          onClick={handleClose}
        />
        <div className="large-link-box" onMouseDown={(event) => event.stopPropagation()}>
          <span>{roomUrl}</span>
          <CopyLinkButton value={roomUrl} />
        </div>
      </div>
    </div>
  );
}

