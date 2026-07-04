import { SendHorizonal } from "lucide-react";
import { useState } from "react";
import type { AnimationEvent, FormEvent, KeyboardEvent } from "react";
import { IDEA_TEXT_MAX_LENGTH } from "@brainstorm/shared";

type Props = {
  isExiting?: boolean;
  maxLength?: number;
  placeholder?: string;
  ariaLabel?: string;
  onAnimationEnd?: () => void;
  onSubmit: (text: string) => Promise<void>;
};

export default function IdeaComposer({
  isExiting = false,
  maxLength = IDEA_TEXT_MAX_LENGTH,
  placeholder = "Add an idea",
  ariaLabel = "Add an idea",
  onAnimationEnd,
  onSubmit
}: Props) {
  const [value, setValue] = useState("");
  const trimmed = value.trim();
  const nearLimit = value.length > maxLength - 30;

  async function doSubmit() {
    if (isExiting || !trimmed || value.length > maxLength) return;
    const submittedText = trimmed;
    setValue("");
    try {
      await onSubmit(submittedText);
    } catch {
      setValue((current) => (current ? current : submittedText));
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await doSubmit();
  }

  function submitOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void doSubmit();
  }

  function handleAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.currentTarget !== event.target) return;
    onAnimationEnd?.();
  }

  return (
    <div className={`composer-zone ${isExiting ? "is-exiting" : ""}`} onAnimationEnd={handleAnimationEnd}>
      <form className="composer" onSubmit={submit}>
        <input
          value={value}
          maxLength={maxLength}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={submitOnEnter}
          disabled={isExiting}
          placeholder={placeholder}
          aria-label={ariaLabel}
        />
        {nearLimit ? <span className="char-count">{maxLength - value.length}</span> : null}
        <button type="submit" disabled={isExiting || !trimmed} aria-label={ariaLabel}>
          <SendHorizonal size={19} />
        </button>
      </form>
    </div>
  );
}
