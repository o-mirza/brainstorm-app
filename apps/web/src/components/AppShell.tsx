import type { Comment, Idea, RecentRoom, Room } from "@brainstorm/shared";
import { COMMENT_TEXT_MAX_LENGTH } from "@brainstorm/shared";
import { ArrowLeft, Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { useMediaQuery } from "../hooks/useMediaQuery";
import type { ClientComment, ClientIdea } from "../hooks/useRoom";
import { downloadIdeasCsv } from "../lib/ideasCsv";
import type { ConnectionStatus as Status } from "../lib/types";
import CommentThread from "./CommentThread";
import IdeaCard from "./IdeaCard";
import IdeaComposer from "./IdeaComposer";
import IdeaList from "./IdeaList";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

type Props = {
  room: Room;
  ideas: ClientIdea[];
  commentsByIdea: Record<string, ClientComment[]>;
  roomUrl: string;
  participantId: string;
  isAdmin: boolean;
  canAddIdeas: boolean;
  canEditIdeas: boolean;
  canDeleteIdeas: boolean;
  canHeartIdeas: boolean;
  canComment: boolean;
  canRenameRoom: boolean;
  canDeleteRoom: boolean;
  participantCount: number;
  status: Status;
  recentRooms: RecentRoom[];
  animateGeneratedTitle: boolean;
  onRename: (title: string) => Promise<void>;
  onCreateRoom: () => void;
  onShowRecent: () => void;
  onOpenShareOverlay: () => void;
  onShowAISummary: () => void;
  onShowPermissions: () => void;
  onDeleteRoom: () => void;
  onCreateIdea: (text: string) => Promise<void>;
  onLoadComments: (ideaId: string) => Promise<Comment[]>;
  onCreateComment: (ideaId: string, text: string) => Promise<void>;
  onUpdateComment: (commentId: string, text: string) => Promise<void>;
  onDeleteComment: (comment: Comment) => Promise<void>;
  onToggleHeart: (idea: Idea) => Promise<void>;
  onUpdateIdea: (ideaId: string, text: string) => Promise<void>;
  onDeleteIdea: (ideaId: string) => Promise<void>;
};

type SortOption = 'popular' | 'newest' | 'oldest' | 'my-hearts' | 'alphabetical';

type ComposerPresence = {
  id: string;
  isExiting: boolean;
  mode: ComposerMode;
};

type ComposerMode =
  | {
      kind: "idea";
      key: string;
    }
  | {
      kind: "comment";
      key: string;
      ideaId: string;
    };

function sameComposerMode(left: ComposerMode | null, right: ComposerMode | null): boolean {
  return left?.kind === right?.kind && left?.key === right?.key;
}

function composerModeId(mode: ComposerMode): string {
  return `${mode.kind}:${mode.key}`;
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

function updateWithViewTransition(update: () => void) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const startViewTransition = (document as ViewTransitionDocument).startViewTransition;

  if (reduceMotion || !startViewTransition) {
    update();
    return;
  }

  startViewTransition.call(document, () => {
    flushSync(update);
  });
}

export default function AppShell(props: Props) {
  const isMobile = useMediaQuery("(max-width: 860px)");
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const initialComposerMode = props.canAddIdeas ? { kind: "idea" as const, key: props.room.slug } : null;
  const [composerPresences, setComposerPresences] = useState<ComposerPresence[]>(() =>
    initialComposerMode ? [{ id: composerModeId(initialComposerMode), isExiting: false, mode: initialComposerMode }] : []
  );

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const selectedIdea = useMemo(
    () => props.ideas.find((idea) => idea.id === selectedIdeaId) ?? null,
    [props.ideas, selectedIdeaId]
  );

  useEffect(() => {
    if (selectedIdeaId && !selectedIdea) {
      setSelectedIdeaId(null);
    }
  }, [selectedIdea, selectedIdeaId]);

  const desiredComposerMode = useMemo<ComposerMode | null>(() => {
    if (selectedIdea) {
      return props.canComment ? { kind: "comment", key: selectedIdea.id, ideaId: selectedIdea.id } : null;
    }
    return props.canAddIdeas ? { kind: "idea", key: props.room.slug } : null;
  }, [props.canAddIdeas, props.canComment, props.room.slug, selectedIdea]);

  useEffect(() => {
    setComposerPresences((current) => {
      const desiredId = desiredComposerMode ? composerModeId(desiredComposerMode) : null;
      const hasDesired = desiredId ? current.some((presence) => presence.id === desiredId) : false;
      const next = current.map((presence) => ({
        ...presence,
        isExiting: presence.id !== desiredId
      }));

      if (desiredComposerMode && desiredId && !hasDesired) {
        next.push({ id: desiredId, isExiting: false, mode: desiredComposerMode });
      }

      return next;
    });
  }, [desiredComposerMode]);

  function toggleSidebar() {
    setSidebarOpen((open) => !open);
  }

  function handleSidebarAction(action: () => void) {
    action();
    if (isMobile) {
      setSidebarOpen(false);
    }
  }

  function renderSidebar() {
    return (
      <Sidebar
        roomUrl={props.roomUrl}
        isAdmin={props.isAdmin}
        canDeleteRoom={props.canDeleteRoom}
        recentRooms={props.recentRooms}
        onCreateRoom={() => handleSidebarAction(props.onCreateRoom)}
        onShowRecent={() => handleSidebarAction(props.onShowRecent)}
        onOpenShareOverlay={() => handleSidebarAction(props.onOpenShareOverlay)}
        onShowAISummary={() => handleSidebarAction(props.onShowAISummary)}
        onShowPermissions={() => handleSidebarAction(props.onShowPermissions)}
        onDeleteRoom={() => handleSidebarAction(props.onDeleteRoom)}
      />
    );
  }

  const sortedIdeas = useMemo(() => {
    const list = [...props.ideas];
    switch (sortBy) {
      case 'newest':
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'oldest':
        return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'my-hearts':
        return list.sort((a, b) => {
          if (a.heartedByMe !== b.heartedByMe) {
            return a.heartedByMe ? -1 : 1;
          }
          if (b.heartCount !== a.heartCount) {
            return b.heartCount - a.heartCount;
          }
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
      case 'alphabetical':
        return list.sort((a, b) => a.text.localeCompare(b.text));
      case 'popular':
      default:
        return props.ideas;
    }
  }, [props.ideas, sortBy]);

  const getSortLabel = (option: SortOption) => {
    switch (option) {
      case 'popular': return 'Popular';
      case 'newest': return 'Newest';
      case 'oldest': return 'Oldest';
      case 'my-hearts': return 'My Hearts';
      case 'alphabetical': return 'A-Z';
    }
  };

  function exportIdeasCsv() {
    downloadIdeasCsv(props.room.slug, sortedIdeas);
  }

  function openComments(ideaId: string) {
    updateWithViewTransition(() => setSelectedIdeaId(ideaId));
  }

  function closeComments() {
    updateWithViewTransition(() => setSelectedIdeaId(null));
  }

  useEffect(() => {
    if (!composerPresences.some((presence) => presence.isExiting)) return;
    const timeout = window.setTimeout(() => {
      setComposerPresences((current) => current.filter((presence) => !presence.isExiting));
    }, 320);
    return () => window.clearTimeout(timeout);
  }, [composerPresences]);

  function handleComposerAnimationEnd(id: string) {
    setComposerPresences((current) => current.filter((presence) => presence.id !== id || !presence.isExiting));
  }

  function renderComposer(presence: ComposerPresence) {
    if (presence.mode.kind === "comment") {
      const ideaId = presence.mode.ideaId;
      return (
        <IdeaComposer
          key={presence.id}
          isExiting={presence.isExiting}
          maxLength={COMMENT_TEXT_MAX_LENGTH}
          placeholder="Add a comment"
          ariaLabel="Submit comment"
          onAnimationEnd={() => handleComposerAnimationEnd(presence.id)}
          onSubmit={(text) => props.onCreateComment(ideaId, text)}
        />
      );
    }

    return (
      <IdeaComposer
        key={presence.id}
        isExiting={presence.isExiting}
        onAnimationEnd={() => handleComposerAnimationEnd(presence.id)}
        onSubmit={props.onCreateIdea}
      />
    );
  }

  return (
    <div className={`app ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <TopBar
        room={props.room}
        participantCount={props.participantCount}
        status={props.status}
        animateGeneratedTitle={props.animateGeneratedTitle}
        canManageRoom={props.canRenameRoom}
        onRename={props.onRename}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
      />
      <div className="app-content">
        <main className="board">
          <div className="ideas-wrap">
            <div className={`ideas-scroll ${selectedIdea ? "comment-mode" : "list-mode"}`}>
              {selectedIdea ? (
                <div className="comment-page">
                  <button type="button" className="comment-back-button" onClick={closeComments}>
                    <ArrowLeft size={18} />
                    <span>Back</span>
                  </button>
                  <IdeaCard
                    idea={selectedIdea}
                    onToggleHeart={props.onToggleHeart}
                    onUpdate={props.onUpdateIdea}
                    onDelete={props.onDeleteIdea}
                    onOpenComments={() => undefined}
                    canHeart={props.canHeartIdeas}
                    canEdit={props.canEditIdeas}
                    canDelete={props.canDeleteIdeas}
                  />
                  <CommentThread
                    ideaId={selectedIdea.id}
                    comments={props.commentsByIdea[selectedIdea.id]}
                    participantId={props.participantId}
                    isAdmin={props.isAdmin}
                    onLoad={props.onLoadComments}
                    onUpdate={props.onUpdateComment}
                    onDelete={props.onDeleteComment}
                  />
                </div>
              ) : (
                <>
                  {props.ideas.length > 0 && (
                    <div className="ideas-header">
                      <div className="ideas-count">
                        {props.ideas.length} {props.ideas.length === 1 ? "idea" : "ideas"}
                      </div>
                      <div className="ideas-actions">
                        <button
                          type="button"
                          className="export-csv-button"
                          onClick={exportIdeasCsv}
                          aria-label="Export ideas as CSV"
                          title="Export ideas as CSV"
                        >
                          <Download size={16} aria-hidden="true" />
                        </button>
                        <div className="ideas-sort">
                          <label htmlFor="sort-select" className="sr-only">Sort by</label>
                          <div className="sort-select-wrapper">
                            <select
                              id="sort-select"
                              value={sortBy}
                              onChange={(e) => setSortBy(e.target.value as SortOption)}
                            >
                              <option value="popular">Popular</option>
                              <option value="newest">Newest</option>
                              <option value="oldest">Oldest</option>
                              <option value="my-hearts">My Hearts</option>
                              <option value="alphabetical">A-Z</option>
                            </select>
                            <span className="sort-trigger">
                              Sort by: <strong>{getSortLabel(sortBy)}</strong>
                              <svg viewBox="0 0 24 24" width="14" height="14" className="chevron-icon">
                                <path d="M7 10l5 5 5-5z" fill="currentColor" />
                              </svg>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <IdeaList
                    ideas={sortedIdeas}
                    onToggleHeart={props.onToggleHeart}
                    onUpdate={props.onUpdateIdea}
                    onDelete={props.onDeleteIdea}
                    onOpenComments={openComments}
                    canAdd={props.canAddIdeas}
                    canHeart={props.canHeartIdeas}
                    canEdit={props.canEditIdeas}
                    canDelete={props.canDeleteIdeas}
                  />
                </>
              )}
            </div>
            {composerPresences.map(renderComposer)}
          </div>
        </main>
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        {renderSidebar()}
      </div>
    </div>
  );
}
