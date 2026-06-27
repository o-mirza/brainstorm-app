import type { Room } from "@brainstorm/shared";
import { PanelRight } from "lucide-react";
import type { ConnectionStatus as Status } from "../lib/types";
import ConnectionStatus from "./ConnectionStatus";
import RoomTitleEditor from "./RoomTitleEditor";

type Props = {
  room: Room;
  participantCount: number;
  status: Status;
  animateGeneratedTitle: boolean;
  onRename: (title: string) => Promise<void>;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
};

export default function TopBar({ room, participantCount, status, animateGeneratedTitle, onRename, sidebarOpen, onToggleSidebar }: Props) {
  return (
    <header className="topbar">
      <RoomTitleEditor room={room} animateGeneratedTitle={animateGeneratedTitle} onRename={onRename} />
      <div className="top-actions">
        <ConnectionStatus status={status} count={participantCount} />
        <button
          className="icon-button sidebar-toggle-button"
          type="button"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? "Hide share sidebar" : "Show share sidebar"}
          aria-expanded={sidebarOpen}
        >
          <PanelRight size={19} />
        </button>
      </div>
    </header>
  );
}
