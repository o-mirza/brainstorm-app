import type { AISummary } from "@brainstorm/shared";
import { Check, Copy, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { Fragment, type CSSProperties, type ReactNode, useCallback, useEffect, useState } from "react";
import { useToast } from "./ToastProvider";

type Props = {
  roomSlug: string;
  onClose: () => void;
  onGenerate: (roomSlug: string) => Promise<AISummary>;
};

type SummaryState =
  | { status: "loading"; summary?: undefined; error?: undefined }
  | { status: "loaded"; summary: AISummary; error?: undefined }
  | { status: "error"; summary?: undefined; error: string };

type ThemeBarStyle = CSSProperties & {
  "--bar-width": string;
  "--bar-delay": string;
};

const initialSummaryRequests = new Map<string, Promise<AISummary>>();
const loadingMessages = [
  "Reading the room...",
  "Connecting the dots...",
  "Finding the patterns..."
] as const;
const defaultLoadingMessage = loadingMessages[0];

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function renderBoldText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    nodes.push(<strong key={`strong-${match.index}`}>{match[1]}</strong>);
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function getListItem(line: string): { kind: "ordered" | "unordered"; text: string } | undefined {
  const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
  if (ordered?.[1]) {
    return { kind: "ordered", text: ordered[1] };
  }

  const unordered = line.match(/^\s*[-*]\s+(.+)$/);
  if (unordered?.[1]) {
    return { kind: "unordered", text: unordered[1] };
  }

  return undefined;
}

function SummaryProse({ prose }: { prose: string }) {
  const blocks = prose
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <>
      {blocks.map((block, index) => {
        const lines = block.split(/\n/).map((line) => line.trim()).filter(Boolean);
        const items = lines.map(getListItem);
        const listKind = items[0]?.kind;
        const isList = Boolean(listKind && items.every((item) => item?.kind === listKind));

        if (isList) {
          const ListTag = listKind === "ordered" ? "ol" : "ul";
          return (
            <ListTag key={index}>
              {items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderBoldText(item?.text ?? "")}</li>
              ))}
            </ListTag>
          );
        }

        return (
          <p key={index}>
            {lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {renderBoldText(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}

function ThemeChart({ summary }: { summary: AISummary }) {
  if (summary.themes.length === 0) {
    return null;
  }

  const maxCount = Math.max(...summary.themes.map((theme) => theme.count));

  return (
    <div className="ai-summary-chart" aria-label="Top themes">
      {summary.themes.map((theme, index) => {
        const width = maxCount > 0 ? `${Math.max((theme.count / maxCount) * 100, 8)}%` : "0%";
        return (
          <div className="ai-summary-bar-row" key={theme.label}>
            <div className="ai-summary-bar-label">
              <span>{theme.label}</span>
              <strong>{theme.count}</strong>
            </div>
            <div className="ai-summary-bar-track" aria-hidden="true">
              <div className="ai-summary-bar-fill" style={{ "--bar-width": width, "--bar-delay": `${index * 70}ms` } as ThemeBarStyle} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AISummaryModal({ roomSlug, onClose, onGenerate }: Props) {
  const toast = useToast();
  const [closing, setClosing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<SummaryState>({ status: "loading" });
  const [loadingMessage, setLoadingMessage] = useState(defaultLoadingMessage);

  const generate = useCallback(async (reuseInFlight = false) => {
    setState({ status: "loading" });
    try {
      let request = reuseInFlight ? initialSummaryRequests.get(roomSlug) : undefined;
      if (!request) {
        request = onGenerate(roomSlug);
        if (reuseInFlight) {
          initialSummaryRequests.set(roomSlug, request);
        }
      }
      const summary = await request;
      setState({ status: "loaded", summary });
    } catch (error) {
      setState({
        status: "error",
        error: error instanceof Error ? error.message : "Could not generate an AI summary right now."
      });
    } finally {
      if (reuseInFlight) {
        initialSummaryRequests.delete(roomSlug);
      }
    }
  }, [onGenerate, roomSlug]);

  useEffect(() => {
    void generate(true);
  }, [generate]);

  useEffect(() => {
    if (state.status !== "loading") {
      return;
    }

    let cancelled = false;

    void (async () => {
      if (prefersReducedMotion()) {
        setLoadingMessage(defaultLoadingMessage);
        return;
      }

      let messageIndex = 0;
      while (!cancelled) {
        const message = loadingMessages[messageIndex % loadingMessages.length] ?? defaultLoadingMessage;
        let nextMessage = "";
        setLoadingMessage(nextMessage);

        for (const char of message) {
          if (cancelled) return;
          nextMessage += char;
          setLoadingMessage(nextMessage);
          await sleep(28);
        }

        await sleep(900);

        while (nextMessage.length > 0) {
          if (cancelled) return;
          nextMessage = nextMessage.slice(0, -1);
          setLoadingMessage(nextMessage);
          await sleep(16);
        }

        await sleep(140);
        messageIndex += 1;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state.status]);

  function close() {
    setClosing(true);
    window.setTimeout(onClose, 140);
  }

  async function copySummary(prose: string) {
    try {
      await navigator.clipboard.writeText(prose);
      setCopied(true);
      toast.success("Copied summary");
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Could not copy summary");
    }
  }

  const generateLabel = state.status === "loaded" ? "Regenerate" : "Retry";

  return (
    <div className={`modal-backdrop ${closing ? "closing" : ""}`} role="presentation" onMouseDown={close}>
      <section
        className="edit-modal ai-summary-modal"
        role="dialog"
        aria-modal="true"
        aria-label="AI Summary"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div className="ai-summary-title">
            <Sparkles size={18} aria-hidden="true" />
            <h2>AI Summary</h2>
          </div>
          <button className="icon-button" type="button" onClick={close} aria-label="Close AI summary">
            <X size={18} />
          </button>
        </div>

        {state.status === "loading" ? (
          <div className="ai-summary-state" role="status" aria-label="Generating summary">
            <Loader2 className="spinner" size={18} aria-hidden="true" />
            <span className="ai-summary-loading-message" aria-hidden="true">{loadingMessage || "\u00a0"}</span>
          </div>
        ) : null}

        {state.status === "loaded" ? (
          <div className="ai-summary-content">
            <ThemeChart summary={state.summary} />
            <div className="ai-summary-copy">
              <div className="ai-summary-copy-head">
                <span>Summary</span>
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => {
                    void copySummary(state.summary.prose);
                  }}
                  aria-label="Copy summary"
                  title="Copy summary"
                >
                  {copied ? <Check size={17} /> : <Copy size={17} />}
                </button>
              </div>
              <div className="ai-summary-prose">
                <SummaryProse prose={state.summary.prose} />
              </div>
            </div>
          </div>
        ) : null}

        {state.status === "error" ? (
          <div className="ai-summary-state ai-summary-error">
            <p className="modal-error">{state.error}</p>
          </div>
        ) : null}

        <div className="modal-actions">
          <button type="button" onClick={close}>
            Close
          </button>
          <button type="button" onClick={() => void generate(false)} disabled={state.status === "loading"}>
            <RefreshCw size={15} aria-hidden="true" />
            {generateLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
