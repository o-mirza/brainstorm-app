import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useToast } from "./ToastProvider";

export default function CopyLinkButton({ value, label = "Copy link" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <button className="icon-button" type="button" onClick={copy} aria-label={label} title={label}>
      {copied ? <Check size={18} /> : <Copy size={18} />}
    </button>
  );
}
