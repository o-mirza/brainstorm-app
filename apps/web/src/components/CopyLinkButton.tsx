import { Check, Copy } from "lucide-react";
import { useState } from "react";

export default function CopyLinkButton({ value, label = "Copy link" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button className="icon-button" type="button" onClick={copy} aria-label={label} title={label}>
      {copied ? <Check size={18} /> : <Copy size={18} />}
    </button>
  );
}
