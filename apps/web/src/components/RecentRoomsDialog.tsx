import type { RecentRoom } from "@brainstorm/shared";
import { X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RecentRoomsDialog({ rooms, onClose }: { rooms: RecentRoom[]; onClose: () => void }) {
  const navigate = useNavigate();
  const [closing, setClosing] = useState(false);

  function close() {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 150);
  }

  return (
    <div className={`modal-backdrop ${closing ? "closing" : ""}`} role="presentation" onMouseDown={close}>
      <div className="recent-dialog" role="dialog" aria-modal="true" aria-label="Recent rooms" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>Recent rooms</h2>
          <button className="icon-button" type="button" onClick={close} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="recent-list-wrap">
          <div className="recent-list">
            {rooms.length === 0 ? <p>No recent rooms yet.</p> : null}
            {rooms.map((room) => (
              <button
                key={room.roomSlug}
                type="button"
                onClick={() => {
                  close();
                  navigate(`/r/${room.roomSlug}`);
                }}
              >
                <strong>{room.title}</strong>
                <span>{room.ideaCount ?? 0} ideas · {new Date(room.lastVisitedAt).toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
