import type { RecentRoom } from "@brainstorm/shared";
import { Download, Expand, History, Moon, Plus, ShieldCheck, Sparkles, Sun, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { useTheme } from "../hooks/useTheme";
import { easeOverlay } from "../lib/animations";
import CopyLinkButton from "./CopyLinkButton";

type Props = {
  roomUrl: string;
  isAdmin: boolean;
  canDeleteRoom: boolean;
  canExportData: boolean;
  canGenerateSummary: boolean;
  recentRooms: RecentRoom[];
  onCreateRoom: () => void;
  onShowRecent: () => void;
  onOpenShareOverlay: () => void;
  onShowAISummary: () => void;
  onShowExportData: () => void;
  onShowPermissions: () => void;
  onDeleteRoom: () => void;
};

export default function Sidebar({
  roomUrl,
  isAdmin,
  canDeleteRoom,
  canExportData,
  canGenerateSummary,
  recentRooms,
  onCreateRoom,
  onShowRecent,
  onOpenShareOverlay,
  onShowAISummary,
  onShowExportData,
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
      <div className="room-access-panel">
        <button className="join-code-wrap join-code-button" type="button" onClick={onOpenShareOverlay} aria-label="Expand sharing view">
          <motion.div
            className="join-code-frame"
            layoutId="share-room-qr"
            transition={{ layout: { duration: 0.2, ease: easeOverlay } }}
          >
            <div className="join-code-graphic">
              <QRCodeSVG
                value={roomUrl}
                size={242}
                bgColor={theme === "dark" ? "#13151a" : "#ffffff"}
                fgColor={theme === "dark" ? "#f3f4f6" : "#5d626b"}
              />
            </div>
          </motion.div>
        </button>
        <div className="room-url-box">
          <span className="room-url-text">{roomUrl}</span>
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
        {canGenerateSummary ? (
          <button type="button" onClick={onShowAISummary}>
            <Sparkles size={17} /> AI Summary
          </button>
        ) : null}
        {canExportData ? (
          <button type="button" onClick={onShowExportData}>
            <Download size={17} /> Export data
          </button>
        ) : null}
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
