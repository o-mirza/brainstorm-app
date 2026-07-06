import type { Comment, Idea, ParticipantPermissions, RoomExportOptions } from "@brainstorm/shared";
import { AnimatePresence } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AdminPermissionsModal from "../components/AdminPermissionsModal";
import AISummaryModal from "../components/AISummaryModal";
import AppShell from "../components/AppShell";
import DeleteRoomModal from "../components/DeleteRoomModal";
import ExportDataModal from "../components/ExportDataModal";
import RecentRoomsDialog from "../components/RecentRoomsDialog";
import ShareOverlay from "../components/ShareOverlay";
import { useToast } from "../components/ToastProvider";
import { useParticipantId } from "../hooks/useParticipantId";
import { useRecentRooms } from "../hooks/useRecentRooms";
import { useRoom } from "../hooks/useRoom";
import { useRoomRealtime } from "../hooks/useRoomRealtime";
import { getAdminTokenFromSearch, getStoredRoomAdminToken, removeAdminTokenFromAddressBar, storeRoomAdminToken } from "../lib/adminAccess";
import { createRoom, generateAISummary, getRoomExportData } from "../lib/api";
import { getAdminRoomUrl, getRoomUrl } from "../lib/roomUrl";
import { downloadIdeasCsv } from "../lib/ideasCsv";

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
  const [aiSummaryOpen, setAISummaryOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const createdRoom = Boolean((location.state as { createdRoom?: boolean } | null)?.createdRoom);

  const onEvent = useCallback(roomState.applyServerEvent, [roomState.applyServerEvent]);
  const onUncertain = useCallback(() => {
    void roomState.actions.refresh();
  }, [roomState.actions.refresh]);
  const connectionStatus = useRoomRealtime({ roomSlug, participantId, adminToken, onEvent, onUncertain });

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
      setAISummaryOpen(false);
      setExportOpen(false);
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
  const canViewIdeas = roomState.isAdmin || (participantPermissions?.canViewIdeas ?? true);
  const canAddIdeas = roomState.isAdmin || Boolean(participantPermissions?.canAddIdeas);
  const canHeartIdeas = roomState.isAdmin || Boolean(participantPermissions?.canHeartIdeas);
  const canViewHeartCounts = roomState.isAdmin || (participantPermissions?.canViewHeartCounts ?? true);
  const ideaManagement = participantPermissions?.ideaManagement ?? "none";
  const canManageOwnIdeas = roomState.isAdmin || ideaManagement === "own" || ideaManagement === "anyone";
  const canManageAnyIdeas = roomState.isAdmin || ideaManagement === "anyone";
  const canViewComments = roomState.isAdmin || (participantPermissions?.canViewComments ?? true);
  const canAddComments = roomState.isAdmin || (participantPermissions?.canAddComments ?? true);
  const commentManagement = participantPermissions?.commentManagement ?? "none";
  const canManageOwnComments = roomState.isAdmin || commentManagement === "own" || commentManagement === "anyone";
  const canManageAnyComments = roomState.isAdmin || commentManagement === "anyone";
  const canExportData = roomState.isAdmin || (participantPermissions?.canExportData ?? true);
  const canGenerateSummary = roomState.isAdmin || Boolean(participantPermissions?.canGenerateSummary);
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
    if (!canExportData) {
      setExportOpen(false);
    }
  }, [canExportData]);

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

  async function createComment(ideaId: string, text: string) {
    try {
      await roomState.actions.createComment(ideaId, text);
    } catch (commentError) {
      toast.error("Could not create comment");
      throw commentError;
    }
  }

  async function updateComment(commentId: string, text: string) {
    try {
      await roomState.actions.updateComment(commentId, text);
    } catch (updateError) {
      toast.error("Could not save comment");
      throw updateError;
    }
  }

  async function deleteComment(comment: Comment) {
    try {
      const deletePromise = roomState.actions.deleteComment(comment);
      toast.success("Comment deleted");
      await deletePromise;
    } catch (deleteError) {
      toast.error("Could not delete comment");
      throw deleteError;
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

  async function exportData(options: RoomExportOptions) {
    try {
      const rows = await getRoomExportData(roomSlug, participantId, options, adminToken);
      downloadIdeasCsv(roomSlug, rows, options);
      setExportOpen(false);
      toast.success("CSV exported");
    } catch (exportError) {
      toast.error("Could not export data");
      throw exportError;
    }
  }

  if (roomState.loadState === "loading") {
    return (
      <main className="route-state route-state-pending">
        <h1>Loading room</h1>
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
        <AnimatePresence>
          {recentOpen ? <RecentRoomsDialog rooms={rooms} onClose={() => setRecentOpen(false)} /> : null}
        </AnimatePresence>
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
        <AnimatePresence>
          {recentOpen ? <RecentRoomsDialog rooms={rooms} onClose={() => setRecentOpen(false)} /> : null}
        </AnimatePresence>
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
        commentsByIdea={roomState.commentsByIdea}
        roomUrl={roomUrl}
        participantId={participantId}
        isAdmin={roomState.isAdmin}
        canViewIdeas={canViewIdeas}
        canAddIdeas={canAddIdeas}
        canManageOwnIdeas={canManageOwnIdeas}
        canManageAnyIdeas={canManageAnyIdeas}
        canHeartIdeas={canHeartIdeas}
        canViewHeartCounts={canViewHeartCounts}
        canViewComments={canViewComments}
        canAddComments={canAddComments}
        canManageOwnComments={canManageOwnComments}
        canManageAnyComments={canManageAnyComments}
        canExportData={canExportData}
        canGenerateSummary={canGenerateSummary}
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
        onShowAISummary={() => setAISummaryOpen(true)}
        onShowExportData={() => setExportOpen(true)}
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
        onLoadComments={roomState.actions.loadComments}
        onCreateComment={createComment}
        onUpdateComment={updateComment}
        onDeleteComment={deleteComment}
        onToggleHeart={toggleHeart}
        onUpdateIdea={updateIdea}
        onDeleteIdea={deleteIdea}
      />
      <AnimatePresence>
        {shareOverlayOpen ? <ShareOverlay key="share" roomUrl={roomUrl} onClose={() => setShareOverlayOpen(false)} /> : null}
        {aiSummaryOpen ? (
          <AISummaryModal
            key="ai-summary"
            roomSlug={roomSlug}
            onClose={() => setAISummaryOpen(false)}
            onGenerate={(slug) => generateAISummary(slug, participantId, adminToken)}
          />
        ) : null}
        {exportOpen ? (
          <ExportDataModal
            key="export"
            canViewHeartCounts={canViewHeartCounts}
            canViewComments={canViewComments}
            onClose={() => setExportOpen(false)}
            onExport={exportData}
          />
        ) : null}
        {permissionsOpen && adminUrl ? (
          <AdminPermissionsModal
            key="permissions"
            adminUrl={adminUrl}
            permissions={roomState.room.participantPermissions}
            onClose={() => setPermissionsOpen(false)}
            onUpdatePermissions={updateParticipantPermissions}
          />
        ) : null}
        {recentOpen ? <RecentRoomsDialog key="recent" rooms={rooms} onClose={() => setRecentOpen(false)} /> : null}
        {deleteOpen ? (
          <DeleteRoomModal
            key="delete"
            roomTitle={roomState.room.title}
            ideaCount={roomState.ideas.length}
            onClose={() => setDeleteOpen(false)}
            onConfirm={deleteRoom}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
