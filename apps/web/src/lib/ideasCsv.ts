import type { RoomExportOptions, RoomExportRow } from "@brainstorm/shared";

const DEFAULT_EXPORT_OPTIONS: RoomExportOptions = {
  includeHeartCounts: true,
  includeComments: false
};

function escapeCsvValue(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function serializeIdeasCsv(rows: RoomExportRow[], options: RoomExportOptions = DEFAULT_EXPORT_OPTIONS): string {
  const headers = ["Idea", ...(options.includeHeartCounts ? ["Hearts"] : []), "Created At", "Updated At"];
  if (options.includeComments) {
    headers.push("Comment", "Comment Created At", "Comment Updated At");
  }
  const values = rows.map((row) => {
    const ideaValues = [
      row.ideaText,
      ...(options.includeHeartCounts ? [row.heartCount] : []),
      row.ideaCreatedAt,
      row.ideaUpdatedAt
    ];
    if (!options.includeComments) {
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

export function downloadIdeasCsv(roomSlug: string, rows: RoomExportRow[], options: RoomExportOptions = DEFAULT_EXPORT_OPTIONS): void {
  const blob = new Blob([serializeIdeasCsv(rows, options)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `brainstorm-${roomSlug}-ideas.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
