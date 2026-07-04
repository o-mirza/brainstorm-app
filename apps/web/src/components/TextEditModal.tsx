import { X } from "lucide-react";
import { motion } from "motion/react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IDEA_TEXT_MAX_LENGTH } from "@brainstorm/shared";
import { easeStandard, modalBackdropVariants, modalPanelVariants } from "../lib/animations";

type Props = {
  title: string;
  initialValue: string;
  onClose: () => void;
  onSave: (value: string) => Promise<void>;
};

export default function TextEditModal({ title, initialValue, onClose, onSave }: Props) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    void onSave(trimmed).catch(() => {
      // The optimistic room state rolls back on failure.
    });
    onClose();
  }

  const modal = (
    <motion.div
      className="modal-backdrop"
      role="presentation"
      variants={modalBackdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.15, ease: easeStandard }}
      onMouseDown={onClose}
      onClick={(event) => event.stopPropagation()}
    >
      <motion.form
        className="edit-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        variants={modalPanelVariants}
        transition={{ duration: 0.15, ease: easeStandard }}
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <input
          ref={inputRef}
          value={value}
          maxLength={IDEA_TEXT_MAX_LENGTH}
          aria-label={title}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
          }}
        />
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={!value.trim()}>
            Save
          </button>
        </div>
      </motion.form>
    </motion.div>
  );

  return createPortal(modal, document.body);
}
