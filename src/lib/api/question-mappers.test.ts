import { describe, it, expect } from "vitest";
import { mapQuestionPublic } from "./question-mappers";

const row = {
  id: "q_1",
  event_id: "evt_1",
  author_name: "Maria Silva",
  author_contact: "11999990000",
  author_email: "maria@example.com",
  author_ip: "203.0.113.7",
  text: "Pergunta pública",
  status: "pending",
  is_anonymous: false,
  created_at: "2026-06-25T12:00:00.000Z",
};

describe("mapQuestionPublic", () => {
  it("returns only the safe public keys (no PII)", () => {
    const out = mapQuestionPublic(row);
    expect(Object.keys(out).sort()).toEqual(
      ["authorName", "createdAt", "eventId", "id", "isAnonymous", "status", "text"].sort(),
    );
  });

  it("never includes author_email, author_contact or author_ip", () => {
    const out = mapQuestionPublic(row) as Record<string, unknown>;
    expect(out).not.toHaveProperty("authorEmail");
    expect(out).not.toHaveProperty("authorContact");
    expect(out).not.toHaveProperty("authorIp");
    expect(JSON.stringify(out)).not.toContain("203.0.113.7");
    expect(JSON.stringify(out)).not.toContain("maria@example.com");
  });

  it("exposes the real name when the question is not anonymous", () => {
    expect(mapQuestionPublic(row).authorName).toBe("Maria Silva");
  });

  it("replaces the name with 'Anônimo' when is_anonymous is true", () => {
    const out = mapQuestionPublic({ ...row, is_anonymous: true });
    expect(out.authorName).toBe("Anônimo");
    expect(JSON.stringify(out)).not.toContain("Maria Silva");
  });

  it("treats a missing is_anonymous flag as not anonymous", () => {
    const { is_anonymous: _omit, ...without } = row;
    const out = mapQuestionPublic(without);
    expect(out.isAnonymous).toBe(false);
    expect(out.authorName).toBe("Maria Silva");
  });
});
