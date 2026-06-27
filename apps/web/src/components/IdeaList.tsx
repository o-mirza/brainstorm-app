import type { Idea } from "@brainstorm/shared";
import { useLayoutEffect, useRef } from "react";
import type { ClientIdea } from "../hooks/useRoom";
import IdeaCard from "./IdeaCard";

type Props = {
  ideas: ClientIdea[];
  onToggleHeart: (idea: Idea) => Promise<void>;
  onUpdate: (ideaId: string, text: string) => Promise<void>;
  onDelete: (ideaId: string) => Promise<void>;
};

export default function IdeaList(props: Props) {
  const itemRefs = useRef(new Map<string, HTMLElement>());
  const previousRects = useRef(new Map<string, DOMRect>());
  const previousRenderKeys = useRef(new Set<string>());
  const hasMeasured = useRef(false);

  useLayoutEffect(() => {
    const nextRects = new Map<string, DOMRect>();
    const nextRenderKeys = new Set<string>();

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    for (const idea of props.ideas) {
      nextRenderKeys.add(idea.renderKey);

      const element = itemRefs.current.get(idea.renderKey);
      if (!element || reduceMotion) continue;

      const next = element.getBoundingClientRect();
      const previous = previousRects.current.get(idea.renderKey);
      nextRects.set(idea.renderKey, next);

      if (!previous) continue;
      const deltaY = previous.top - next.top;
      if (Math.abs(deltaY) < 1) continue;

      element.animate(
        [
          { transform: `translateY(${deltaY}px)` },
          { transform: "translateY(0)" }
        ],
        { duration: 220, easing: "cubic-bezier(0.2, 0, 0.2, 1)" }
      );
    }

    previousRects.current = nextRects;
    previousRenderKeys.current = nextRenderKeys;
    hasMeasured.current = true;
  }, [props.ideas]);

  if (props.ideas.length === 0) {
    return (
      <div className="empty">
        <div>
          <strong>No ideas yet</strong>
          <span>Add the first one.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ideas">
      {props.ideas.map((idea) => (
        <IdeaCard
          key={idea.renderKey}
          isNew={hasMeasured.current && !previousRenderKeys.current.has(idea.renderKey)}
          ref={(element) => {
            if (element) {
              itemRefs.current.set(idea.renderKey, element);
            } else {
              itemRefs.current.delete(idea.renderKey);
            }
          }}
          idea={idea}
          onToggleHeart={props.onToggleHeart}
          onUpdate={props.onUpdate}
          onDelete={props.onDelete}
        />
      ))}
    </div>
  );
}
