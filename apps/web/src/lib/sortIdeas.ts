import type { Idea } from "@brainstorm/shared";

export function sortIdeas(ideas: Idea[]): Idea[] {
  return [...ideas].sort((a, b) => {
    if (b.heartCount !== a.heartCount) {
      return b.heartCount - a.heartCount;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}
