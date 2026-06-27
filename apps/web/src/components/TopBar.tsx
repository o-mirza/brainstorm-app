import type { Room } from "@brainstorm/shared";
import { PanelRight } from "lucide-react";
import type { ConnectionStatus as Status } from "../lib/types";
import ConnectionStatus from "./ConnectionStatus";
import RoomTitleEditor from "./RoomTitleEditor";

type Props = {
  room: Room;
  participantCount: number;
  status: Status;
  onRename: (title: string) => Promise<void>;
  onOpenShare: () => void;
};

export default function TopBar({ room, participantCount, status, onRename, onOpenShare }: Props) {
  return (
    <header className="topbar">
      <RoomTitleEditor room={room} onRename={onRename} />
      <div className="top-actions">
        <ConnectionStatus status={status} count={participantCount} />
        <button className="icon-button mobile-share-button" type="button" onClick={onOpenShare} aria-label="Open share drawer">
          <PanelRight size={19} />
        </button>
      </div>
    </header>
  );
}
