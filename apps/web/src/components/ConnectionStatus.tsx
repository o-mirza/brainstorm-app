import type { ConnectionStatus as Status } from "../lib/types";

export default function ConnectionStatus({ status, count }: { status: Status; count: number }) {
  const label = status === "connected" ? "Connected" : status === "reconnecting" ? "Reconnecting" : status;
  return (
    <div className="connection-status" aria-live="polite">
      <span className={`status-dot status-${status}`} />
      <span>{label}</span>
      <span>{count}</span>
    </div>
  );
}
