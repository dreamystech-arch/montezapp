// API client. Two backends:
//   - Upstream site backend (products, categories, RFQ, settings, pages/home)
//   - Local supplementary backend (mobile CMS, OTP, push, admin broadcast)
//
// EXPO_PUBLIC_BACKEND_URL is our local backend (via ingress /api → :8001).

export const UPSTREAM_BASE = "https://enterprise-supply-1.emergent.host";
export const LOCAL_BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export const upstream = <T>(path: string, init?: RequestInit) =>
  request<T>(UPSTREAM_BASE, path, init);

export const local = <T>(path: string, init?: RequestInit) =>
  request<T>(LOCAL_BASE, path, init);
