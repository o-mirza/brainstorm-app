import { SendHorizonal } from "lucide-react";
import { FormEvent, KeyboardEvent, useState } from "react";
import { IDEA_TEXT_MAX_LENGTH } from "@brainstorm/shared";

export default function IdeaComposer({ onSubmit }: { onSubmit: (text: string) => Promise<void> }) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const trimmed = value.trim();
  const nearLimit = value.length > IDEA_TEXT_MAX_LENGTH - 30;

  async function doSubmit() {
    if (!trimmed || pending || value.length > IDEA_TEXT_MAX_LENGTH) return;
    setPending(true);
    try {
      await onSubmit(trimmed);
      setValue("");
    } finally {
      setPending(false);
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
    <div className="composer-zone">
      <form className="composer" onSubmit={submit}>
        <input
          value={value}
          maxLength={IDEA_TEXT_MAX_LENGTH}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={submitOnEnter}
          placeholder="Add an idea"
          aria-label="Add an idea"
        />
        {nearLimit ? <span className="char-count">{IDEA_TEXT_MAX_LENGTH - value.length}</span> : null}
        <button type="submit" disabled={!trimmed || pending} aria-label="Submit idea">
          <SendHorizonal size={19} />
        </button>
      </form>
    </div>
  );
}
