import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom } from "../lib/api";
import { useRecentRooms } from "../hooks/useRecentRooms";
import { storeRoomAdminToken } from "../lib/adminAccess";

export default function HomeRedirect() {
  const navigate = useNavigate();
  const { rememberRoom } = useRecentRooms();
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void (async () => {
      try {
        const { room, adminToken } = await createRoom();
        storeRoomAdminToken(room.slug, adminToken);
        rememberRoom(room, 0);
        navigate(`/r/${room.slug}`, { replace: true, state: { createdRoom: true } });
      } catch (createError) {
        setError(createError instanceof Error ? createError.message : "Could not create room.");
      }
    })();
  }, [navigate, rememberRoom]);

  return (
    <main className="route-state">
      <h1>{error ? "Could not create a room" : "Creating room"}</h1>
      {error ? <p>{error}</p> : null}
    </main>
  );
}
