import type { Idea } from "@brainstorm/shared";
import { Clipboard, Heart, MessageSquare, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { forwardRef, useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import TextEditModal from "./TextEditModal";
import { useToast } from "./ToastProvider";

type Props = {
  idea: Idea;
  onToggleHeart: (idea: Idea) => Promise<void>;
  onUpdate: (ideaId: string, text: string) => Promise<void>;
  onDelete: (ideaId: string) => Promise<void>;
  onOpenComments: (ideaId: string) => void;
  onCardClick?: (ideaId: string) => void;
  cardAriaLabel?: string;
  canHeart: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

const IdeaCard = forwardRef<HTMLElement, Props>(function IdeaCard(
  { idea, onToggleHeart, onUpdate, onDelete, onOpenComments, onCardClick, cardAriaLabel, canHeart, canEdit, canDelete },
  ref
) {
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (!canEdit) setEditing(false);
    if (!canEdit && !canDelete) setMenuOpen(false);
  }, [canDelete, canEdit]);

  function heart() {
    setPulsing(true);
    window.setTimeout(() => setPulsing(false), 320);
    void onToggleHeart(idea).catch(() => {
      // The optimistic room state rolls back on failure.
    });
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(idea.text);
      toast.success("Copied idea text");
    } catch {
      toast.error("Could not copy idea text");
    } finally {
      setMenuOpen(false);
    }
  }

  function openComments() {
    onOpenComments(idea.id);
  }

  function handleCardClick() {
    (onCardClick ?? onOpenComments)(idea.id);
  }

  function openCommentsFromKeyboard(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleCardClick();
  }

  function stopCardClick(event: ReactMouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  const transitionStyle = {
    viewTransitionName: `idea-card-${idea.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`
  } as CSSProperties;

  return (
    <article
      ref={ref}
      className={`idea-card ${menuOpen ? "menu-open" : ""}`}
      style={transitionStyle}
      role="button"
      tabIndex={0}
      aria-label={cardAriaLabel ?? `Open comments for idea: ${idea.text}`}
      onClick={handleCardClick}
      onKeyDown={openCommentsFromKeyboard}
    >
      <div className="vote-column" onClick={stopCardClick}>
        {canHeart ? (
          <button
            className={`vote-button ${pulsing ? "pulse" : ""}`}
            type="button"
            onClick={heart}
            aria-pressed={idea.heartedByMe}
            aria-label={idea.heartedByMe ? "Remove heart" : "Heart idea"}
          >
            <Heart />
            <span className="vote-count">{idea.heartCount}</span>
          </button>
        ) : (
          <div className="vote-count-static" aria-label={`${idea.heartCount} hearts`}>
            <Heart />
            <span className="vote-count">{idea.heartCount}</span>
          </div>
        )}
      </div>
      <div className="idea-content">
        <p className="idea-text">{idea.text}</p>
      </div>
      <div className="idea-actions" ref={menuRef} onClick={stopCardClick}>
        <button
          className="idea-comment-button"
          type="button"
          aria-label={`${idea.commentCount} ${idea.commentCount === 1 ? "comment" : "comments"}`}
          onClick={openComments}
        >
          <MessageSquare size={18} />
          <span>{idea.commentCount}</span>
        </button>
        <button className="idea-menu-button" type="button" aria-label="Idea actions" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          <MoreVertical size={19} />
        </button>
        <div className={`idea-menu ${menuOpen ? "open" : ""}`}>
          {canEdit ? (
            <button type="button" onClick={() => { setEditing(true); setMenuOpen(false); }}>
              <Pencil size={15} /> Edit
            </button>
          ) : null}
          <button type="button" onClick={() => { void copyText(); }}>
            <Clipboard size={15} /> Copy text
          </button>
          {canDelete ? (
            <button type="button" data-action="delete" onClick={() => { setMenuOpen(false); void onDelete(idea.id).catch(() => undefined); }}>
              <Trash2 size={15} /> Delete
            </button>
          ) : null}
        </div>
      </div>
      <AnimatePresence>
        {editing ? (
          <TextEditModal
            title="Edit idea"
            initialValue={idea.text}
            onClose={() => setEditing(false)}
            onSave={(text) => onUpdate(idea.id, text)}
          />
        ) : null}
      </AnimatePresence>
    </article>
  );
});

export default IdeaCard;
