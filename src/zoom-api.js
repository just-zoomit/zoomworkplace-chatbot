// Small, focused helpers for Zoom OAuth + deeplinks.

const ZOOM_OAUTH_TOKEN_URL =
  process.env.ZOOM_OAUTH_TOKEN_URL || "https://zoom.us/oauth/token";


const ZOOM_DEEPLINK_URL =
  process.env.ZOOM_DEEPLINK_URL || "https://zoom.us/v2/zoomapp/deeplink";

/**
 * Build HTTP Basic auth header value for client credentials.
 * @param {string} clientId
 * @param {string} clientSecret
 * @returns {string} e.g., "Basic abc123..."
 */
export function buildBasicAuth(clientId, clientSecret) {
  if (!clientId || !clientSecret) {
    throw new Error("Missing Zoom client credentials.");
  }
  return (
    "Basic " +
    Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64")
  );
}

/**
 * Exchange authorization code for tokens.
 * @param {{ code: string, redirectUri: string, clientId: string, clientSecret: string }}
 * @returns {Promise<{ access_token: string, refresh_token?: string, expires_in?: number }>}
 */
export async function exchangeCodeForAccessToken({
  code,
  redirectUri,
  clientId,
  clientSecret,
}) {
  if (!code || !redirectUri) {
    throw new Error("Missing code or redirectUri.");
  }

  const res = await fetch(ZOOM_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: buildBasicAuth(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    throw await httpError("Token exchange failed", res);
  }

  return res.json();
}

/**
 * Call Zoom Deeplink API and return the deeplink URL string.
 * The payload is passed straight through so you can customize action/target/type when needed.
 * @param {{ accessToken: string, payload: Record<string, any> }}
 * @returns {Promise<string>} deeplink URL
 */
export async function createZoomDeeplink({ accessToken, payload }) {
  if (!accessToken) throw new Error("Missing access token.");
  if (!payload) throw new Error("Missing deeplink payload.");

  const res = await fetch(ZOOM_DEEPLINK_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw await httpError("Deeplink creation failed", res);
  }

  const data = await res.json();

  // Some endpoints return { deeplink }, others may nest differently.
  const deeplink = data?.deeplink || data?.link || data?.url;
  if (!deeplink) {
    throw new Error("Deeplink API succeeded but no deeplink was returned.");
  }
  return deeplink;
}

/**
 * Normalize failed fetch responses into helpful Error objects.
 * @param {string} prefix
 * @param {Response} res
 * @returns {Promise<Error>}
 */
async function httpError(prefix, res) {
  const body = await res.text();
  const err = new Error(`${prefix} (status ${res.status}): ${body}`);
  err.status = res.status;
  err.body = body;
  return err;
}