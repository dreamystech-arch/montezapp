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
// Prefers the upstream site backend if those routes return data, else falls
// back to our local supplementary backend (which the site admin also feeds).
// Upstream schema differs from local — this helper normalises both shapes.
// ---------------------------------------------------------------------------
async function fetchUpstreamCMS<T>(path: string): Promise<T | null> {
  try {
    return await upstream<T>(path);
  } catch {
    return null;
  }
}

async function fetchLocalCMS<T>(path: string): Promise<T | null> {
  try {
    return await local<T>(path);
  } catch {
    return null;
  }
}

type UpstreamSplash = { image?: string; backgroundColor?: string; tagline?: string; durationMs?: number };
type UpstreamLogo = { url?: string; darkUrl?: string };
type UpstreamBannerItem = { image?: string; title?: string; subtitle?: string; ctaText?: string; ctaLink?: string };
type UpstreamAnnouncement = { message?: string; type?: string; startsAt?: string; endsAt?: string };
type UpstreamWelcomeItem = { image?: string; heading?: string; subtext?: string; title?: string; subtitle?: string };

function pickString(...vals: (string | null | undefined)[]): string | undefined {
  for (const v of vals) if (typeof v === "string" && v.trim() !== "") return v;
  return undefined;
}

function pickActiveAnnouncement(items: UpstreamAnnouncement[] | undefined): string | undefined {
  if (!Array.isArray(items) || items.length === 0) return undefined;
  const now = Date.now();
  const active = items.filter((a) => {
    const start = a.startsAt ? Date.parse(a.startsAt) : -Infinity;
    const end = a.endsAt ? Date.parse(a.endsAt) : Infinity;
    return start <= now && now <= end && typeof a.message === "string" && a.message.trim() !== "";
  });
  const chosen = active[0] ?? items.find((a) => typeof a.message === "string" && a.message.trim() !== "");
  return chosen?.message;
}

export async function fetchMobileCMS(): Promise<MobileCMS> {
  const [splash, logo, banner, ann, welcome, legacy] = await Promise.all([
    fetchUpstreamCMS<UpstreamSplash>("/api/cms/splash"),
    fetchUpstreamCMS<UpstreamLogo>("/api/cms/logo"),
    fetchUpstreamCMS<{ items?: UpstreamBannerItem[] }>("/api/cms/banner"),
    fetchUpstreamCMS<{ items?: UpstreamAnnouncement[] }>("/api/cms/announcements"),
    fetchUpstreamCMS<{ items?: UpstreamWelcomeItem[] }>("/api/cms/welcome"),
    fetchLocalCMS<{ cms: MobileCMS }>("/api/mobile/cms").then((r) => r?.cms ?? null),
  ]);

  const bannerItem = banner?.items?.[0];
  const welcomeItem = welcome?.items?.[0];
  const upstreamAnnouncement = pickActiveAnnouncement(ann?.items);

  const splashImage = pickString(absolutiseMediaUrl(splash?.image), legacy?.splashImage) ?? "";
  const splashDurationMs = splash?.durationMs ?? legacy?.splashDurationMs ?? 1600;
  const appLogo = pickString(absolutiseMediaUrl(logo?.url), legacy?.appLogo) ?? "";
  const homeBannerImage =
    pickString(absolutiseMediaUrl(bannerItem?.image), legacy?.homeBannerImage) ?? "";
  const homeBannerText =
    pickString(bannerItem?.title, bannerItem?.subtitle, legacy?.homeBannerText) ?? "";
  const announcement = pickString(upstreamAnnouncement, legacy?.announcement) ?? "";
  const welcomeHeading = pickString(welcomeItem?.heading, welcomeItem?.title, legacy?.welcomeHeading) ?? "";
  const welcomeSubtext = pickString(welcomeItem?.subtext, welcomeItem?.subtitle, legacy?.welcomeSubtext) ?? "";
  const welcomeImage = pickString(absolutiseMediaUrl(welcomeItem?.image), legacy?.welcomeImage) ?? "";

  return {
    splashImage,
    splashDurationMs,
    appLogo,
    welcomeHeading,
    welcomeSubtext,
    welcomeImage,
    homeBannerImage,
    homeBannerText,
    announcement,
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
