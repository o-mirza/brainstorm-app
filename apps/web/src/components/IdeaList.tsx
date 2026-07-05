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
  canViewIdeas: boolean;
  canHeart: boolean;
  canShowHeartCount: boolean;
  canShowComments: boolean;
  canManageOwn: boolean;
  canManageAny: boolean;
  participantId: string;
};

export default function IdeaList(props: Props) {
  if (props.ideas.length === 0) {
    return (
      <div className="empty">
        <div>
          <strong>No ideas yet</strong>
          <span>{props.canViewIdeas ? (props.canAdd ? "Add the first one." : "Waiting for ideas.") : "Only your submissions are visible here."}</span>
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
              canShowHeartCount={props.canShowHeartCount}
              canShowComments={props.canShowComments}
              canEdit={props.canManageAny || (props.canManageOwn && idea.participantId === props.participantId)}
              canDelete={props.canManageAny || (props.canManageOwn && idea.participantId === props.participantId)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
