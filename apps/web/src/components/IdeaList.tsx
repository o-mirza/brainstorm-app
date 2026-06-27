import type { Idea } from "@brainstorm/shared";
import IdeaCard from "./IdeaCard";

type Props = {
  ideas: Idea[];
  onToggleHeart: (idea: Idea) => Promise<void>;
  onUpdate: (ideaId: string, text: string) => Promise<void>;
  onDelete: (ideaId: string) => Promise<void>;
};

export default function IdeaList(props: Props) {
  if (props.ideas.length === 0) {
    return (
      <div className="empty">
        <div>
          <strong>Start with one idea</strong>
          <span>Add it below and everyone in the room will see it.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ideas">
      {props.ideas.map((idea) => (
        <IdeaCard key={idea.id} idea={idea} onToggleHeart={props.onToggleHeart} onUpdate={props.onUpdate} onDelete={props.onDelete} />
      ))}
    </div>
  );
}
