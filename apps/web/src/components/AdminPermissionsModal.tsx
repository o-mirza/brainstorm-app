import type { ManagementPermission, ParticipantPermissions } from "@brainstorm/shared";
import { X, Loader2, AlertCircle, Shield, Users } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { easeStandard, modalBackdropVariants, modalPanelVariants } from "../lib/animations";
import CopyLinkButton from "./CopyLinkButton";

type PermissionKey = keyof ParticipantPermissions;
type TogglePermissionKey = {
  [Key in PermissionKey]: ParticipantPermissions[Key] extends boolean ? Key : never;
}[PermissionKey];
type ManagementPermissionKey = {
  [Key in PermissionKey]: ParticipantPermissions[Key] extends ManagementPermission ? Key : never;
}[PermissionKey];

type PermissionRow =
  | {
      kind: "toggle";
      key: TogglePermissionKey;
      label: string;
    }
  | {
      kind: "level";
      key: ManagementPermissionKey;
      label: string;
    };

const PERMISSION_GROUPS: PermissionRow[][] = [
  [
    { kind: "toggle", key: "canViewIdeas", label: "View others' ideas" },
    { kind: "toggle", key: "canAddIdeas", label: "Add ideas" },
    { kind: "level", key: "ideaManagement", label: "Manage ideas" }
  ],
  [
    { kind: "toggle", key: "canHeartIdeas", label: "Heart ideas" },
    { kind: "toggle", key: "canViewHeartCounts", label: "View heart counts" }
  ],
  [
    { kind: "toggle", key: "canViewComments", label: "View comments" },
    { kind: "toggle", key: "canAddComments", label: "Add comments" },
    { kind: "level", key: "commentManagement", label: "Manage comments" }
  ],
  [
    { kind: "toggle", key: "canExportData", label: "Export data" },
    { kind: "toggle", key: "canGenerateSummary", label: "Generate AI summary" },
    { kind: "toggle", key: "canRenameRoom", label: "Rename room" },
    { kind: "toggle", key: "canDeleteRoom", label: "Delete room" }
  ]
];

const MANAGEMENT_LEVELS: { value: ManagementPermission; label: string }[] = [
  { value: "none", label: "None" },
  { value: "own", label: "Own" },
  { value: "anyone", label: "Anyone" }
];

type Props = {
  adminUrl: string;
  permissions: ParticipantPermissions;
  onClose: () => void;
  onUpdatePermissions: (permissions: ParticipantPermissions) => Promise<void>;
};

export default function AdminPermissionsModal({ adminUrl, permissions, onClose, onUpdatePermissions }: Props) {
  const [pendingKey, setPendingKey] = useState<PermissionKey | null>(null);
  const [errorKey, setErrorKey] = useState<PermissionKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => closeRef.current?.focus(), []);

  function close() {
    if (pendingKey) return;
    onClose();
  }

  async function updatePermissions(key: PermissionKey, nextPermissions: ParticipantPermissions) {
    if (pendingKey) return;
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

  async function togglePermission(key: TogglePermissionKey) {
    await updatePermissions(key, { ...permissions, [key]: !permissions[key] });
  }

  async function setManagementPermission(key: ManagementPermissionKey, value: ManagementPermission) {
    if (permissions[key] === value) return;
    await updatePermissions(key, { ...permissions, [key]: value });
  }

  function renderRows(rows: PermissionRow[]) {
    return rows.map((row) => {
      const isPending = pendingKey === row.key;
      const isError = errorKey === row.key;
      const isCommentDependent =
        !permissions.canViewComments &&
        (row.key === "canAddComments" || row.key === "commentManagement");
      const status = (
        <>
          {isPending ? (
            <span className="permission-status loading" aria-label="Saving permission">
              <Loader2 size={10} className="spinner" aria-hidden="true" />
            </span>
          ) : null}
          {isError && error ? (
            <span className="permission-status error">
              <AlertCircle size={10} /> {error}
            </span>
          ) : null}
        </>
      );

      if (row.kind === "level") {
        return (
          <div
            className={`permission-item permission-item-level ${isCommentDependent ? "is-muted" : ""} ${isPending ? "is-pending" : ""} ${isError ? "has-error" : ""}`}
            key={row.key}
          >
            <div className="permission-info">
              <strong className="permission-label">{row.label}</strong>
              {status}
            </div>
            <div className="permission-level-control" aria-label={row.label}>
              {MANAGEMENT_LEVELS.map((level) => (
                <button
                  type="button"
                  key={level.value}
                  className={permissions[row.key] === level.value ? "active" : ""}
                  aria-pressed={permissions[row.key] === level.value}
                  disabled={Boolean(pendingKey)}
                  onClick={() => void setManagementPermission(row.key, level.value)}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>
        );
      }

      return (
        <div
          className={`permission-item ${isCommentDependent ? "is-muted" : ""} ${isPending ? "is-pending" : ""} ${isError ? "has-error" : ""}`}
          key={row.key}
          onClick={() => !isPending && void togglePermission(row.key)}
        >
          <div className="permission-info">
            <strong className="permission-label">{row.label}</strong>
            {status}
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
    });
  }

  return (
    <motion.div
      className="modal-backdrop"
      role="presentation"
      variants={modalBackdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.15, ease: easeStandard }}
      onMouseDown={close}
    >
      <motion.div
        className="edit-modal permissions-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Admin permissions"
        variants={modalPanelVariants}
        transition={{ duration: 0.15, ease: easeStandard }}
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
            {PERMISSION_GROUPS.map((group, index) => (
              <div className="permissions-group" key={index}>
                {renderRows(group)}
              </div>
            ))}
          </div>
        </section>
      </motion.div>
    </motion.div>
  );
}
