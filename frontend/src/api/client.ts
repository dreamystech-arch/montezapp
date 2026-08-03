// API client. Two backends:
//   - Upstream site backend (products, categories, RFQ, settings, pages/home, AUTH)
//   - Local supplementary backend (mobile CMS, phone-OTP demo, push register)
//
// EXPO_PUBLIC_BACKEND_URL is our local backend (via ingress /api → :8001).

export const UPSTREAM_BASE = "https://enterprise-supply-1.emergent.host";
export const LOCAL_BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

// -----------------------------------------------------------------------------
// Session cookie handling. React Native fetch has its own jar per-app-run but
// we manually persist a Cookie header so the session survives cold starts.
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
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) || {}),
  };
  if (init?.withAuth && sessionCookie) {
    headers["Cookie"] = sessionCookie;
  }
  // Only send credentials for requests that actually deal with session state.
  // Upstream API returns `Access-Control-Allow-Origin: *` which browsers reject
  // when combined with `credentials: 'include'` — but native RN doesn't care.
  const needsCreds = init?.withAuth || init?.captureCookie;
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers,
    ...(needsCreds ? { credentials: "include" as const } : {}),
  });
  if (init?.captureCookie) {
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
  return (await res.json()) as T;
}

export const upstream = <T>(path: string, init?: Parameters<typeof request>[2]) =>
  request<T>(UPSTREAM_BASE, path, init);

export const local = <T>(path: string, init?: Parameters<typeof request>[2]) =>
  request<T>(LOCAL_BASE, path, init);
