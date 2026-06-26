import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logError } from "./log";

describe("logError", () => {
  let spy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    spy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it("logs only safe fields from an Error instance", () => {
    logError("ctx", new Error("boom"));
    expect(spy).toHaveBeenCalledWith("ctx", { message: "boom", name: "Error" });
  });

  it("extracts message, name and code from a Supabase-like error object", () => {
    const supabaseError = {
      message: "duplicate key",
      code: "23505",
      name: "PostgrestError",
      // PII that must never be logged:
      details: "Key (email)=(joao@example.com) already exists.",
      row: { email: "joao@example.com", document: "12345678900" },
    };
    logError("db", supabaseError);
    expect(spy).toHaveBeenCalledWith("db", {
      message: "duplicate key",
      name: "PostgrestError",
      code: "23505",
    });
  });

  it("never includes PII such as email or document in the logged payload", () => {
    logError("db", {
      message: "fail",
      email: "secret@example.com",
      document: "11122233344",
    });
    const logged = JSON.stringify(spy.mock.calls[0]);
    expect(logged).not.toContain("secret@example.com");
    expect(logged).not.toContain("11122233344");
  });

  it("handles a plain string error", () => {
    logError("ctx", "something failed");
    expect(spy).toHaveBeenCalledWith("ctx", { message: "something failed" });
  });

  it("handles null/undefined without throwing", () => {
    expect(() => logError("ctx", null)).not.toThrow();
    expect(() => logError("ctx", undefined)).not.toThrow();
    expect(spy).toHaveBeenCalledWith("ctx", {});
  });

  // --- Security negatives: PII must never reach the log sink ---

  it("does not leak PII nested deep inside a Supabase error object", () => {
    logError("db", {
      message: "insert failed",
      code: "23505",
      name: "PostgrestError",
      details: "Key (email)=(maria@example.com) already exists.",
      hint: "CPF 529.982.247-25 conflicts",
      row: {
        email: "maria@example.com",
        document: "52998224725",
        phone: "+5511999998888",
        nested: { contact: "whatsapp:+5511988887777" },
      },
    });
    const logged = JSON.stringify(spy.mock.calls[0]);
    // Only safe keys survive
    expect(logged).toContain("insert failed");
    expect(logged).toContain("23505");
    // Every PII token is stripped, regardless of nesting depth
    for (const pii of [
      "maria@example.com",
      "52998224725",
      "529.982.247-25",
      "+5511999998888",
      "+5511988887777",
      "details",
      "hint",
      "row",
    ]) {
      expect(logged).not.toContain(pii);
    }
  });

  it("does not leak PII attached as extra props on an Error instance", () => {
    const err = Object.assign(new Error("constraint"), {
      email: "leak@example.com",
      document: "11122233344",
      details: "Key (email)=(leak@example.com)",
    });
    logError("db", err);
    const logged = JSON.stringify(spy.mock.calls[0]);
    expect(logged).toContain("constraint");
    expect(logged).not.toContain("leak@example.com");
    expect(logged).not.toContain("11122233344");
    expect(logged).not.toContain("details");
  });

  it("only ever emits the whitelisted keys (message/name/code)", () => {
    logError("db", {
      message: "x", name: "Y", code: "Z",
      stack: "secret stack with /home/user paths",
      query: "SELECT * FROM users WHERE email='a@b.com'",
    });
    const payload = spy.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(["code", "message", "name"]);
  });

  it("ignores a non-string code (does not coerce objects/numbers into the log)", () => {
    logError("db", { message: "m", code: { secret: "do-not-log" } });
    const logged = JSON.stringify(spy.mock.calls[0]);
    expect(logged).not.toContain("do-not-log");
    const payload = spy.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("code");
  });

  it("does not throw on a string error and emits no extra keys", () => {
    logError("ctx", "plain message");
    const payload = spy.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.keys(payload)).toEqual(["message"]);
  });
});
