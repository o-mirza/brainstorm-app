import type { Idea } from "@brainstorm/shared";
import { AnimatePresence, motion } from "motion/react";
import type { ClientIdea } from "../hooks/useRoom";
import { easeStandard, ideaItemVariants } from "../lib/animations";
import IdeaCard from "./IdeaCard";

type Props = {
  ideas: ClientIdea[];
  onToggleHeart: (idea: Idea) => Promise<void>;
  onUpdate: (ideaId: string, text: string) => Promise<void>;
  onDelete: (ideaId: string) => Promise<void>;
  onOpenComments: (ideaId: string) => void;
  canAdd: boolean;
  canHeart: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export default function IdeaList(props: Props) {
  if (props.ideas.length === 0) {
    return (
      <div className="empty">
        <div>
          <strong>No ideas yet</strong>
          <span>{props.canAdd ? "Add the first one." : "Waiting for ideas."}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ideas">
      <AnimatePresence initial={false} mode="popLayout">
        {props.ideas.map((idea) => (
          <motion.div
            key={idea.renderKey}
            layout
            variants={ideaItemVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.18, ease: easeStandard }}
          >
            <IdeaCard
              idea={idea}
              onToggleHeart={props.onToggleHeart}
              onUpdate={props.onUpdate}
              onDelete={props.onDelete}
              onOpenComments={props.onOpenComments}
              canHeart={props.canHeart}
              canEdit={props.canEdit}
              canDelete={props.canDelete}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
