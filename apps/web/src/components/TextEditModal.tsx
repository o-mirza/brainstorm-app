import { X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IDEA_TEXT_MAX_LENGTH } from "@brainstorm/shared";

type Props = {
  title: string;
  initialValue: string;
  onClose: () => void;
  onSave: (value: string) => Promise<void>;
};

export default function TextEditModal({ title, initialValue, onClose, onSave }: Props) {
  const [value, setValue] = useState(initialValue);
  const [closing, setClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  function close() {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 150);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || closing) return;
    void onSave(trimmed).catch(() => {
      // The optimistic room state rolls back on failure.
    });
    close();
  }

  const modal = (
    <div
      className={`modal-backdrop ${closing ? "closing" : ""}`}
      role="presentation"
      onMouseDown={close}
      onClick={(event) => event.stopPropagation()}
    >
      <form
        className="edit-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" type="button" onClick={close} aria-label="Close">
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
            if (event.key === "Escape") close();
          }}
        />
        <div className="modal-actions">
          <button type="button" onClick={close}>
            Cancel
          </button>
          <button type="submit" disabled={!value.trim() || closing}>
            Save
          </button>
        </div>
      </form>
    </div>
  );

  return createPortal(modal, document.body);
}
