import type { Idea } from "@brainstorm/shared";

export function sortIdeas<T extends Idea>(ideas: T[]): T[] {
  return [...ideas].sort((a, b) => {
    if (b.heartCount !== a.heartCount) {
      return b.heartCount - a.heartCount;
    }
    const createdAtDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (createdAtDiff !== 0) return createdAtDiff;
    return a.id.localeCompare(b.id);
  });
}
