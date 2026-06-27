import type { Idea } from "@brainstorm/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import RecentRoomsDialog from "../components/RecentRoomsDialog";
import ShareDrawer from "../components/ShareDrawer";
import ShareOverlay from "../components/ShareOverlay";
import { useParticipantId } from "../hooks/useParticipantId";
import { useRecentRooms } from "../hooks/useRecentRooms";
import { useRoom } from "../hooks/useRoom";
import { useRoomRealtime } from "../hooks/useRoomRealtime";
import { createRoom } from "../lib/api";
import { getRoomUrl } from "../lib/roomUrl";

export default function RoomPage() {
  const params = useParams();
  const navigate = useNavigate();
  const roomSlug = params.roomSlug ?? "";
  const participantId = useParticipantId();
  const recent = useRecentRooms();
  const roomState = useRoom(roomSlug, participantId);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shareOverlayOpen, setShareOverlayOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);

  const onEvent = useCallback(roomState.applyServerEvent, [roomState.applyServerEvent]);
  const onUncertain = useCallback(() => {
    void roomState.actions.refresh();
  }, [roomState.actions]);
  const connectionStatus = useRoomRealtime({ roomSlug, participantId, onEvent, onUncertain });

  useEffect(() => {
    if (roomState.room) {
      recent.rememberRoom(roomState.room, roomState.ideas.length);
    }
  }, [recent, roomState.ideas.length, roomState.room]);

  const roomUrl = useMemo(() => getRoomUrl(roomSlug), [roomSlug]);

  async function createNewRoom() {
    const room = await createRoom();
    recent.rememberRoom(room, 0);
    navigate(`/r/${room.slug}`);
  }

  async function rename(title: string) {
    const room = await roomState.actions.renameRoom(title);
    recent.updateRoomTitle(room);
  }

  async function updateIdea(ideaId: string, text: string) {
    await roomState.actions.updateIdea(ideaId, text);
  }

  async function deleteIdea(ideaId: string) {
    await roomState.actions.deleteIdea(ideaId);
  }

  async function toggleHeart(idea: Idea) {
    await roomState.actions.toggleHeart(idea);
  }

  if (roomState.loadState === "loading") {
    return (
      <main className="route-state">
        <h1>Loading room</h1>
      </main>
    );
  }

  if (roomState.loadState === "not-found") {
    return (
      <main className="route-state">
        <h1>Room does not exist</h1>
        <button type="button" onClick={() => void createNewRoom()}>
          Create a new room
        </button>
        <Link to="/">Start over</Link>
      </main>
    );
  }

  if (!roomState.room) {
    return (
      <main className="route-state">
        <h1>Room could not be loaded</h1>
        <p>{roomState.error}</p>
      </main>
    );
  }

  return (
    <>
      <AppShell
        room={roomState.room}
        ideas={roomState.ideas}
        roomUrl={roomUrl}
        participantCount={roomState.participantCount}
        status={connectionStatus}
        recentRooms={recent.rooms}
        onRename={rename}
        onOpenShare={() => setDrawerOpen(true)}
        onCreateRoom={() => void createNewRoom()}
        onShowRecent={() => setRecentOpen(true)}
        onExpandShare={() => setShareOverlayOpen(true)}
        onCreateIdea={async (text) => {
          await roomState.actions.createIdea(text);
        }}
        onToggleHeart={toggleHeart}
        onUpdateIdea={updateIdea}
        onDeleteIdea={deleteIdea}
      />
      <ShareDrawer
        open={drawerOpen}
        roomUrl={roomUrl}
        recentRooms={recent.rooms}
        onClose={() => setDrawerOpen(false)}
        onCreateRoom={() => void createNewRoom()}
        onShowRecent={() => setRecentOpen(true)}
        onExpand={() => setShareOverlayOpen(true)}
      />
      {shareOverlayOpen ? <ShareOverlay roomUrl={roomUrl} onClose={() => setShareOverlayOpen(false)} /> : null}
      {recentOpen ? <RecentRoomsDialog rooms={recent.rooms} onClose={() => setRecentOpen(false)} /> : null}
    </>
  );
}
