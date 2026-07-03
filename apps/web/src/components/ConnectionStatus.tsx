import type { ConnectionStatus as Status } from "../lib/types";

export default function ConnectionStatus({ status, count }: { status: Status; count: number }) {
  const statusLabels: Record<Status, string> = {
    idle: "Connecting",
    connecting: "Connecting",
    connected: count === 1 ? "1 person here" : `${count} people here`,
    disconnected: "Disconnected",
    reconnecting: "Reconnecting",
    stale: "Sync issue"
  };
  const label = statusLabels[status];
  const showCount = status === "connected";

  return (
    <div className="connection-status" aria-live="polite">
      <span className={`status-dot status-${status}`} />
      <span className="connection-status-label">{label}</span>
      {showCount ? <span className="connection-status-count">{count}</span> : null}
    </div>
  );
}
