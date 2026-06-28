import { Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ROOM_TITLE_MAX_LENGTH, type Room } from "@brainstorm/shared";

type Props = {
  room: Room;
  animateGeneratedTitle: boolean;
  canRename: boolean;
  onRename: (title: string) => Promise<void>;
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function renderTitleWithEditIcon(title: string) {
  const [, leadingText = "", finalWord = title] = title.match(/^(.*\s)(\S+)$/) ?? [];

  return (
    <>
      {leadingText}
      <span className="title-edit-nowrap">
        {finalWord}{" "}
        <span className="title-edit-cluster">
          <Pencil className="title-edit-icon" aria-hidden="true" />
        </span>
      </span>
    </>
  );
}

export default function RoomTitleEditor({ room, animateGeneratedTitle, canRename, onRename }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(room.title);
  const [displayTitle, setDisplayTitle] = useState(animateGeneratedTitle ? "" : room.title);
  const [generating, setGenerating] = useState(animateGeneratedTitle);
  const [revealEdit, setRevealEdit] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const animatedRoomsRef = useRef(new Set<string>());

  useEffect(() => {
    setValue(room.title);
    if (!generating) setDisplayTitle(room.title);
  }, [generating, room.title]);

  useEffect(() => {
    if (!animateGeneratedTitle || animatedRoomsRef.current.has(room.id)) {
      return;
    }

    let cancelled = false;

    void (async () => {
      if (prefersReducedMotion()) {
        setGenerating(false);
        setRevealEdit(false);
        setDisplayTitle(room.title);
        setValue(room.title);
        return;
      }

      setGenerating(true);
      setRevealEdit(false);
      setDisplayTitle("");
      setValue("");

      let nextTitle = "";
      for (const char of room.title) {
        if (cancelled) return;
        nextTitle += char;
        setDisplayTitle(nextTitle);
        setValue(nextTitle);
        await sleep(28);
      }

      if (cancelled) return;
      setGenerating(false);
      setRevealEdit(true);
      animatedRoomsRef.current.add(room.id);
      await sleep(420);
      if (!cancelled) setRevealEdit(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [animateGeneratedTitle, room.id, room.title]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!canRename) setEditing(false);
  }, [canRename]);

  async function commit() {
    const next = value.trim();
    setEditing(false);
    if (!next || next === room.title) {
      setValue(room.title);
      return;
    }
    try {
      await onRename(next);
    } catch {
      setValue(room.title);
    }
  }

  return (
    <div className={`room-title ${editing ? "editing" : ""} ${generating ? "generating" : ""} ${revealEdit ? "reveal-edit" : ""}`}>
      {canRename ? (
        <button
          key={room.title}
          className="room-title-button"
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Rename room"
        >
          {renderTitleWithEditIcon(displayTitle || room.title)}
        </button>
      ) : (
        <span
          key={room.title}
          className="room-title-button static"
        >
          {displayTitle || room.title}
        </span>
      )}
      {canRename ? (
        <input
          ref={inputRef}
          className="room-title-input"
          value={value}
          maxLength={ROOM_TITLE_MAX_LENGTH}
          aria-label="Room title"
          onChange={(event) => setValue(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") void commit();
            if (event.key === "Escape") {
              setValue(room.title);
              setEditing(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}
