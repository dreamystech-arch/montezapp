import { Platform } from "react-native";

// API client. Two backends:
//   - Upstream site backend (products, categories, RFQ, settings, pages/home, AUTH)
//   - Local supplementary backend (mobile CMS, phone-OTP demo, push register)
//
// EXPO_PUBLIC_BACKEND_URL is our local backend (via ingress /api → :8001).

export const UPSTREAM_BASE = "https://enterprise-supply-1.emergent.host";
export const LOCAL_BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

// Browsers can't do what native RN does for the upstream session: `fetch`
// hides `Set-Cookie` from JS entirely, and upstream always answers with
// `Access-Control-Allow-Origin: *`, which browsers refuse to pair with
// `credentials:'include'` (the request fails outright with "Failed to
// fetch"). So on web, every authenticated call is relayed through our local
// backend's `/api/proxy`, which holds the real upstream cookie server-side
// (immune to browser CORS rules) and hands the browser an opaque bearer
// token instead. Native is unaffected — it still talks to upstream directly.
const USE_AUTH_PROXY = Platform.OS === "web";

// -----------------------------------------------------------------------------
// Session credential handling. Native: the real upstream Cookie header,
// manually persisted so the session survives cold starts. Web: the opaque
// proxy token described above. Either way it's opaque to callers — they just
// pass it through setSession()/getSessionCookie().
// -----------------------------------------------------------------------------
let sessionCookie: string | null = null;

export function setSessionCookie(raw: string | null) {
  sessionCookie = raw;
}

export function getSessionCookie(): string | null {
  return sessionCookie;
}

/** Extract just the `name=value` pairs from a Set-Cookie header (dropping attributes). */
export function parseSetCookie(setCookieHeader: string | null): string | null {
  if (!setCookieHeader) return null;
  // Multiple cookies may be joined with commas. Split cautiously — attributes like `Expires=Mon, 02...`
  // contain commas too. Heuristic: split on `, ` followed by a token that looks like a cookie name.
  const parts = setCookieHeader.split(/,(?=\s*[A-Za-z0-9_\-]+=)/);
  const pairs: string[] = [];
  for (const part of parts) {
    const nv = part.split(";")[0]?.trim();
    if (nv && nv.includes("=")) pairs.push(nv);
  }
  return pairs.length > 0 ? pairs.join("; ") : null;
}

async function request<T>(
  base: string,
  path: string,
  init?: RequestInit & { withAuth?: boolean; captureCookie?: boolean },
): Promise<T> {
  const authed = Boolean(init?.withAuth || init?.captureCookie);
  const viaProxy = authed && USE_AUTH_PROXY;
  // The proxy mirrors upstream's own `/api/...` paths one level down, so
  // `/api/me/cart` → `/api/proxy/me/cart`.
  const targetBase = viaProxy ? LOCAL_BASE : base;
  const targetPath = viaProxy ? `/api/proxy${path.replace(/^\/api/, "")}` : path;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) || {}),
  };
  if (init?.withAuth) {
    if (viaProxy) {
      if (sessionCookie) headers["Authorization"] = `Bearer ${sessionCookie}`;
    } else if (sessionCookie) {
      headers["Cookie"] = sessionCookie;
    }
  }
  // Only send credentials for direct-to-upstream requests that deal with
  // session state — proxied requests authenticate via the Authorization
  // header above and never need cookies of their own.
  const needsCreds = !viaProxy && (init?.withAuth || init?.captureCookie);
  const res = await fetch(`${targetBase}${targetPath}`, {
    ...init,
    headers,
    ...(needsCreds ? { credentials: "include" as const } : {}),
  });
  if (init?.captureCookie && !viaProxy) {
    const raw = res.headers.get("set-cookie");
    const parsed = parseSetCookie(raw);
    if (parsed) sessionCookie = parsed;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let msg = `HTTP ${res.status}`;
    try {
      const j = JSON.parse(text);
      if (j?.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const json = (await res.json()) as any;
  if (init?.captureCookie && viaProxy && json?.token) {
    sessionCookie = json.token;
  }
  return json as T;
}

export const upstream = <T>(path: string, init?: Parameters<typeof request>[2]) =>
  request<T>(UPSTREAM_BASE, path, init);

export const local = <T>(path: string, init?: Parameters<typeof request>[2]) =>
  request<T>(LOCAL_BASE, path, init);

/** Local backend endpoints that need to know the signed-in user (cart), but
 * aren't part of the upstream-session proxy above — the local backend
 * resolves the user itself from this bearer credential on every call. */
export const localAuthed = <T>(path: string, init?: RequestInit) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) || {}),
  };
  if (sessionCookie) headers["Authorization"] = `Bearer ${sessionCookie}`;
  return request<T>(LOCAL_BASE, path, { ...init, headers });
};
