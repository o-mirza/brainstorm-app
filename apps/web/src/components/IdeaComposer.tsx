import { SendHorizonal } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { IDEA_TEXT_MAX_LENGTH } from "@brainstorm/shared";
import { composerVariants, easeStandard } from "../lib/animations";

type Props = {
  maxLength?: number;
  placeholder?: string;
  ariaLabel?: string;
  onSubmit: (text: string) => Promise<void>;
};

export default function IdeaComposer({
  maxLength = IDEA_TEXT_MAX_LENGTH,
  placeholder = "Add an idea",
  ariaLabel = "Add an idea",
  onSubmit
}: Props) {
  const [value, setValue] = useState("");
  const trimmed = value.trim();
  const nearLimit = value.length > maxLength - 30;

  async function doSubmit() {
    if (!trimmed || value.length > maxLength) return;
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

  return (
    <motion.div
      className="composer-zone"
      variants={composerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.24, ease: easeStandard }}
    >
      <form className="composer" onSubmit={submit}>
        <input
          value={value}
          maxLength={maxLength}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={submitOnEnter}
          placeholder={placeholder}
          aria-label={ariaLabel}
        />
        {nearLimit ? <span className="char-count">{maxLength - value.length}</span> : null}
        <button type="submit" disabled={!trimmed} aria-label={ariaLabel}>
          <SendHorizonal size={19} />
        </button>
      </form>
    </motion.div>
  );
}
