import type { Comment } from "@brainstorm/shared";
import { Clipboard, MoreHorizontal, Pencil, Trash2, User } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ClientComment } from "../hooks/useRoom";
import { commentItemVariants, easeStandard } from "../lib/animations";
import DeleteCommentModal from "./DeleteCommentModal";
import TextEditModal from "./TextEditModal";
import { useToast } from "./ToastProvider";

type Props = {
  ideaId: string;
  comments: ClientComment[] | undefined;
  participantId: string;
  canManageOwn: boolean;
  canManageAny: boolean;
  onLoad: (ideaId: string) => Promise<Comment[]>;
  onUpdate: (commentId: string, text: string) => Promise<void>;
  onDelete: (comment: Comment) => Promise<void>;
};

function avatarColor(participantId: string): string {
  let hash = 0;
  for (let index = 0; index < participantId.length; index += 1) {
    hash = (hash * 31 + participantId.charCodeAt(index)) % 360;
  }
  return `hsl(${hash} 58% 48%)`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export default function CommentThread({
  ideaId,
  comments,
  participantId,
  canManageOwn,
  canManageAny,
  onLoad,
  onUpdate,
  onDelete
}: Props) {
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<ClientComment | null>(null);
  const [deletingComment, setDeletingComment] = useState<ClientComment | null>(null);
  const menuRefs = useRef(new Map<string, HTMLDivElement>());
  const formatter = useMemo(() => ({ format: formatDate }), []);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!openMenuId) return;
      const menu = menuRefs.current.get(openMenuId);
      if (!menu?.contains(event.target as Node)) setOpenMenuId(null);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [openMenuId]);

  useEffect(() => {
    if (comments) {
      setError(null);
      return;
    }

    let active = true;
    setError(null);
    onLoad(ideaId).catch((loadError) => {
      if (!active) return;
      setError(loadError instanceof Error ? loadError.message : "Comments could not be loaded.");
    });

    return () => {
      active = false;
    };
  }, [comments, ideaId, onLoad]);

  if (error) {
    return <div className="comments-state comments-error">{error}</div>;
  }

  if (!comments) {
    return null;
  }

  async function copyText(comment: Comment) {
    try {
      await navigator.clipboard.writeText(comment.text);
      toast.success("Copied comment text");
    } catch {
      toast.error("Could not copy comment text");
    } finally {
      setOpenMenuId(null);
    }
  }

  return (
    <>
      <section className={`comments-section ${comments.length === 0 ? "is-empty" : ""}`} aria-label="Comments">
        <AnimatePresence initial={false} mode="popLayout">
          {comments.map((comment) => {
            const canManage = canManageAny || (canManageOwn && comment.participantId === participantId);
            const isOwnComment = comment.participantId === participantId;
            const menuOpen = openMenuId === comment.id;
            return (
              <motion.article
                className={`comment-item ${menuOpen ? "menu-open" : ""}`}
                key={comment.renderKey}
                layout
                variants={commentItemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.18, ease: easeStandard }}
              >
                <div
                  className="comment-avatar"
                  style={{ backgroundColor: avatarColor(comment.participantId) }}
                  aria-label="Comment author"
                >
                  <User size={17} aria-hidden="true" />
                </div>
                <div className="comment-body">
                  <div className="comment-meta">
                    <time dateTime={comment.createdAt}>{formatter.format(comment.createdAt)}</time>
                    {isOwnComment ? <span className="comment-you-badge">You</span> : null}
                    <div
                      className="comment-actions"
                      ref={(element) => {
                        if (element) {
                          menuRefs.current.set(comment.id, element);
                        } else {
                          menuRefs.current.delete(comment.id);
                        }
                      }}
                    >
                      <button
                        type="button"
                        className="comment-menu-button"
                        aria-label="Comment actions"
                        aria-expanded={menuOpen}
                        onClick={() => setOpenMenuId((current) => (current === comment.id ? null : comment.id))}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      <div className={`comment-menu ${menuOpen ? "open" : ""}`}>
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingComment(comment);
                              setOpenMenuId(null);
                            }}
                          >
                            <Pencil size={15} /> Edit
                          </button>
                        ) : null}
                        <button type="button" onClick={() => { void copyText(comment); }}>
                          <Clipboard size={15} /> Copy text
                        </button>
                        {canManage ? (
                          <button
                            type="button"
                            data-action="delete"
                            onClick={() => {
                              setOpenMenuId(null);
                              setDeletingComment(comment);
                            }}
                          >
                            <Trash2 size={15} /> Delete
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <p>{comment.text}</p>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </section>
      {comments.length === 0 ? (
        <div className="comments-empty">
          <strong>No comments yet</strong>
          <span>Start the discussion below.</span>
        </div>
      ) : null}
      <AnimatePresence>
        {editingComment ? (
          <TextEditModal
            title="Edit comment"
            initialValue={editingComment.text}
            onClose={() => setEditingComment(null)}
            onSave={(text) => onUpdate(editingComment.id, text)}
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {deletingComment ? (
          <DeleteCommentModal
            comment={deletingComment}
            onClose={() => setDeletingComment(null)}
            onConfirm={onDelete}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
