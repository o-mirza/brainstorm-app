import type { ParticipantPermissions } from "@brainstorm/shared";
import { X } from "lucide-react";
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
          <h3>Admin access</h3>
          <p>Anyone with this link can manage permissions.</p>
          <div className="link-box">
            <span className="link-text">{adminUrl}</span>
            <CopyLinkButton value={adminUrl} />
          </div>
        </section>

        <section className="permissions-section">
          <h3>Participant permissions</h3>
          <p>Admins always have full access. These settings only affect participants using the room link.</p>
          <div className="permissions-grid-wrap">
            <div className="permissions-grid">
              {PERMISSION_ROWS.map((row) => (
                <label className={`permission-tile ${pendingKey === row.key ? "is-pending" : ""}`} key={row.key}>
                  <input
                    type="checkbox"
                    checked={permissions[row.key]}
                    disabled={pendingKey === row.key}
                    onChange={() => void togglePermission(row.key)}
                  />
                  <span>
                    <strong>{row.label}</strong>
                    {pendingKey === row.key ? <small>Saving...</small> : null}
                    {errorKey === row.key && error ? <small className="inline-error">{error}</small> : null}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
