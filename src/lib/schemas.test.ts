import { describe, it, expect } from "vitest";
import { submitQuestionSchema, patchQuestionSchema } from "./schemas";

const validSubmit = {
  authorName: "João Silva",
  authorContact: "joao@exemplo.com",
  text: "Esta é uma pergunta válida com mais de dez caracteres.",
  lgpdAccepted: true,
};

describe("submitQuestionSchema", () => {
  it("accepts valid input", () => {
    expect(submitQuestionSchema.safeParse(validSubmit).success).toBe(true);
  });

  it("rejects missing body (null)", () => {
    expect(submitQuestionSchema.safeParse(null).success).toBe(false);
  });

  it("rejects authorName shorter than 2 chars", () => {
    const result = submitQuestionSchema.safeParse({ ...validSubmit, authorName: "J" });
    expect(result.success).toBe(false);
  });

  it("rejects authorName longer than 100 chars", () => {
    const result = submitQuestionSchema.safeParse({ ...validSubmit, authorName: "a".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("rejects authorContact shorter than 5 chars", () => {
    const result = submitQuestionSchema.safeParse({ ...validSubmit, authorContact: "ab" });
    expect(result.success).toBe(false);
  });

  it("rejects text shorter than 10 chars", () => {
    const result = submitQuestionSchema.safeParse({ ...validSubmit, text: "Curto" });
    expect(result.success).toBe(false);
  });

  it("rejects text longer than 500 chars", () => {
    const result = submitQuestionSchema.safeParse({ ...validSubmit, text: "a".repeat(501) });
    expect(result.success).toBe(false);
  });

  it("rejects lgpdAccepted = false", () => {
    const result = submitQuestionSchema.safeParse({ ...validSubmit, lgpdAccepted: false });
    expect(result.success).toBe(false);
  });

  it("rejects missing lgpdAccepted", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { lgpdAccepted: _lgpd, ...rest } = validSubmit;
    const result = submitQuestionSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("accepts phone as authorContact", () => {
    const result = submitQuestionSchema.safeParse({ ...validSubmit, authorContact: "(11) 99999-9999" });
    expect(result.success).toBe(true);
  });

  it("trims are handled by caller — schema accepts untrimmed", () => {
    const result = submitQuestionSchema.safeParse({ ...validSubmit, authorName: "  João  " });
    expect(result.success).toBe(true);
  });
});

describe("patchQuestionSchema", () => {
  const validActions = ["setNext", "markAnswered", "hide", "restore"] as const;

  it.each(validActions)("accepts action=%s", (action) => {
    expect(patchQuestionSchema.safeParse({ action }).success).toBe(true);
  });

  it("rejects unknown action", () => {
    const result = patchQuestionSchema.safeParse({ action: "delete" });
    expect(result.success).toBe(false);
  });

  it("rejects missing action", () => {
    const result = patchQuestionSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects null body", () => {
    const result = patchQuestionSchema.safeParse(null);
    expect(result.success).toBe(false);
  });
});
