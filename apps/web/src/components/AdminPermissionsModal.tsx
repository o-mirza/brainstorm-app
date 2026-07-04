import type { ParticipantPermissions } from "@brainstorm/shared";
import { X, Loader2, AlertCircle, Shield, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import CopyLinkButton from "./CopyLinkButton";

type PermissionKey = keyof ParticipantPermissions;

type PermissionRow = {
  key: PermissionKey;
  label: string;
};

const PERMISSION_ROWS: PermissionRow[] = [
  { key: "canAddIdeas", label: "Add ideas" },
  { key: "canEditIdeas", label: "Edit ideas" },
  { key: "canDeleteIdeas", label: "Delete ideas" },
  { key: "canHeartIdeas", label: "Heart ideas" },
  { key: "canComment", label: "Comment" },
  { key: "canRenameRoom", label: "Rename room" },
  { key: "canDeleteRoom", label: "Delete room" }
];

type Props = {
  adminUrl: string;
  permissions: ParticipantPermissions;
  onClose: () => void;
  onUpdatePermissions: (permissions: ParticipantPermissions) => Promise<void>;
};

export default function AdminPermissionsModal({ adminUrl, permissions, onClose, onUpdatePermissions }: Props) {
  const [closing, setClosing] = useState(false);
  const [pendingKey, setPendingKey] = useState<PermissionKey | null>(null);
  const [errorKey, setErrorKey] = useState<PermissionKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => closeRef.current?.focus(), []);

  function close() {
    if (closing || pendingKey) return;
    setClosing(true);
    window.setTimeout(onClose, 150);
  }

  async function togglePermission(key: PermissionKey) {
    if (pendingKey) return;
    const nextPermissions = { ...permissions, [key]: !permissions[key] };
    setPendingKey(key);
    setErrorKey(null);
    setError(null);
    try {
      await onUpdatePermissions(nextPermissions);
    } catch (updateError) {
      setErrorKey(key);
      setError(updateError instanceof Error ? updateError.message : "Permission could not be saved.");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className={`modal-backdrop ${closing ? "closing" : ""}`} role="presentation" onMouseDown={close}>
      <div
        className="edit-modal permissions-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Admin permissions"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2>Admin permissions</h2>
          <button className="icon-button" ref={closeRef} type="button" onClick={close} aria-label="Close" disabled={Boolean(pendingKey)}>
            <X size={18} />
          </button>
        </div>

        <section className="permissions-section">
          <div className="section-title-wrap">
            <Shield size={16} className="section-icon admin-icon" />
            <h3>Admin access</h3>
          </div>
          <p>Anyone with this private link can manage permissions.</p>
          <div className="link-box">
            <span className="link-text">{adminUrl}</span>
            <CopyLinkButton value={adminUrl} />
          </div>
        </section>

        <section className="permissions-section">
          <div className="section-title-wrap">
            <Users size={16} className="section-icon participants-icon" />
            <h3>Participant permissions</h3>
          </div>
          <p>These settings apply to participants who join with the share link.</p>
          <div className="permissions-list">
            {PERMISSION_ROWS.map((row) => {
              const isPending = pendingKey === row.key;
              const isError = errorKey === row.key;
              return (
                <div
                  className={`permission-item ${isPending ? "is-pending" : ""} ${isError ? "has-error" : ""}`}
                  key={row.key}
                  onClick={() => !isPending && void togglePermission(row.key)}
                >
                  <div className="permission-info">
                    <strong className="permission-label">{row.label}</strong>
                    {isPending ? (
                      <span className="permission-status loading">
                        <Loader2 size={10} className="spinner" /> Saving...
                      </span>
                    ) : null}
                    {isError && error ? (
                      <span className="permission-status error">
                        <AlertCircle size={10} /> {error}
                      </span>
                    ) : null}
                  </div>
                  <label className="toggle-switch" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={permissions[row.key]}
                      disabled={isPending}
                      onChange={() => void togglePermission(row.key)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
