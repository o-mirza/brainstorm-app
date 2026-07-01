import type { Idea } from "@brainstorm/shared";
import { useLayoutEffect, useRef, useState } from "react";
import type { ClientIdea } from "../hooks/useRoom";
import IdeaCard from "./IdeaCard";

type Props = {
  ideas: ClientIdea[];
  onToggleHeart: (idea: Idea) => Promise<void>;
  onUpdate: (ideaId: string, text: string) => Promise<void>;
  onDelete: (ideaId: string) => Promise<void>;
  canAdd: boolean;
  canHeart: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

type RenderItem = {
  idea: ClientIdea;
  exiting: boolean;
};

export default function IdeaList(props: Props) {
  const [renderItems, setRenderItems] = useState<RenderItem[]>(() => props.ideas.map((idea) => ({ idea, exiting: false })));
  const itemRefs = useRef(new Map<string, HTMLElement>());
  const previousRects = useRef(new Map<string, DOMRect>());
  const previousRenderKeys = useRef<string[]>([]);
  const exitAnimations = useRef(new Map<string, Animation>());
  const hasMeasured = useRef(false);

  useLayoutEffect(() => {
    return () => {
      for (const animation of exitAnimations.current.values()) {
        animation.cancel();
      }
      exitAnimations.current.clear();
    };
  }, []);

  useLayoutEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nextIdeasByKey = new Map(props.ideas.map((idea) => [idea.renderKey, idea]));

    setRenderItems((current) => {
      if (reduceMotion) {
        return props.ideas.map((idea) => ({ idea, exiting: false }));
      }

      const currentByKey = new Map(current.map((item) => [item.idea.renderKey, item]));
      const nextItems = props.ideas.map((idea) => ({ idea, exiting: false }));

      current.forEach((item, index) => {
        if (nextIdeasByKey.has(item.idea.renderKey)) return;

        const nextIndex = Math.min(index, nextItems.length);
        nextItems.splice(nextIndex, 0, { idea: item.idea, exiting: true });
      });

      for (const idea of props.ideas) {
        if (!currentByKey.get(idea.renderKey)?.exiting) continue;
        exitAnimations.current.get(idea.renderKey)?.cancel();
        exitAnimations.current.delete(idea.renderKey);
      }

      return nextItems;
    });
  }, [props.ideas]);

  useLayoutEffect(() => {
    const nextRects = new Map<string, DOMRect>();
    const nextRenderKeys = renderItems.map((item) => item.idea.renderKey);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    for (const [index, item] of renderItems.entries()) {
      const { idea } = item;
      const previousIndex = previousRenderKeys.current.indexOf(idea.renderKey);

      const element = itemRefs.current.get(idea.renderKey);
      if (!element || reduceMotion) continue;

      const next = element.getBoundingClientRect();
      const previous = previousRects.current.get(idea.renderKey);
      nextRects.set(idea.renderKey, next);

      if (previousIndex === -1) {
        // Run entering animation in JS if list was already measured (meaning this is a new card)
        // This measures the card at its true layout position BEFORE animating, avoiding skew.
        if (hasMeasured.current && !item.exiting) {
          element.animate(
            [
              { opacity: 0, transform: "translateY(4px)" },
              { opacity: 1, transform: "translateY(0)" }
            ],
            { duration: 160, easing: "ease" }
          );
        }
        continue;
      }

      if (previousIndex === index) continue;

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

    if (reduceMotion) return;

    for (const item of renderItems) {
      if (!item.exiting || exitAnimations.current.has(item.idea.renderKey)) continue;

      const element = itemRefs.current.get(item.idea.renderKey);
      if (!element) continue;

      const computedStyle = window.getComputedStyle(element);
      const animation = element.animate(
        [
          { opacity: computedStyle.opacity, transform: computedStyle.transform === "none" ? "translateY(0) scale(1)" : computedStyle.transform },
          { opacity: 0, transform: "translateY(-4px) scale(0.99)" }
        ],
        { duration: 150, easing: "ease", fill: "forwards" }
      );

      exitAnimations.current.set(item.idea.renderKey, animation);

      animation.onfinish = () => {
        exitAnimations.current.delete(item.idea.renderKey);
        setRenderItems((current) => current.filter((currentItem) => currentItem.idea.renderKey !== item.idea.renderKey || !currentItem.exiting));
      };
    }
  }, [renderItems]);

  if (renderItems.length === 0) {
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
      {renderItems.map(({ idea, exiting }) => (
        <IdeaCard
          key={idea.renderKey}
          ref={(element) => {
            if (element) {
              itemRefs.current.set(idea.renderKey, element);
              element.style.pointerEvents = exiting ? "none" : "";
            } else {
              itemRefs.current.delete(idea.renderKey);
            }
          }}
          idea={idea}
          onToggleHeart={props.onToggleHeart}
          onUpdate={props.onUpdate}
          onDelete={props.onDelete}
          canHeart={!exiting && props.canHeart}
          canEdit={!exiting && props.canEdit}
          canDelete={!exiting && props.canDelete}
        />
      ))}
    </div>
  );
}
