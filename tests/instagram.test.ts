import { InstagramService } from "../hflow-backend/src/services/instagram.service";

describe("InstagramService.publishReel", () => {
  const originalEnvironment = {
    accountId: process.env.INSTAGRAM_ACCOUNT_ID,
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
    graphVersion: process.env.INSTAGRAM_GRAPH_API_VERSION,
    publicUrl: process.env.MARKETING_MEDIA_PUBLIC_URL,
  };

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    if (originalEnvironment.accountId === undefined) delete process.env.INSTAGRAM_ACCOUNT_ID;
    else process.env.INSTAGRAM_ACCOUNT_ID = originalEnvironment.accountId;
    if (originalEnvironment.accessToken === undefined) delete process.env.INSTAGRAM_ACCESS_TOKEN;
    else process.env.INSTAGRAM_ACCESS_TOKEN = originalEnvironment.accessToken;
    if (originalEnvironment.graphVersion === undefined) delete process.env.INSTAGRAM_GRAPH_API_VERSION;
    else process.env.INSTAGRAM_GRAPH_API_VERSION = originalEnvironment.graphVersion;
    if (originalEnvironment.publicUrl === undefined) delete process.env.MARKETING_MEDIA_PUBLIC_URL;
    else process.env.MARKETING_MEDIA_PUBLIC_URL = originalEnvironment.publicUrl;
  });

  it("creates a Reel container, waits for processing, and publishes it", async () => {
    process.env.INSTAGRAM_ACCOUNT_ID = "account-123";
    process.env.INSTAGRAM_ACCESS_TOKEN = "test-access-token";
    process.env.INSTAGRAM_GRAPH_API_VERSION = "v22.0";
    process.env.MARKETING_MEDIA_PUBLIC_URL = "https://api.example.com/marketing-media";
    jest.useFakeTimers();

    const fetchMock = jest.spyOn(global, "fetch");
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "container-123" }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status_code: "FINISHED" }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "media-123" }), { status: 200 }));

    const publishPromise = new InstagramService().publishReel("episode-123.mp4", "Guion del Reel");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const containerRequest = fetchMock.mock.calls[0];
    expect(containerRequest[0]).toBe("https://graph.facebook.com/v22.0/account-123/media");
    expect(new URLSearchParams(containerRequest[1]?.body as string).get("media_type")).toBe("REELS");
    expect(new URLSearchParams(containerRequest[1]?.body as string).get("video_url")).toBe(
      "https://api.example.com/marketing-media/episode-123.mp4",
    );

    await jest.advanceTimersByTimeAsync(5_000);
    await jest.advanceTimersByTimeAsync(5_000);

    await expect(publishPromise).resolves.toBe("media-123");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[2][0])).toBe(
      "https://graph.facebook.com/v22.0/account-123/media_publish",
    );
    expect(
      new URLSearchParams(fetchMock.mock.calls[2][1]?.body as string).get("creation_id"),
    ).toBe("container-123");
  });
});
