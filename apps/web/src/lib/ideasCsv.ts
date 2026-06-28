import type { Idea } from "@brainstorm/shared";

const CSV_HEADERS = ["Idea", "Hearts", "Created At", "Updated At"] as const;

type CsvIdea = Pick<Idea, "text" | "heartCount" | "createdAt" | "updatedAt">;

function escapeCsvValue(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function serializeIdeasCsv(ideas: CsvIdea[]): string {
  const rows = ideas.map((idea) => [idea.text, idea.heartCount, idea.createdAt, idea.updatedAt]);
  return [CSV_HEADERS, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");
}

export function downloadIdeasCsv(roomSlug: string, ideas: CsvIdea[]): void {
  const blob = new Blob([serializeIdeasCsv(ideas)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `brainstorm-${roomSlug}-ideas.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
