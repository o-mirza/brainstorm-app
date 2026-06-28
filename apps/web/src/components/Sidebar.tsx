import type { RecentRoom } from "@brainstorm/shared";
import { Expand, History, Moon, Plus, ShieldCheck, Sun, Trash2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useTheme } from "../hooks/useTheme";
import CopyLinkButton from "./CopyLinkButton";

type Props = {
  roomUrl: string;
  isAdmin: boolean;
  canDeleteRoom: boolean;
  recentRooms: RecentRoom[];
  onCreateRoom: () => void;
  onShowRecent: () => void;
  onOpenShareOverlay: () => void;
  onShowPermissions: () => void;
  onDeleteRoom: () => void;
};

export default function Sidebar({
  roomUrl,
  isAdmin,
  canDeleteRoom,
  recentRooms,
  onCreateRoom,
  onShowRecent,
  onOpenShareOverlay,
  onShowPermissions,
  onDeleteRoom
}: Props) {
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">Share</h2>
        <button className="icon-button" type="button" onClick={onOpenShareOverlay} aria-label="Expand sharing view">
          <Expand size={18} />
        </button>
      </div>
      <div className="share-panel">
        <button className="qr-wrap qr-button" type="button" onClick={onOpenShareOverlay} aria-label="Expand sharing view">
          <QRCodeSVG
            value={roomUrl}
            size={242}
            bgColor={theme === "dark" ? "#13151a" : "#ffffff"}
            fgColor={theme === "dark" ? "#f3f4f6" : "#5d626b"}
            className="qr-real"
          />
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
        <button type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
          {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
          {theme === "light" ? "Dark mode" : "Light mode"}
        </button>
      </div>
      {isAdmin || canDeleteRoom ? (
        <div className="room-actions room-actions-danger">
          {isAdmin ? (
            <button type="button" onClick={onShowPermissions}>
              <ShieldCheck size={17} /> Permissions
            </button>
          ) : null}
          <button type="button" className="destructive-action" onClick={onDeleteRoom}>
            <Trash2 size={17} /> Delete room
          </button>
        </div>
      ) : null}
    </aside>
  );
}
