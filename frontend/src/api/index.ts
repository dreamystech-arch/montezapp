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
function absolutiseMediaUrl(u?: string | null): string | undefined {
  if (!u) return undefined;
  // Already an absolute URL pointing at the correct origin
  if (u.startsWith(UPSTREAM_BASE)) return u;
  // Absolute URL pointing at some other origin (e.g. https://montezinfobyte.com/api/media/...)
  // — swap the origin for our known API base so the media resolves via the app's backend.
  const otherOriginMatch = u.match(/^https?:\/\/[^/]+(\/.*)$/);
  if (otherOriginMatch) {
    const path = otherOriginMatch[1];
    // Only re-point paths that look like media assets; leave true external URLs (e.g. unsplash) alone.
    if (path.startsWith("/api/") || path.startsWith("/media/") || path.startsWith("/uploads/")) {
      return `${UPSTREAM_BASE}${path}`;
    }
    return u;
  }
  // Relative paths → prefix with the base API URL.
  if (u.startsWith("/")) return `${UPSTREAM_BASE}${u}`;
  return u;
}

function normaliseProductMedia(p: Product): Product {
  return {
    ...p,
    image: absolutiseMediaUrl(p.image),
    gallery: p.gallery?.map((g) => absolutiseMediaUrl(g)).filter((g): g is string => Boolean(g)),
  };
}

export async function fetchProducts(params?: { category?: string; q?: string }) {
  const qs = new URLSearchParams();
  if (params?.category && params.category !== "all") qs.set("category", params.category);
  if (params?.q) qs.set("q", params.q);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await upstream<{ items: Product[] }>(`/api/products${suffix}`);
  let items = (res.items ?? []).map(normaliseProductMedia);
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

export async function fetchMyOrders() {
  const res = await upstream<{ items: any[] } | any[]>("/api/me/orders", { withAuth: true });
  return Array.isArray(res) ? res : res.items ?? [];
}

export async function fetchMyQuotes() {
  const res = await upstream<{ items: any[] } | any[]>("/api/me/quotes", { withAuth: true });
  return Array.isArray(res) ? res : res.items ?? [];
}

export async function fetchMyWishlist() {
  const res = await upstream<{ items: any[] } | any[]>("/api/me/wishlist", { withAuth: true });
  return Array.isArray(res) ? res : res.items ?? [];
}

export async function fetchMyProfile() {
  return upstream<any>("/api/me/profile", { withAuth: true });
}

export async function fetchPartnerOrders() {
  const res = await upstream<{ items: any[] } | any[]>("/api/me/partner/orders", { withAuth: true });
  return Array.isArray(res) ? res : res.items ?? [];
}

export async function fetchPartnerPayments() {
  const res = await upstream<{ items: any[] } | any[]>("/api/me/partner/payments", { withAuth: true });
  return Array.isArray(res) ? res : res.items ?? [];
}

export async function fetchPartnerInventory() {
  const res = await upstream<{ items: any[] } | any[]>("/api/me/partner/inventory", { withAuth: true });
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

export async function fetchAdminProducts() {
  // /api/admin/products is auth-gated; falls back to public /api/products if unavailable.
  try {
    const res = await upstream<{ items: any[] } | any[]>("/api/admin/products", { withAuth: true });
    return Array.isArray(res) ? res : res.items ?? [];
  } catch {
    return fetchProducts();
  }
}

// ---------------------------------------------------------------------------
// Local supplementary backend
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// CMS: split-per-section endpoints at /api/cms/{splash|logo|banner|announcements|welcome}.
// Prefers the upstream site backend if those routes are live, else falls back
// to our local supplementary backend which serves the same shapes.
// ---------------------------------------------------------------------------
async function fetchCMSSection<T>(path: string): Promise<T | null> {
  try {
    return await upstream<T>(path);
  } catch {
    try {
      return await local<T>(path);
    } catch {
      return null;
    }
  }
}

export async function fetchMobileCMS(): Promise<MobileCMS> {
  const [splash, logo, banner, ann, welcome, legacy] = await Promise.all([
    fetchCMSSection<{ splashImage?: string; splashDurationMs?: number }>("/api/cms/splash"),
    fetchCMSSection<{ appLogo?: string }>("/api/cms/logo"),
    fetchCMSSection<{ homeBannerImage?: string; homeBannerText?: string }>("/api/cms/banner"),
    fetchCMSSection<{ items?: string[]; announcement?: string }>("/api/cms/announcements"),
    fetchCMSSection<{
      welcomeHeading?: string;
      welcomeSubtext?: string;
      welcomeImage?: string;
      slides?: { heading?: string; subtext?: string; image?: string }[];
    }>("/api/cms/welcome"),
    // Legacy singleton — filler for any field neither the upstream nor split
    // endpoints provide. This is our safety net so old admin data still shows.
    local<{ cms: MobileCMS }>("/api/mobile/cms").then((r) => r.cms).catch(() => null),
  ]);

  const firstSlide = welcome?.slides?.[0];

  return {
    splashImage: splash?.splashImage ?? legacy?.splashImage ?? "",
    splashDurationMs: splash?.splashDurationMs ?? legacy?.splashDurationMs ?? 1600,
    appLogo: logo?.appLogo ?? legacy?.appLogo ?? "",
    welcomeHeading: welcome?.welcomeHeading ?? firstSlide?.heading ?? legacy?.welcomeHeading ?? "",
    welcomeSubtext: welcome?.welcomeSubtext ?? firstSlide?.subtext ?? legacy?.welcomeSubtext ?? "",
    welcomeImage: welcome?.welcomeImage ?? firstSlide?.image ?? legacy?.welcomeImage ?? "",
    homeBannerImage: banner?.homeBannerImage ?? legacy?.homeBannerImage ?? "",
    homeBannerText: banner?.homeBannerText ?? legacy?.homeBannerText ?? "",
    announcement: ann?.announcement ?? ann?.items?.[0] ?? legacy?.announcement ?? "",
    updatedAt: legacy?.updatedAt ?? new Date().toISOString(),
  };
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
