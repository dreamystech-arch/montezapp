import { local, upstream, UPSTREAM_BASE } from "./client";
import type {
  Category,
  MobileCMS,
  Product,
  RFQ,
  RFQPayload,
  Role,
  SiteSettings,
  User,
} from "./types";

// ---------------------------------------------------------------------------
// Upstream: catalog
// ---------------------------------------------------------------------------
export async function fetchProducts(params?: { category?: string; q?: string }) {
  const qs = new URLSearchParams();
  if (params?.category && params.category !== "all") qs.set("category", params.category);
  if (params?.q) qs.set("q", params.q);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await upstream<{ items: Product[] }>(`/api/products${suffix}`);
  let items = res.items ?? [];
  if (params?.category && params.category !== "all") {
    items = items.filter((p) => p.category === params.category);
  }
  if (params?.q) {
    const q = params.q.toLowerCase();
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    );
  }
  return items.filter((p) => !p.hidden);
}

export async function fetchProductBySlug(slug: string) {
  const items = await fetchProducts();
  return items.find((p) => p.slug === slug) ?? null;
}

export async function fetchCategories() {
  const res = await upstream<{ items: Category[] }>("/api/categories");
  return res.items ?? [];
}

export async function fetchSettings() {
  const res = await upstream<{ settings: SiteSettings }>("/api/settings");
  const s = res.settings;
  const absolutise = (u?: string) =>
    !u ? u : u.startsWith("http") ? u : `${UPSTREAM_BASE}${u}`;
  return {
    ...s,
    logoUrl: absolutise(s.logoUrl) ?? "",
    faviconUrl: absolutise(s.faviconUrl) ?? "",
  };
}

export async function submitRFQ(payload: RFQPayload) {
  return upstream<{ id: string }>("/api/rfq", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Upstream: real email OTP auth
// ---------------------------------------------------------------------------
export async function sendAuthOtp(email: string, role: Role) {
  return upstream<{ ok: boolean; message?: string; demoMode?: boolean; demoOtp?: string }>(
    "/api/auth/send-otp",
    { method: "POST", body: JSON.stringify({ email, role }) },
  );
}

export async function verifyAuthOtp(email: string, otp: string) {
  return upstream<{ ok: boolean; user: User }>("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
    captureCookie: true,
  });
}

export async function fetchMe() {
  return upstream<{ user: User | null }>("/api/auth/me", { withAuth: true });
}

export async function authLogout() {
  try {
    await upstream<{ ok: boolean }>("/api/auth/logout", { method: "POST", withAuth: true });
  } catch {
    /* best-effort */
  }
}

// ---------------------------------------------------------------------------
// Upstream: role-specific dashboards
// ---------------------------------------------------------------------------
export async function fetchMySummary() {
  return upstream<any>("/api/me/summary", { withAuth: true });
}

export async function fetchMyRFQs() {
  const res = await upstream<{ items: RFQ[] } | RFQ[]>("/api/me/rfqs", { withAuth: true });
  return Array.isArray(res) ? res : res.items ?? [];
}

export async function fetchPartnerOrders() {
  const res = await upstream<{ items: any[] } | any[]>("/api/me/partner/orders", { withAuth: true });
  return Array.isArray(res) ? res : res.items ?? [];
}

export async function fetchPartnerAnalytics() {
  return upstream<any>("/api/me/partner/analytics", { withAuth: true });
}

export async function fetchAdminUsers() {
  const res = await upstream<{ items: any[] } | any[]>("/api/admin/users", { withAuth: true });
  return Array.isArray(res) ? res : res.items ?? [];
}

export async function fetchAdminPartners() {
  const res = await upstream<{ items: any[] } | any[]>("/api/admin/partners", { withAuth: true });
  return Array.isArray(res) ? res : res.items ?? [];
}

export async function fetchAdminRFQs() {
  const res = await upstream<{ items: RFQ[] } | RFQ[]>("/api/admin/rfqs", { withAuth: true });
  return Array.isArray(res) ? res : res.items ?? [];
}

// ---------------------------------------------------------------------------
// Local supplementary backend
// ---------------------------------------------------------------------------
export async function fetchMobileCMS() {
  const res = await local<{ cms: MobileCMS }>("/api/mobile/cms");
  return res.cms;
}

export async function sendOtp(phone: string) {
  return local<{ status: string; phone: string; devOtp?: string }>(
    "/api/mobile/otp/send",
    { method: "POST", body: JSON.stringify({ phone }) },
  );
}

export async function verifyOtp(phone: string, otp: string) {
  return local<{ token: string; user: User }>("/api/mobile/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone, otp }),
  });
}

export async function registerPush(payload: {
  user_id: string;
  platform: string;
  device_token: string;
}) {
  return local<{ status: string }>("/api/register-push", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
