import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./client";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("api()", () => {
  it("returns parsed JSON on 200", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: "abc" }),
    });

    const result = await api<{ id: string }>("/test");
    expect(result).toEqual({ id: "abc" });
  });

  it("returns undefined on 204", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => null,
    });

    const result = await api<undefined>("/test");
    expect(result).toBeUndefined();
  });

  it("throws ApiError with backend error shape on 4xx", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({
        error: {
          code: "CAMPAIGN_NOT_FOUND",
          message: "Campaign not found",
          details: { id: "xyz" },
        },
      }),
    });

    await expect(api("/campaigns/xyz")).rejects.toMatchObject({
      code: "CAMPAIGN_NOT_FOUND",
      status: 404,
      message: "Campaign not found",
      details: { id: "xyz" },
    });
  });

  it("throws ApiError with UNKNOWN code when body is not parseable", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => {
        throw new SyntaxError("invalid json");
      },
    });

    const err = await api("/test").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe("UNKNOWN");
    expect((err as ApiError).status).toBe(500);
  });

  it("includes Content-Type: application/json header by default", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    await api("/test");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/test"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
  });
});
