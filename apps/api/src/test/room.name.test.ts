import { describe, expect, it } from "vitest";
import { createRoomTitle } from "../modules/rooms/room.name.js";

describe("createRoomTitle", () => {
  it("creates a three-word default title", () => {
    expect(createRoomTitle().split(" ")).toHaveLength(3);
  });
});
