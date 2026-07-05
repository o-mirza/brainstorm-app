import { Download, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { easeStandard, modalBackdropVariants, modalPanelVariants } from "../lib/animations";

type Props = {
  canViewComments: boolean;
  onClose: () => void;
  onExport: (includeComments: boolean) => Promise<void>;
};

export default function ExportDataModal({ canViewComments, onClose, onExport }: Props) {
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
      await onExport(canViewComments && includeComments);
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
        <p className="export-modal-copy">Ideas and heart counts will be exported as a CSV.</p>
        {canViewComments ? (
          <label className="export-option">
            <input
              type="checkbox"
              checked={includeComments}
              disabled={isExporting}
              onChange={(event) => setIncludeComments(event.target.checked)}
            />
            <span>Include comments</span>
          </label>
        ) : null}
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
