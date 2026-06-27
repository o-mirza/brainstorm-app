import type { Idea } from "@brainstorm/shared";
import { Clipboard, Heart, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import TextEditModal from "./TextEditModal";

type Props = {
  idea: Idea;
  onToggleHeart: (idea: Idea) => Promise<void>;
  onUpdate: (ideaId: string, text: string) => Promise<void>;
  onDelete: (ideaId: string) => Promise<void>;
};

export default function IdeaCard({ idea, onToggleHeart, onUpdate, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function heart() {
    if (pending) return;
    setPending(true);
    try {
      await onToggleHeart(idea);
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="idea-card">
      <div className="heart-column">
        <button
          className="heart-button"
          type="button"
          onClick={heart}
          aria-pressed={idea.heartedByMe}
          aria-label={idea.heartedByMe ? "Remove heart" : "Heart idea"}
        >
          <Heart />
          <span className="heart-count">{idea.heartCount}</span>
        </button>
      </div>
      <div className="idea-content">
        <p className="idea-text">{idea.text}</p>
      </div>
      <div className="idea-actions" ref={menuRef}>
        <button className="idea-menu-button" type="button" aria-label="Idea actions" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          <MoreVertical size={19} />
        </button>
        <div className={`idea-menu ${menuOpen ? "open" : ""}`}>
          <button type="button" onClick={() => { setEditing(true); setMenuOpen(false); }}>
            <Pencil size={15} /> Edit
          </button>
          <button type="button" onClick={() => { void navigator.clipboard.writeText(idea.text); setMenuOpen(false); }}>
            <Clipboard size={15} /> Copy text
          </button>
          <button type="button" data-action="delete" onClick={() => { setMenuOpen(false); void onDelete(idea.id); }}>
            <Trash2 size={15} /> Delete
          </button>
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
}
