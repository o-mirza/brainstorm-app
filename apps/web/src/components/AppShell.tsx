import type { Idea, RecentRoom, Room } from "@brainstorm/shared";
import { useEffect, useMemo, useState } from "react";
import { useMediaQuery } from "../hooks/useMediaQuery";
import type { ClientIdea } from "../hooks/useRoom";
import type { ConnectionStatus as Status } from "../lib/types";
import IdeaComposer from "./IdeaComposer";
import IdeaList from "./IdeaList";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

type Props = {
  room: Room;
  ideas: ClientIdea[];
  roomUrl: string;
  isAdmin: boolean;
  canAddIdeas: boolean;
  canEditIdeas: boolean;
  canDeleteIdeas: boolean;
  canHeartIdeas: boolean;
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
  onShowPermissions: () => void;
  onDeleteRoom: () => void;
  onCreateIdea: (text: string) => Promise<void>;
  onToggleHeart: (idea: Idea) => Promise<void>;
  onUpdateIdea: (ideaId: string, text: string) => Promise<void>;
  onDeleteIdea: (ideaId: string) => Promise<void>;
};

type SortOption = 'popular' | 'newest' | 'oldest' | 'my-hearts' | 'alphabetical';

export default function AppShell(props: Props) {
  const isMobile = useMediaQuery("(max-width: 860px)");
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [sortBy, setSortBy] = useState<SortOption>('popular');

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

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
            <div className="ideas-scroll">
              {props.ideas.length > 0 && (
                <div className="ideas-header">
                  <div className="ideas-count">
                    {props.ideas.length} {props.ideas.length === 1 ? "idea" : "ideas"}
                  </div>
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
              )}
              <IdeaList
                ideas={sortedIdeas}
                onToggleHeart={props.onToggleHeart}
                onUpdate={props.onUpdateIdea}
                onDelete={props.onDeleteIdea}
                canAdd={props.canAddIdeas}
                canHeart={props.canHeartIdeas}
                canEdit={props.canEditIdeas}
                canDelete={props.canDeleteIdeas}
              />
            </div>
            {props.canAddIdeas ? <IdeaComposer key={props.room.slug} onSubmit={props.onCreateIdea} /> : null}
          </div>
        </main>
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        {renderSidebar()}
      </div>
    </div>
  );
}
