import type { Idea, RecentRoom, Room } from "@brainstorm/shared";
import { useEffect, useState } from "react";
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
  participantCount: number;
  status: Status;
  recentRooms: RecentRoom[];
  animateGeneratedTitle: boolean;
  onRename: (title: string) => Promise<void>;
  onCreateRoom: () => void;
  onShowRecent: () => void;
  onExpandShare: () => void;
  onCreateIdea: (text: string) => Promise<void>;
  onToggleHeart: (idea: Idea) => Promise<void>;
  onUpdateIdea: (ideaId: string, text: string) => Promise<void>;
  onDeleteIdea: (ideaId: string) => Promise<void>;
};

export default function AppShell(props: Props) {
  const isMobile = useMediaQuery("(max-width: 860px)");
  const [shareOpen, setShareOpen] = useState(!isMobile);

  useEffect(() => {
    setShareOpen(!isMobile);
  }, [isMobile]);

  function toggleSidebar() {
    setShareOpen((open) => !open);
  }

  function renderSidebar() {
    return (
      <Sidebar
        roomUrl={props.roomUrl}
        recentRooms={props.recentRooms}
        onCreateRoom={props.onCreateRoom}
        onShowRecent={props.onShowRecent}
        onExpand={props.onExpandShare}
      />
    );
  }

  return (
    <div className={`app ${shareOpen ? "share-open" : "share-closed"}`}>
      <TopBar
        room={props.room}
        participantCount={props.participantCount}
        status={props.status}
        animateGeneratedTitle={props.animateGeneratedTitle}
        onRename={props.onRename}
        sidebarOpen={shareOpen}
        onToggleSidebar={toggleSidebar}
      />
      <div className="app-content">
        <main className="board">
          <div className="ideas-wrap">
            <div className="ideas-scroll">
              <IdeaList
                ideas={props.ideas}
                onToggleHeart={props.onToggleHeart}
                onUpdate={props.onUpdateIdea}
                onDelete={props.onDeleteIdea}
              />
            </div>
            <IdeaComposer onSubmit={props.onCreateIdea} />
          </div>
        </main>
        {renderSidebar()}
      </div>
    </div>
  );
}
