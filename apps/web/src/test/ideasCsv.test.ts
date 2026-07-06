import type { RoomExportRow } from "@brainstorm/shared";
import { describe, expect, it } from "vitest";
import { serializeIdeasCsv } from "../lib/ideasCsv";

function row(overrides: Partial<RoomExportRow>): RoomExportRow {
  return {
    ideaId: "idea_1",
    ideaText: "Plain idea",
    heartCount: 0,
    ideaCreatedAt: "2026-06-26T10:00:00.000Z",
    ideaUpdatedAt: "2026-06-26T10:01:00.000Z",
    commentId: null,
    commentText: null,
    commentCreatedAt: null,
    commentUpdatedAt: null,
    ...overrides
  };
}

describe("serializeIdeasCsv", () => {
  it("serializes normal idea text", () => {
    expect(serializeIdeasCsv([row({ ideaText: "Launch the beta", heartCount: 3 })])).toBe(
      [
        "Idea,Hearts,Created At,Updated At",
        "Launch the beta,3,2026-06-26T10:00:00.000Z,2026-06-26T10:01:00.000Z"
      ].join("\r\n")
    );
  });

  it("omits heart counts when they are not included", () => {
    expect(serializeIdeasCsv([row({ ideaText: "Launch the beta", heartCount: 3 })], { includeHeartCounts: false, includeComments: false })).toBe(
      [
        "Idea,Created At,Updated At",
        "Launch the beta,2026-06-26T10:00:00.000Z,2026-06-26T10:01:00.000Z"
      ].join("\r\n")
    );
  });

  it("escapes commas, quotes, and multiline text", () => {
    expect(serializeIdeasCsv([row({ ideaText: 'One, "two"\nand three' })])).toBe(
      [
        "Idea,Hearts,Created At,Updated At",
        '"One, ""two""\nand three",0,2026-06-26T10:00:00.000Z,2026-06-26T10:01:00.000Z'
      ].join("\r\n")
    );
  });

  it("serializes zero and multiple heart counts", () => {
    expect(serializeIdeasCsv([row({ ideaText: "Zero", heartCount: 0 }), row({ ideaText: "Many", heartCount: 12 })])).toBe(
      [
        "Idea,Hearts,Created At,Updated At",
        "Zero,0,2026-06-26T10:00:00.000Z,2026-06-26T10:01:00.000Z",
        "Many,12,2026-06-26T10:00:00.000Z,2026-06-26T10:01:00.000Z"
      ].join("\r\n")
    );
  });

  it("keeps the column order stable", () => {
    const [header] = serializeIdeasCsv([row({})]).split("\r\n");

    expect(header).toBe("Idea,Hearts,Created At,Updated At");
  });

  it("serializes comment-inclusive rows with one row per comment", () => {
    expect(
      serializeIdeasCsv(
        [
          row({
            ideaText: "Launch the beta",
            heartCount: 3,
            commentId: "comment_1",
            commentText: "Needs docs",
            commentCreatedAt: "2026-06-26T11:00:00.000Z",
            commentUpdatedAt: "2026-06-26T11:01:00.000Z"
          }),
          row({
            ideaText: "Launch the beta",
            heartCount: 3,
            commentId: "comment_2",
            commentText: "Add owner",
            commentCreatedAt: "2026-06-26T12:00:00.000Z",
            commentUpdatedAt: "2026-06-26T12:01:00.000Z"
          })
        ],
        { includeHeartCounts: true, includeComments: true }
      )
    ).toBe(
      [
        "Idea,Hearts,Created At,Updated At,Comment,Comment Created At,Comment Updated At",
        "Launch the beta,3,2026-06-26T10:00:00.000Z,2026-06-26T10:01:00.000Z,Needs docs,2026-06-26T11:00:00.000Z,2026-06-26T11:01:00.000Z",
        "Launch the beta,3,2026-06-26T10:00:00.000Z,2026-06-26T10:01:00.000Z,Add owner,2026-06-26T12:00:00.000Z,2026-06-26T12:01:00.000Z"
      ].join("\r\n")
    );
  });

  it("keeps ideas without comments when comments are included", () => {
    expect(serializeIdeasCsv([row({ ideaText: "No comments" })], { includeHeartCounts: true, includeComments: true })).toBe(
      [
        "Idea,Hearts,Created At,Updated At,Comment,Comment Created At,Comment Updated At",
        "No comments,0,2026-06-26T10:00:00.000Z,2026-06-26T10:01:00.000Z,,,"
      ].join("\r\n")
    );
  });

  it("serializes comments without heart counts", () => {
    expect(
      serializeIdeasCsv(
        [
          row({
            ideaText: "Launch the beta",
            heartCount: 3,
            commentText: "Needs docs",
            commentCreatedAt: "2026-06-26T11:00:00.000Z",
            commentUpdatedAt: "2026-06-26T11:01:00.000Z"
          })
        ],
        { includeHeartCounts: false, includeComments: true }
      )
    ).toBe(
      [
        "Idea,Created At,Updated At,Comment,Comment Created At,Comment Updated At",
        "Launch the beta,2026-06-26T10:00:00.000Z,2026-06-26T10:01:00.000Z,Needs docs,2026-06-26T11:00:00.000Z,2026-06-26T11:01:00.000Z"
      ].join("\r\n")
    );
  });

  it("escapes comment text", () => {
    expect(serializeIdeasCsv([row({ commentText: 'One, "two"\nand three' })], { includeHeartCounts: true, includeComments: true })).toBe(
      [
        "Idea,Hearts,Created At,Updated At,Comment,Comment Created At,Comment Updated At",
        'Plain idea,0,2026-06-26T10:00:00.000Z,2026-06-26T10:01:00.000Z,"One, ""two""\nand three",,'
      ].join("\r\n")
    );
  });
});
