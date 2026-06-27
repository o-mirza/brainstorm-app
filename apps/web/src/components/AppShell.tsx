import type { Idea, RecentRoom, Room } from "@brainstorm/shared";
import type { ConnectionStatus as Status } from "../lib/types";
import IdeaComposer from "./IdeaComposer";
import IdeaList from "./IdeaList";
import ShareSidebar from "./ShareSidebar";
import TopBar from "./TopBar";

type Props = {
  room: Room;
  ideas: Idea[];
  roomUrl: string;
  participantCount: number;
  status: Status;
  recentRooms: RecentRoom[];
  onRename: (title: string) => Promise<void>;
  onOpenShare: () => void;
  onCreateRoom: () => void;
  onShowRecent: () => void;
  onExpandShare: () => void;
  onCreateIdea: (text: string) => Promise<void>;
  onToggleHeart: (idea: Idea) => Promise<void>;
  onUpdateIdea: (ideaId: string, text: string) => Promise<void>;
  onDeleteIdea: (ideaId: string) => Promise<void>;
};

export default function AppShell(props: Props) {
  return (
    <div className="app">
      <TopBar
        room={props.room}
        participantCount={props.participantCount}
        status={props.status}
        onRename={props.onRename}
        onOpenShare={props.onOpenShare}
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
        <ShareSidebar
          roomUrl={props.roomUrl}
          recentRooms={props.recentRooms}
          onCreateRoom={props.onCreateRoom}
          onShowRecent={props.onShowRecent}
          onExpand={props.onExpandShare}
        />
      </div>
    </div>
  );
}
