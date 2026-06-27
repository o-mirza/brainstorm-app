import { RECENT_ROOMS_LIMIT, type RecentRoom, type Room } from "@brainstorm/shared";
import { useCallback, useMemo, useSyncExternalStore } from "react";

const RECENT_KEY = "brainstorm.recentRooms";
let cachedRaw: string | null = null;
let cachedRooms: RecentRoom[] = [];

function readRecentRooms(): RecentRoom[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (raw === cachedRaw) return cachedRooms;
    cachedRaw = raw;
    if (!raw) {
      cachedRooms = [];
      return cachedRooms;
    }
    const parsed = JSON.parse(raw) as RecentRoom[];
    cachedRooms = parsed.sort((a, b) => b.lastVisitedAt.localeCompare(a.lastVisitedAt)).slice(0, RECENT_ROOMS_LIMIT);
    return cachedRooms;
  } catch {
    cachedRaw = null;
    cachedRooms = [];
    return cachedRooms;
  }
}

function writeRecentRooms(rooms: RecentRoom[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(rooms.slice(0, RECENT_ROOMS_LIMIT)));
  window.dispatchEvent(new Event("brainstorm:recentRooms"));
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("brainstorm:recentRooms", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("brainstorm:recentRooms", callback);
  };
}

export function useRecentRooms() {
  const rooms = useSyncExternalStore(subscribe, readRecentRooms, () => []);

  const rememberRoom = useCallback((room: Room, ideaCount?: number) => {
    const nextRoom: RecentRoom = {
      roomSlug: room.slug,
      title: room.title,
      lastVisitedAt: new Date().toISOString()
    };
    if (ideaCount !== undefined) {
      nextRoom.ideaCount = ideaCount;
    }
    const next = [nextRoom, ...readRecentRooms().filter((item) => item.roomSlug !== room.slug)];
    writeRecentRooms(next);
  }, []);

  const updateRoomTitle = useCallback((room: Room) => {
    const next = readRecentRooms().map((item) => (item.roomSlug === room.slug ? { ...item, title: room.title } : item));
    writeRecentRooms(next);
  }, []);

  return useMemo(() => ({ rooms, rememberRoom, updateRoomTitle }), [rememberRoom, rooms, updateRoomTitle]);
}
