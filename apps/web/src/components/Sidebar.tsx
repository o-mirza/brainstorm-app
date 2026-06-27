import type { RecentRoom } from "@brainstorm/shared";
import { Expand, History, Plus } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import CopyLinkButton from "./CopyLinkButton";

type Props = {
  roomUrl: string;
  recentRooms: RecentRoom[];
  onCreateRoom: () => void;
  onShowRecent: () => void;
  onExpand: () => void;
};

export default function Sidebar({ roomUrl, recentRooms, onCreateRoom, onShowRecent, onExpand }: Props) {
  return (
    <aside className="side">
      <div className="side-head">
        <h2 className="side-title">Share</h2>
        <button className="icon-button" type="button" onClick={onExpand} aria-label="Expand sharing view">
          <Expand size={18} />
        </button>
      </div>
      <div className="side-body">
        <div className="quiet-panel">
          <button className="qr-wrap qr-button" type="button" onClick={onExpand} aria-label="Expand sharing view">
            <QRCodeSVG value={roomUrl} size={242} bgColor="#ffffff" fgColor="#5d626b" className="qr-real" />
          </button>
          <div className="link-box">
            <span className="link-text">{roomUrl}</span>
            <CopyLinkButton value={roomUrl} />
          </div>
        </div>
        <div className="room-actions">
          <button type="button" onClick={onCreateRoom}>
            <Plus size={17} /> New room
          </button>
          <button type="button" onClick={onShowRecent}>
            <History size={17} /> Recent rooms <span>{recentRooms.length}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
