import type { Idea } from "@brainstorm/shared";
import { Clipboard, Heart, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { forwardRef, useEffect, useRef, useState } from "react";
import TextEditModal from "./TextEditModal";

type Props = {
  idea: Idea;
  onToggleHeart: (idea: Idea) => Promise<void>;
  onUpdate: (ideaId: string, text: string) => Promise<void>;
  onDelete: (ideaId: string) => Promise<void>;
  canHeart: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

const IdeaCard = forwardRef<HTMLElement, Props>(function IdeaCard({ idea, onToggleHeart, onUpdate, onDelete, canHeart, canEdit, canDelete }, ref) {
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

  return (
    <article ref={ref} className={`idea-card ${menuOpen ? "menu-open" : ""}`}>
      <div className="vote-column">
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
      <div className="idea-actions" ref={menuRef}>
        <button className="idea-menu-button" type="button" aria-label="Idea actions" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          <MoreVertical size={19} />
        </button>
        <div className={`idea-menu ${menuOpen ? "open" : ""}`}>
          {canEdit ? (
            <button type="button" onClick={() => { setEditing(true); setMenuOpen(false); }}>
              <Pencil size={15} /> Edit
            </button>
          ) : null}
          <button type="button" onClick={() => { void navigator.clipboard.writeText(idea.text); setMenuOpen(false); }}>
            <Clipboard size={15} /> Copy text
          </button>
          {canDelete ? (
            <button type="button" data-action="delete" onClick={() => { setMenuOpen(false); void onDelete(idea.id); }}>
              <Trash2 size={15} /> Delete
            </button>
          ) : null}
        </div>
      </div>
      {editing ? (
        <TextEditModal
          title="Edit idea"
          initialValue={idea.text}
          onClose={() => setEditing(false)}
          onSave={(text) => onUpdate(idea.id, text)}
        />
      ) : null}
    </article>
  );
});

export default IdeaCard;
