import type { ClientWsEvent, ServerWsEvent } from "@brainstorm/shared";
import { nanoid } from "nanoid";
import type { db } from "../../db/client.js";
import { getRoomBySlug, getRoomSnapshot } from "../rooms/room.service.js";

type SocketLike = {
  send(data: string): void;
  close(): void;
  on(event: "message", handler: (message: Buffer | string) => void): void;
  on(event: "close" | "error", handler: () => void): void;
};

type ConnectionState = {
  id: string;
  socket: SocketLike;
  participantId: string | null;
  roomSlugs: Set<string>;
};

export class RealtimeGateway {
  private readonly connections = new Map<string, ConnectionState>();
  private readonly roomConnections = new Map<string, Set<string>>();

  constructor(private readonly database: typeof db) {}

  register(socket: SocketLike): string {
    const connectionId = nanoid(12);
    this.connections.set(connectionId, {
      id: connectionId,
      socket,
      participantId: null,
      roomSlugs: new Set()
    });
    return connectionId;
  }

  async handleEvent(connectionId: string, event: ClientWsEvent): Promise<void> {
    if (event.type === "ping") {
      this.send(connectionId, { type: "pong" });
      return;
    }

    if (event.type === "room.subscribe") {
      await this.subscribe(connectionId, event.roomSlug, event.participantId);
      return;
    }

    this.unsubscribe(connectionId, event.roomSlug);
  }

  async subscribe(connectionId: string, roomSlug: string, participantId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    await getRoomBySlug(roomSlug);
    connection.participantId = participantId;
    connection.roomSlugs.add(roomSlug);

    const roomSet = this.roomConnections.get(roomSlug) ?? new Set<string>();
    roomSet.add(connectionId);
    this.roomConnections.set(roomSlug, roomSet);

    this.send(connectionId, {
      type: "room.snapshot",
      snapshot: await getRoomSnapshot(roomSlug, participantId, this.getParticipantCount(roomSlug))
    });
    this.broadcastParticipantCount(roomSlug);
  }

  unsubscribe(connectionId: string, roomSlug: string): void {
    const connection = this.connections.get(connectionId);
    connection?.roomSlugs.delete(roomSlug);

    const roomSet = this.roomConnections.get(roomSlug);
    if (!roomSet) return;
    roomSet.delete(connectionId);
    if (roomSet.size === 0) {
      this.roomConnections.delete(roomSlug);
    }
    this.broadcastParticipantCount(roomSlug);
  }

  disconnect(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const roomSlugs = [...connection.roomSlugs];
    this.connections.delete(connectionId);
    for (const roomSlug of roomSlugs) {
      const roomSet = this.roomConnections.get(roomSlug);
      roomSet?.delete(connectionId);
      if (roomSet?.size === 0) {
        this.roomConnections.delete(roomSlug);
      }
      this.broadcastParticipantCount(roomSlug);
    }
  }

  broadcastRoom(roomSlug: string, event: ServerWsEvent): void {
    const roomSet = this.roomConnections.get(roomSlug);
    if (!roomSet) return;

    for (const connectionId of roomSet) {
      this.send(connectionId, event);
    }
  }

  send(connectionId: string, event: ServerWsEvent): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      connection.socket.send(JSON.stringify(event));
    } catch {
      this.disconnect(connectionId);
    }
  }

  getParticipantCount(roomSlug: string): number {
    return this.roomConnections.get(roomSlug)?.size ?? 0;
  }

  close(): void {
    for (const connection of this.connections.values()) {
      connection.socket.close();
    }
    this.connections.clear();
    this.roomConnections.clear();
  }

  private broadcastParticipantCount(roomSlug: string): void {
    this.broadcastRoom(roomSlug, {
      type: "participant.count",
      roomSlug,
      count: this.getParticipantCount(roomSlug)
    });
  }
}
