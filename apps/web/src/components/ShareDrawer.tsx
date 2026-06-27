import type { RecentRoom } from "@brainstorm/shared";
import { X } from "lucide-react";
import { useEffect } from "react";
import ShareSidebar from "./ShareSidebar";

type Props = {
  open: boolean;
  roomUrl: string;
  recentRooms: RecentRoom[];
  onClose: () => void;
  onCreateRoom: () => void;
  onShowRecent: () => void;
  onExpand: () => void;
};

export default function ShareDrawer({ open, onClose, ...sidebarProps }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.classList.add("drawer-open");
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("drawer-open");
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <div className="share-drawer" onMouseDown={(event) => event.stopPropagation()}>
        <button className="icon-button drawer-close" type="button" onClick={onClose} aria-label="Close share drawer">
          <X size={19} />
        </button>
        <ShareSidebar {...sidebarProps} />
      </div>
    </div>
  );
}
