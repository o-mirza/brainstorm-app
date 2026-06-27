import type { ServerWsEvent } from "@brainstorm/shared";
import { useEffect, useRef, useState } from "react";
import type { ConnectionStatus } from "../lib/types";
import { WS_BASE_URL } from "../lib/websocket";

type Options = {
  roomSlug: string;
  participantId: string;
  onEvent: (event: ServerWsEvent) => void;
  onUncertain: () => void;
};

export function useRoomRealtime({ roomSlug, participantId, onEvent, onUncertain }: Options): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const retryRef = useRef(500);
  const reconnectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let closedByEffect = false;

    function connect() {
      setStatus((current) => (current === "disconnected" ? "reconnecting" : "connecting"));
      socket = new WebSocket(`${WS_BASE_URL}/ws`);

      socket.addEventListener("open", () => {
        retryRef.current = 500;
        setStatus("connected");
        socket?.send(JSON.stringify({ type: "room.subscribe", roomSlug, participantId }));
      });

      socket.addEventListener("message", (message) => {
        try {
          const event = JSON.parse(message.data as string) as ServerWsEvent;
          if (event.type === "error") {
            setStatus("stale");
            onUncertain();
            return;
          }
          onEvent(event);
        } catch {
          setStatus("stale");
          onUncertain();
        }
      });

      socket.addEventListener("close", () => {
        if (closedByEffect) return;
        setStatus("disconnected");
        const delay = retryRef.current;
        retryRef.current = Math.min(delay * 2, 5000);
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      });

      socket.addEventListener("error", () => {
        socket?.close();
      });
    }

    connect();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        onUncertain();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      closedByEffect = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      socket?.close();
    };
  }, [onEvent, onUncertain, participantId, roomSlug]);

  return status;
}
