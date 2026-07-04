import type { RecentRoom } from "@brainstorm/shared";
import { X } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { easeStandard, modalBackdropVariants, modalPanelVariants } from "../lib/animations";

export default function RecentRoomsDialog({ rooms, onClose }: { rooms: RecentRoom[]; onClose: () => void }) {
  const navigate = useNavigate();

  return (
    <motion.div
      className="modal-backdrop"
      role="presentation"
      variants={modalBackdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.15, ease: easeStandard }}
      onMouseDown={onClose}
    >
      <motion.div
        className="recent-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Recent rooms"
        variants={modalPanelVariants}
        transition={{ duration: 0.15, ease: easeStandard }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2>Recent rooms</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
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
                  onClose();
                  navigate(`/r/${room.roomSlug}`);
                }}
              >
                <strong>{room.title}</strong>
                <span>{room.ideaCount ?? 0} ideas · {new Date(room.lastVisitedAt).toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
