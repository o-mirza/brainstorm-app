import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  roomTitle: string;
  ideaCount: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export default function DeleteRoomModal({ roomTitle, ideaCount, onClose, onConfirm }: Props) {
  const [closing, setClosing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => confirmRef.current?.focus(), []);

  function close() {
    if (closing || deleting) return;
    setClosing(true);
    window.setTimeout(onClose, 150);
  }

  async function confirm() {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Room could not be deleted.");
      setDeleting(false);
    }
  }

  return (
    <div className={`modal-backdrop ${closing ? "closing" : ""}`} role="presentation" onMouseDown={close}>
      <div
        className="edit-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Delete room"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2>Delete room</h2>
          <button className="icon-button" type="button" onClick={close} aria-label="Close" disabled={deleting}>
            <X size={18} />
          </button>
        </div>
        <p className="delete-room-copy">This deletes the room and all content for everyone with the link. This cannot be undone.</p>
        <div className="delete-room-summary">
          <strong>{roomTitle}</strong>
          <span>{ideaCount} {ideaCount === 1 ? "idea" : "ideas"}</span>
        </div>
        {error ? <p className="modal-error">{error}</p> : null}
        <div className="modal-actions">
          <button type="button" onClick={close} disabled={deleting}>
            Cancel
          </button>
          <button ref={confirmRef} className="danger-button" type="button" onClick={() => void confirm()} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete room"}
          </button>
        </div>
      </div>
    </div>
  );
}
