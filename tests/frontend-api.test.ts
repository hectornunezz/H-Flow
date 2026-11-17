import { apiFetch, API_BASE_URL, TOKEN_STORAGE_KEY } from "../hflow-frontend/src/lib/api";

describe("frontend API client", () => {
  const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    const values = new Map<string, string>([[TOKEN_STORAGE_KEY, "test-jwt-token"]]);
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => values.get(key) ?? null,
        },
      },
    });
    fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { active: true } }), {
        headers: { "content-type": "application/json" },
      }),
    );
  });

  afterEach(() => {
    fetchMock.mockRestore();
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, "window", originalWindowDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  });

  it("defaults to the configured backend API base URL", () => {
    expect(API_BASE_URL).toBe("http://localhost:5000/api");
  });

  it("adds the saved bearer token to API requests", async () => {
    const result = await apiFetch<{ data: { active: boolean } }>("/dashboard/stats");

    expect(result.data.active).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://localhost:5000/api/dashboard/stats",
    );
    const requestOptions = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(new Headers(requestOptions?.headers).get("Authorization")).toBe(
      "Bearer test-jwt-token",
    );
  });

  it("sends registration requests to the absolute backend API URL", async () => {
    await apiFetch("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Coach", email: "coach@example.com", password: "password" }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:5000/api/auth/register",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("surfaces a clear connection error when the backend is unreachable", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));

    await expect(apiFetch("/auth/register", { method: "POST" })).rejects.toMatchObject({
      name: "ApiError",
      status: 0,
      message: "No se puede conectar con el servidor. Comprueba que el backend esté activo",
    });
  });
});
