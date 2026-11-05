type GraphApiResponse = {
  id?: unknown;
  status_code?: unknown;
  status?: unknown;
  error?: {
    message?: unknown;
    type?: unknown;
    code?: unknown;
  };
};

const DEFAULT_GRAPH_API_VERSION = "v22.0";
const POLL_INTERVAL_MS = 5_000;
const MAX_POLLS = 60;
const MAX_CAPTION_LENGTH = 2_200;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getApiBaseUrl(): string {
  const version = process.env.INSTAGRAM_GRAPH_API_VERSION?.trim() || DEFAULT_GRAPH_API_VERSION;
  if (!/^v\d+\.\d+$/.test(version)) {
    throw new Error("INSTAGRAM_GRAPH_API_VERSION must have a format such as v22.0");
  }
  return `https://graph.facebook.com/${version}`;
}

function getVideoUrl(fileName: string): string {
  const baseUrl = requireEnv("MARKETING_MEDIA_PUBLIC_URL");
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error("MARKETING_MEDIA_PUBLIC_URL must be an absolute HTTPS URL");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error(
      "MARKETING_MEDIA_PUBLIC_URL must use HTTPS and must not contain credentials, a query, or a fragment",
    );
  }
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/${encodeURIComponent(fileName)}`;
  return url.toString();
}

function getErrorMessage(body: GraphApiResponse, status: number): string {
  const message = typeof body.error?.message === "string" ? body.error.message : "Unknown Graph API error";
  const code = typeof body.error?.code === "number" ? `, code ${body.error.code}` : "";
  return `Instagram Graph API request failed (${status}${code}): ${message}`;
}

async function readResponse(response: Response): Promise<GraphApiResponse> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(`Instagram Graph API returned an invalid response (${response.status})`);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error(`Instagram Graph API returned an invalid response (${response.status})`);
  }
  const result = body as GraphApiResponse;
  if (!response.ok || result.error) {
    throw new Error(getErrorMessage(result, response.status));
  }
  return result;
}

function requireId(value: unknown, context: string): string {
  if (typeof value !== "string" || !value) {
    throw new Error(`Instagram Graph API did not return an ID for ${context}`);
  }
  return value;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class InstagramService {
  async publishReel(fileName: string, caption: string): Promise<string> {
    if (!fileName || fileName.includes("/") || fileName.includes("\\")) {
      throw new Error("A valid rendered video filename is required");
    }
    if (caption.length > MAX_CAPTION_LENGTH) {
      throw new Error(`Instagram Reel captions must not exceed ${MAX_CAPTION_LENGTH} characters`);
    }

    const accountId = requireEnv("INSTAGRAM_ACCOUNT_ID");
    const accessToken = requireEnv("INSTAGRAM_ACCESS_TOKEN");
    const apiBaseUrl = getApiBaseUrl();
    const videoUrl = getVideoUrl(fileName);

    const createResponse = await fetch(`${apiBaseUrl}/${encodeURIComponent(accountId)}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        media_type: "REELS",
        video_url: videoUrl,
        caption,
        share_to_feed: "true",
        access_token: accessToken,
      }),
    });
    const creationId = requireId(
      (await readResponse(createResponse)).id,
      "Reel container creation",
    );

    let ready = false;
    for (let poll = 0; poll < MAX_POLLS; poll += 1) {
      await delay(POLL_INTERVAL_MS);
      const statusUrl = new URL(`${apiBaseUrl}/${encodeURIComponent(creationId)}`);
      statusUrl.searchParams.set("fields", "status_code,status");
      statusUrl.searchParams.set("access_token", accessToken);
      const statusResponse = await fetch(statusUrl);
      const status = await readResponse(statusResponse);

      if (status.status_code === "FINISHED") {
        ready = true;
        break;
      }
      if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
        const detail = typeof status.status === "string" ? `: ${status.status}` : "";
        throw new Error(`Instagram Reel processing ended with ${String(status.status_code)}${detail}`);
      }
    }
    if (!ready) {
      throw new Error(`Instagram Reel container was not ready after ${MAX_POLLS} status checks`);
    }

    const publishResponse = await fetch(
      `${apiBaseUrl}/${encodeURIComponent(accountId)}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          creation_id: creationId,
          access_token: accessToken,
        }),
      },
    );
    return requireId((await readResponse(publishResponse)).id, "Reel publishing");
  }
}

export const instagramService = new InstagramService();
