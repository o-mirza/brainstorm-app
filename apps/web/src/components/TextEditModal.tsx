import { X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { IDEA_TEXT_MAX_LENGTH } from "@brainstorm/shared";

type Props = {
  title: string;
  initialValue: string;
  onClose: () => void;
  onSave: (value: string) => Promise<void>;
};

export default function TextEditModal({ title, initialValue, onClose, onSave }: Props) {
  const [value, setValue] = useState(initialValue);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || pending) return;
    setPending(true);
    try {
      await onSave(trimmed);
      onClose();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="edit-modal" role="dialog" aria-modal="true" aria-label={title} onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
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
          <button type="submit" disabled={!value.trim() || pending}>
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
