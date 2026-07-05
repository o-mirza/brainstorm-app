import type { RoomExportRow } from "@brainstorm/shared";

const CSV_HEADERS = ["Idea", "Hearts", "Created At", "Updated At"] as const;
const CSV_HEADERS_WITH_COMMENTS = [...CSV_HEADERS, "Comment", "Comment Created At", "Comment Updated At"] as const;

function escapeCsvValue(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function serializeIdeasCsv(rows: RoomExportRow[], includeComments = false): string {
  const headers = includeComments ? CSV_HEADERS_WITH_COMMENTS : CSV_HEADERS;
  const values = rows.map((row) => {
    const ideaValues = [row.ideaText, row.heartCount, row.ideaCreatedAt, row.ideaUpdatedAt];
    if (!includeComments) {
      return ideaValues;
    }
    return [
      ...ideaValues,
      row.commentText ?? "",
      row.commentCreatedAt ?? "",
      row.commentUpdatedAt ?? ""
    ];
  });
  return [headers, ...values].map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");
}

export function downloadIdeasCsv(roomSlug: string, rows: RoomExportRow[], includeComments = false): void {
  const blob = new Blob([serializeIdeasCsv(rows, includeComments)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `brainstorm-${roomSlug}-ideas.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
