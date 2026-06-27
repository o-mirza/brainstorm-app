import { adjectives, objects, places } from "./room.words.js";

function pick(list: readonly string[]): string {
  return list[Math.floor(Math.random() * list.length)] ?? list[0] ?? "Bright";
}

export function createRoomTitle(): string {
  return `${pick(adjectives)} ${pick(objects)} ${pick(places)}`;
}
