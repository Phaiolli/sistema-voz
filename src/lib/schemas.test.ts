import { describe, it, expect } from "vitest";
import {
  submitQuestionSchema, patchQuestionSchema,
  createEventSchema, patchEventSchema,
  createUserSchema, patchUserSchema,
  assignMediatorSchema,
} from "./schemas";

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

const validEvent = {
  name: "Evento Teste",
  slug: "evento-teste",
  startsAt: "2025-06-01T14:00",
  endsAt: "2025-06-01T18:00",
  place: "Auditório Central",
};

describe("createEventSchema", () => {
  it("accepts valid input", () => {
    expect(createEventSchema.safeParse(validEvent).success).toBe(true);
  });

  it("applies defaults for optional fields", () => {
    const result = createEventSchema.safeParse(validEvent);
    expect(result.success && result.data.status).toBe("draft");
    expect(result.success && result.data.address).toBe("");
    expect(result.success && result.data.about).toBe("");
  });

  it("rejects name shorter than 2 chars", () => {
    expect(createEventSchema.safeParse({ ...validEvent, name: "A" }).success).toBe(false);
  });

  it("rejects slug with uppercase", () => {
    expect(createEventSchema.safeParse({ ...validEvent, slug: "Evento-Teste" }).success).toBe(false);
  });

  it("rejects slug with spaces", () => {
    expect(createEventSchema.safeParse({ ...validEvent, slug: "evento teste" }).success).toBe(false);
  });

  it("accepts slug with hyphens and numbers", () => {
    expect(createEventSchema.safeParse({ ...validEvent, slug: "evento-123-teste" }).success).toBe(true);
  });

  it("rejects missing startsAt", () => {
    const { startsAt: _, ...rest } = validEvent;
    expect(createEventSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing place", () => {
    const { place: _, ...rest } = validEvent;
    expect(createEventSchema.safeParse(rest).success).toBe(false);
  });

  it("accepts custom status", () => {
    expect(createEventSchema.safeParse({ ...validEvent, status: "active" }).success).toBe(true);
  });

  it("rejects invalid status", () => {
    expect(createEventSchema.safeParse({ ...validEvent, status: "canceled" }).success).toBe(false);
  });
});

describe("patchEventSchema", () => {
  it("accepts empty object (all optional)", () => {
    expect(patchEventSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update", () => {
    expect(patchEventSchema.safeParse({ name: "Novo Nome" }).success).toBe(true);
  });

  it("rejects invalid slug in partial update", () => {
    expect(patchEventSchema.safeParse({ slug: "INVALID SLUG" }).success).toBe(false);
  });
});

const validUser = {
  name: "Maria Silva",
  email: "maria@exemplo.com",
  password: "Senha123",
  role: "mediador" as const,
};

describe("createUserSchema", () => {
  it("accepts valid input", () => {
    expect(createUserSchema.safeParse(validUser).success).toBe(true);
  });

  it("rejects password shorter than 8 chars", () => {
    expect(createUserSchema.safeParse({ ...validUser, password: "Abc1" }).success).toBe(false);
  });

  it("rejects password without uppercase", () => {
    expect(createUserSchema.safeParse({ ...validUser, password: "senha1234" }).success).toBe(false);
  });

  it("rejects password without number", () => {
    expect(createUserSchema.safeParse({ ...validUser, password: "SenhaSemNumero" }).success).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(createUserSchema.safeParse({ ...validUser, email: "nao-e-email" }).success).toBe(false);
  });

  it("rejects invalid role", () => {
    expect(createUserSchema.safeParse({ ...validUser, role: "viewer" as never }).success).toBe(false);
  });

  it("accepts role admin", () => {
    expect(createUserSchema.safeParse({ ...validUser, role: "admin" }).success).toBe(true);
  });
});

describe("patchUserSchema", () => {
  it("accepts empty object", () => {
    expect(patchUserSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update without password", () => {
    expect(patchUserSchema.safeParse({ name: "Novo Nome" }).success).toBe(true);
  });

  it("validates password when present", () => {
    expect(patchUserSchema.safeParse({ password: "fraca" }).success).toBe(false);
  });

  it("accepts valid password when present", () => {
    expect(patchUserSchema.safeParse({ password: "NovaSenha1" }).success).toBe(true);
  });
});

describe("assignMediatorSchema", () => {
  it("accepts valid userId", () => {
    expect(assignMediatorSchema.safeParse({ userId: "usr_abc123" }).success).toBe(true);
  });

  it("rejects empty userId", () => {
    expect(assignMediatorSchema.safeParse({ userId: "" }).success).toBe(false);
  });

  it("rejects missing userId", () => {
    expect(assignMediatorSchema.safeParse({}).success).toBe(false);
  });
});
