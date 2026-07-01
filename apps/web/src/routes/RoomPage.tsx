import type { Idea, ParticipantPermissions } from "@brainstorm/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AdminPermissionsModal from "../components/AdminPermissionsModal";
import AppShell from "../components/AppShell";
import DeleteRoomModal from "../components/DeleteRoomModal";
import RecentRoomsDialog from "../components/RecentRoomsDialog";
import ShareOverlay from "../components/ShareOverlay";
import { useToast } from "../components/ToastProvider";
import { useParticipantId } from "../hooks/useParticipantId";
import { useRecentRooms } from "../hooks/useRecentRooms";
import { useRoom } from "../hooks/useRoom";
import { useRoomRealtime } from "../hooks/useRoomRealtime";
import { getAdminTokenFromSearch, getStoredRoomAdminToken, removeAdminTokenFromAddressBar, storeRoomAdminToken } from "../lib/adminAccess";
import { createRoom } from "../lib/api";
import { getAdminRoomUrl, getRoomUrl } from "../lib/roomUrl";

const LOADING_DOT_SEQUENCE = ["", ".", "..", "..."] as const;

export default function RoomPage() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const roomSlug = params.roomSlug ?? "";
  const participantId = useParticipantId();
  const adminTokenFromUrl = useMemo(() => getAdminTokenFromSearch(location.search), [location.search]);
  const [adminToken, setAdminToken] = useState<string | undefined>(() => adminTokenFromUrl ?? getStoredRoomAdminToken(roomSlug));
  const { rooms, rememberRoom, removeRoom, updateRoomTitle } = useRecentRooms();
  const roomState = useRoom(roomSlug, participantId, adminToken);
  const [shareOverlayOpen, setShareOverlayOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loadingDotIndex, setLoadingDotIndex] = useState(0);
  const createdRoom = Boolean((location.state as { createdRoom?: boolean } | null)?.createdRoom);

  const onEvent = useCallback(roomState.applyServerEvent, [roomState.applyServerEvent]);
  const onUncertain = useCallback(() => {
    void roomState.actions.refresh();
  }, [roomState.actions.refresh]);
  const connectionStatus = useRoomRealtime({ roomSlug, participantId, onEvent, onUncertain });

  useEffect(() => {
    setAdminToken(adminTokenFromUrl ?? getStoredRoomAdminToken(roomSlug));
  }, [adminTokenFromUrl, roomSlug]);

  useEffect(() => {
    if (roomState.room) {
      rememberRoom(roomState.room, roomState.ideas.length);
    }
  }, [rememberRoom, roomState.ideas.length, roomState.room]);

  useEffect(() => {
    if (roomState.loadState === "deleted") {
      removeRoom(roomSlug);
      setShareOverlayOpen(false);
      setPermissionsOpen(false);
      setDeleteOpen(false);
    }
  }, [removeRoom, roomSlug, roomState.loadState]);

  useEffect(() => {
    if (!adminTokenFromUrl || (roomState.loadState !== "ready" && roomState.loadState !== "not-found" && roomState.loadState !== "deleted")) return;
    if (adminToken !== adminTokenFromUrl) return;
    if (roomState.isAdmin) {
      storeRoomAdminToken(roomSlug, adminTokenFromUrl);
      setAdminToken(adminTokenFromUrl);
    } else {
      setAdminToken(getStoredRoomAdminToken(roomSlug));
    }
    removeAdminTokenFromAddressBar();
  }, [adminToken, adminTokenFromUrl, roomSlug, roomState.isAdmin, roomState.loadState]);

  const roomUrl = useMemo(() => getRoomUrl(roomSlug), [roomSlug]);
  const adminUrl = useMemo(() => (roomState.isAdmin && adminToken ? getAdminRoomUrl(roomSlug, adminToken) : undefined), [adminToken, roomSlug, roomState.isAdmin]);
  const participantPermissions = roomState.room?.participantPermissions;
  const canAddIdeas = roomState.isAdmin || Boolean(participantPermissions?.canAddIdeas);
  const canEditIdeas = roomState.isAdmin || Boolean(participantPermissions?.canEditIdeas);
  const canDeleteIdeas = roomState.isAdmin || Boolean(participantPermissions?.canDeleteIdeas);
  const canHeartIdeas = roomState.isAdmin || Boolean(participantPermissions?.canHeartIdeas);
  const canRenameRoom = roomState.isAdmin || Boolean(participantPermissions?.canRenameRoom);
  const canDeleteRoom = roomState.isAdmin || Boolean(participantPermissions?.canDeleteRoom);

  useEffect(() => {
    if (!roomState.isAdmin) {
      setPermissionsOpen(false);
    }
  }, [roomState.isAdmin]);

  useEffect(() => {
    if (!canDeleteRoom) {
      setDeleteOpen(false);
    }
  }, [canDeleteRoom]);

  useEffect(() => {
    if (roomState.loadState !== "loading") return;

    setLoadingDotIndex(0);
    const intervalId = window.setInterval(() => {
      setLoadingDotIndex((currentIndex) => (currentIndex + 1) % LOADING_DOT_SEQUENCE.length);
    }, 400);

    return () => window.clearInterval(intervalId);
  }, [roomState.loadState]);

  async function createNewRoom() {
    try {
      const { room, adminToken: nextAdminToken } = await createRoom();
      storeRoomAdminToken(room.slug, nextAdminToken);
      rememberRoom(room, 0);
      navigate(`/r/${room.slug}`, { state: { createdRoom: true } });
    } catch {
      toast.error("Could not create room");
    }
  }

  async function rename(title: string) {
    try {
      const room = await roomState.actions.renameRoom(title);
      updateRoomTitle(room);
    } catch (renameError) {
      toast.error("Could not rename room");
      throw renameError;
    }
  }

  async function updateIdea(ideaId: string, text: string) {
    try {
      await roomState.actions.updateIdea(ideaId, text);
    } catch (updateError) {
      toast.error("Could not save idea");
      throw updateError;
    }
  }

  async function deleteIdea(ideaId: string) {
    try {
      const deletePromise = roomState.actions.deleteIdea(ideaId);
      toast.success("Idea deleted");
      await deletePromise;
    } catch (deleteError) {
      toast.error("Could not delete idea");
      throw deleteError;
    }
  }

  async function toggleHeart(idea: Idea) {
    try {
      await roomState.actions.toggleHeart(idea);
    } catch (heartError) {
      toast.error(idea.heartedByMe ? "Could not remove heart" : "Could not heart idea");
      throw heartError;
    }
  }

  async function deleteRoom() {
    try {
      await roomState.actions.deleteRoom();
      removeRoom(roomSlug);
      toast.success("Room deleted");
    } catch (deleteError) {
      toast.error("Could not delete room");
      throw deleteError;
    }
  }

  async function updateParticipantPermissions(permissions: ParticipantPermissions) {
    await roomState.actions.updatePermissions(permissions);
  }

  if (roomState.loadState === "loading") {
    return (
      <main className="route-state">
        <h1>Loading room{LOADING_DOT_SEQUENCE[loadingDotIndex]}</h1>
      </main>
    );
  }

  if (roomState.loadState === "not-found") {
    return (
      <>
        <main className="route-state">
          <h1>Room does not exist</h1>
          <button type="button" onClick={() => void createNewRoom()}>
            New room
          </button>
          <button
            type="button"
            className="link-button"
            onClick={() => setRecentOpen(true)}
          >
            Recent rooms
          </button>
        </main>
        {recentOpen ? <RecentRoomsDialog rooms={rooms} onClose={() => setRecentOpen(false)} /> : null}
      </>
    );
  }

  if (roomState.loadState === "deleted") {
    return (
      <>
        <main className="route-state">
          <h1>Room deleted</h1>
          <p>This room and its ideas were deleted for everyone with the link.</p>
          <button type="button" onClick={() => void createNewRoom()}>
            New room
          </button>
          <button
            type="button"
            className="link-button"
            onClick={() => setRecentOpen(true)}
          >
            Recent rooms
          </button>
        </main>
        {recentOpen ? <RecentRoomsDialog rooms={rooms} onClose={() => setRecentOpen(false)} /> : null}
      </>
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
        isAdmin={roomState.isAdmin}
        canAddIdeas={canAddIdeas}
        canEditIdeas={canEditIdeas}
        canDeleteIdeas={canDeleteIdeas}
        canHeartIdeas={canHeartIdeas}
        canRenameRoom={canRenameRoom}
        canDeleteRoom={canDeleteRoom}
        participantCount={roomState.participantCount}
        status={connectionStatus}
        recentRooms={rooms}
        animateGeneratedTitle={createdRoom}
        onRename={rename}
        onCreateRoom={() => void createNewRoom()}
        onShowRecent={() => setRecentOpen(true)}
        onOpenShareOverlay={() => setShareOverlayOpen(true)}
        onShowPermissions={() => setPermissionsOpen(true)}
        onDeleteRoom={() => setDeleteOpen(true)}
        onCreateIdea={async (text) => {
          try {
            await roomState.actions.createIdea(text);
          } catch (createError) {
            toast.error("Could not create idea");
            throw createError;
          }
        }}
        onToggleHeart={toggleHeart}
        onUpdateIdea={updateIdea}
        onDeleteIdea={deleteIdea}
      />
      {shareOverlayOpen ? <ShareOverlay roomUrl={roomUrl} onClose={() => setShareOverlayOpen(false)} /> : null}
      {permissionsOpen && adminUrl ? (
        <AdminPermissionsModal
          adminUrl={adminUrl}
          permissions={roomState.room.participantPermissions}
          onClose={() => setPermissionsOpen(false)}
          onUpdatePermissions={updateParticipantPermissions}
        />
      ) : null}
      {recentOpen ? <RecentRoomsDialog rooms={rooms} onClose={() => setRecentOpen(false)} /> : null}
      {deleteOpen ? (
        <DeleteRoomModal
          roomTitle={roomState.room.title}
          ideaCount={roomState.ideas.length}
          onClose={() => setDeleteOpen(false)}
          onConfirm={deleteRoom}
        />
      ) : null}
    </>
  );
}
