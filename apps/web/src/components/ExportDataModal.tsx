import type { RoomExportOptions } from "@brainstorm/shared";
import { Download, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { easeStandard, modalBackdropVariants, modalPanelVariants } from "../lib/animations";

type Props = {
  canViewHeartCounts: boolean;
  canViewComments: boolean;
  onClose: () => void;
  onExport: (options: RoomExportOptions) => Promise<void>;
};

export default function ExportDataModal({ canViewHeartCounts, canViewComments, onClose, onExport }: Props) {
  const [includeHeartCounts, setIncludeHeartCounts] = useState(canViewHeartCounts);
  const [includeComments, setIncludeComments] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => closeRef.current?.focus(), []);

  function close() {
    if (isExporting) return;
    onClose();
  }

  async function exportData() {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await onExport({
        includeHeartCounts: canViewHeartCounts && includeHeartCounts,
        includeComments: canViewComments && includeComments
      });
    } finally {
      setIsExporting(false);
    }
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
        className="edit-modal export-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Export data"
        variants={modalPanelVariants}
        transition={{ duration: 0.15, ease: easeStandard }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2>Export data</h2>
          <button className="icon-button" ref={closeRef} type="button" onClick={close} aria-label="Close" disabled={isExporting}>
            <X size={18} />
          </button>
        </div>
        <p className="export-modal-copy">Choose the data to include in your export.</p>
        <div className="export-options">
          <label className="export-option">
            <input type="checkbox" checked disabled />
            <span>
              <strong>Ideas</strong>
              <small>Idea text and timestamps (always Included)</small>
            </span>
          </label>
          {canViewHeartCounts ? (
            <label className="export-option">
              <input
                type="checkbox"
                checked={includeHeartCounts}
                disabled={isExporting}
                onChange={(event) => setIncludeHeartCounts(event.target.checked)}
              />
              <span>
                <strong>Heart counts</strong>
                <small>Number of hearts per idea</small>
              </span>
            </label>
          ) : null}
          {canViewComments ? (
            <label className="export-option">
              <input
                type="checkbox"
                checked={includeComments}
                disabled={isExporting}
                onChange={(event) => setIncludeComments(event.target.checked)}
              />
              <span>
                <strong>Comments</strong>
                <small>Comment text and timestamps</small>
              </span>
            </label>
          ) : null}
        </div>
        <div className="modal-actions">
          <button type="button" onClick={close} disabled={isExporting}>
            Cancel
          </button>
          <button type="button" onClick={() => void exportData()} disabled={isExporting}>
            <Download size={16} />
            {isExporting ? "Exporting" : "Export CSV"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
