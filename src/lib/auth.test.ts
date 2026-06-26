import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * `authorize` lives inside the NextAuth Credentials provider config, which is
 * built at module load. To exercise it in isolation we capture the options the
 * module passes to `Credentials(...)` (it contains `authorize`) and to
 * `NextAuth(...)` (it contains the jwt/session callbacks). We mock the rest of
 * NextAuth so importing the module has no side effects.
 */
const { capturedCredentials, capturedConfig, mockCompare, mockRateLimit } = vi.hoisted(() => ({
  capturedCredentials: { current: null as unknown },
  capturedConfig: { current: null as unknown },
  mockCompare: vi.fn(),
  mockRateLimit: vi.fn(),
}));

vi.mock("next-auth", () => ({
  default: (config: unknown) => {
    capturedConfig.current = config;
    return { handlers: {}, signIn: vi.fn(), signOut: vi.fn(), auth: vi.fn() };
  },
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: (opts: unknown) => {
    capturedCredentials.current = opts;
    return { id: "credentials", ...(opts as object) };
  },
}));

vi.mock("bcryptjs", () => ({ default: { compare: mockCompare } }));

const mockSupabase = { from: vi.fn() };
vi.mock("./supabase", () => ({ createServerClient: () => mockSupabase }));

vi.mock("./api/rate-limit", () => ({ rateLimit: mockRateLimit }));

// Importing the module runs NextAuth(...) and captures the config above.
import "./auth";

type AuthorizeFn = (
  credentials: Record<string, unknown> | undefined,
) => Promise<unknown>;

function getAuthorize(): AuthorizeFn {
  return (capturedCredentials.current as { authorize: AuthorizeFn }).authorize;
}

function userChain(data: unknown) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve({ data }));
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.mockReturnValue({ ok: true });
});

describe("auth — Credentials.authorize", () => {
  it("returns null when email is missing", async () => {
    const res = await getAuthorize()({ password: "x" });
    expect(res).toBeNull();
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("returns null when password is missing", async () => {
    const res = await getAuthorize()({ email: "a@example.test" });
    expect(res).toBeNull();
  });

  it("returns null when undefined credentials", async () => {
    const res = await getAuthorize()(undefined);
    expect(res).toBeNull();
  });

  it("returns null when rate limited (no info leak)", async () => {
    mockRateLimit.mockReturnValue({ ok: false });
    const res = await getAuthorize()({ email: "a@example.test", password: "secret" });
    expect(res).toBeNull();
    // Short-circuits before hitting the DB.
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("returns null when the user does not exist", async () => {
    mockSupabase.from.mockReturnValue(userChain(null));
    const res = await getAuthorize()({ email: "missing@example.test", password: "secret" });
    expect(res).toBeNull();
    expect(mockCompare).not.toHaveBeenCalled();
  });

  it("returns null when the password is wrong", async () => {
    mockSupabase.from.mockReturnValue(
      userChain({ id: "u1", name: "Org", email: "a@example.test", role: "owner", plan: "free", password_hash: "$2a$hash" }),
    );
    mockCompare.mockResolvedValue(false);
    const res = await getAuthorize()({ email: "a@example.test", password: "wrong" });
    expect(res).toBeNull();
  });

  it("returns the user (with role/plan) on success", async () => {
    mockSupabase.from.mockReturnValue(
      userChain({ id: "u1", name: "Org", email: "a@example.test", role: "owner", plan: "paid", password_hash: "$2a$hash" }),
    );
    mockCompare.mockResolvedValue(true);
    const res = await getAuthorize()({ email: "a@example.test", password: "correct" });
    expect(res).toEqual({
      id: "u1",
      name: "Org",
      email: "a@example.test",
      role: "owner",
      plan: "paid",
    });
  });

  it("defaults plan to 'free' when the column is null", async () => {
    mockSupabase.from.mockReturnValue(
      userChain({ id: "u2", name: "Org2", email: "b@example.test", role: "owner", plan: null, password_hash: "$2a$hash" }),
    );
    mockCompare.mockResolvedValue(true);
    const res = (await getAuthorize()({ email: "b@example.test", password: "correct" })) as { plan: string };
    expect(res.plan).toBe("free");
  });
});

describe("auth — jwt/session callbacks", () => {
  function callbacks() {
    return (capturedConfig.current as { callbacks: { jwt: Function; session: Function } }).callbacks;
  }

  it("jwt callback copies role/userId/plan from user onto the token", () => {
    const token = callbacks().jwt({ token: {}, user: { id: "u1", role: "owner", plan: "paid" } });
    expect(token).toMatchObject({ role: "owner", userId: "u1", plan: "paid" });
  });

  it("jwt callback leaves token untouched when there is no user", () => {
    const token = callbacks().jwt({ token: { role: "admin" }, user: undefined });
    expect(token).toEqual({ role: "admin" });
  });

  it("jwt callback defaults missing id/plan", () => {
    const token = callbacks().jwt({ token: {}, user: { role: "owner" } });
    expect(token).toMatchObject({ role: "owner", userId: "", plan: "free" });
  });

  it("session callback copies token claims onto session.user", () => {
    const session = callbacks().session({
      session: { user: { name: "Org", email: "a@example.test" } },
      token: { role: "owner", userId: "u1", plan: "paid" },
    });
    expect(session.user).toMatchObject({ role: "owner", id: "u1", plan: "paid" });
  });

  it("session callback returns session unchanged when there is no user", () => {
    const session = callbacks().session({ session: {}, token: { role: "owner" } });
    expect(session).toEqual({});
  });
});
