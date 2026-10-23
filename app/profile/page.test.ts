import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  limit: vi.fn(),
  select: vi.fn(),
  profileRecord: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock("@/lib/quiz/profileData", () => ({ profileRecord: mocks.profileRecord }));
vi.mock("@/db", () => ({ db: { select: mocks.select } }));
vi.mock("@/app/_components/shell/ProfileView", () => ({ ProfileView: () => null }));
vi.mock("./LogoutButton", () => ({ LogoutButton: () => null }));
import ProfilePage from "./page";

describe("profile shell retains session and profile boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockReturnValue({ from: () => ({ where: () => ({ limit: mocks.limit }) }) });
  });

  it("redirects unauthenticated visitors without reading a profile", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(ProfilePage()).rejects.toThrow("redirect:/login");
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("passes the real session email and server progress into the shell", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "reader-id", email: "reader@example.com" } });
    mocks.limit.mockResolvedValue([{ rank: "Tiro", xp: 0 }]);
    const record = { progress: { rank: "Tiro", xp: 0, streakDays: 0 }, history: [], regions: [] };
    mocks.profileRecord.mockResolvedValue(record);
    const element = await ProfilePage();
    expect(element.props.email).toBe("reader@example.com");
    expect(element.props.record).toEqual(record);
    expect(element.props).not.toHaveProperty("rank");
    expect(element.props).not.toHaveProperty("xp");
    expect(mocks.limit).toHaveBeenCalledWith(1);
  });

  it("keeps a missing signup-created profile visible as an error", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "reader-id", email: "reader@example.com" } });
    mocks.limit.mockResolvedValue([]);
    await expect(ProfilePage()).rejects.toThrow("No profile row for user reader-id");
  });
});
