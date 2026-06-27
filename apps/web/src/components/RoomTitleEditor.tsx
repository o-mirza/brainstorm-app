import { Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ROOM_TITLE_MAX_LENGTH, type Room } from "@brainstorm/shared";

type Props = {
  room: Room;
  onRename: (title: string) => Promise<void>;
};

export default function RoomTitleEditor({ room, onRename }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(room.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setValue(room.title), [room.title]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function commit() {
    const next = value.trim();
    setEditing(false);
    if (!next || next === room.title) {
      setValue(room.title);
      return;
    }
    await onRename(next);
  }

  return (
    <div className={`room-title ${editing ? "editing" : ""}`}>
      <button className="room-title-button" type="button" onClick={() => setEditing(true)} aria-label="Rename room">
        {room.title}{" "}
        <span className="title-edit-cluster">
          <Pencil className="title-edit-icon" aria-hidden="true" />
        </span>
      </button>
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
    </div>
  );
}
