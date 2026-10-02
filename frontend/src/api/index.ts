import { local, localAuthed, upstream, UPSTREAM_BASE } from "./client";
import type {
  Cart,
  CartItem,
  Category,
  Footer,
  HomeBanner,
  MobileCMS,
  Product,
  RFQ,
  RFQPayload,
  Role,
  SiteSettings,
  User,
  WalletSnapshot,
} from "./types";

// ---------------------------------------------------------------------------
// Upstream: catalog
// ---------------------------------------------------------------------------
function absolutiseMediaUrl(u?: string | null): string | undefined {
  if (!u) return undefined;
  const s = String(u).trim();
  if (s === "") return undefined;
  // Scrub anything that clearly points at ephemeral / local-disk storage.
  // These never render across process boundaries and should never reach <Image>.
  if (/^(blob:|data:|file:|content:)/i.test(s)) return undefined;
  if (/^(\/tmp\/|\/var\/|\/root\/|\/home\/|\/mnt\/)/.test(s)) return undefined;
  // Already an absolute URL pointing at the correct origin
  if (s.startsWith(UPSTREAM_BASE)) return s;
  // Absolute URL pointing at some other origin (e.g. https://montezinfobyte.com/api/media/...)
  // — swap the origin for our known API base so the media resolves via the app's backend.
  const otherOriginMatch = s.match(/^https?:\/\/[^/]+(\/.*)$/);
  if (otherOriginMatch) {
    const path = otherOriginMatch[1];
    // Only re-point paths that look like media assets; leave true external URLs (e.g. unsplash) alone.
    if (path.startsWith("/api/") || path.startsWith("/media/") || path.startsWith("/uploads/")) {
      return `${UPSTREAM_BASE}${path}`;
    }
    return s;
  }
  // Relative paths → prefix with the base API URL.
  if (s.startsWith("/")) return `${UPSTREAM_BASE}${s}`;
  return s;
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

/** Admin-curated ordered list of enabled categories for the mobile Home screen.
 * Shared with the website: reads the same toggle the website's Homepage
 * Categories admin screen writes to, falling back to this app's own local
 * config only if the shared endpoint is unreachable. */
export async function fetchHomeCategories() {
  try {
    const res = await upstream<{ items: (Category & { order?: number })[] }>(
      "/api/cms/homepage-categories",
    );
    if (res.items?.length) {
      return res.items.map((c) => ({ ...c, id: c.slug, image: absolutiseMediaUrl(c.image) }));
    }
  } catch {
    /* fall through to local */
  }
  try {
    const res = await local<{ items: (Category & { order?: number })[] }>(
      "/api/cms/home-categories",
    );
    return res.items ?? [];
  } catch {
    return [];
  }
}

export type FeaturedConfig = { show: boolean; count: number; items: Product[] };

/** Admin-controlled Featured Products visibility + count, shared with the website. */
export async function fetchFeatured(): Promise<FeaturedConfig> {
  try {
    const res = await upstream<{ show?: boolean; count?: number; items?: Product[] }>(
      "/api/cms/featured",
    );
    return {
      show: res.show ?? true,
      count: res.count ?? 8,
      items: (res.items ?? []).map(normaliseProductMedia).filter((p) => !p.hidden),
    };
  } catch {
    return { show: true, count: 8, items: [] };
  }
}

// Local backend's CMS/admin write endpoints (splash, banner, announcements,
// home-categories, etc.) are gated by a shared admin token rather than the
// upstream session cookie — this mirrors the backend's own ADMIN_TOKEN env
// default so the in-app Admin dashboard can call them directly.
const LOCAL_ADMIN_TOKEN = process.env.EXPO_PUBLIC_ADMIN_TOKEN ?? "montez-admin-2026";

export type AdminHomeCategoryRow = Category & { enabled: boolean; order: number };

/** Admin: every upstream category with its current enabled/order state, for the Admin dashboard's Homepage Categories screen. */
export async function fetchAdminHomeCategories() {
  const res = await local<{ items: AdminHomeCategoryRow[] }>("/api/admin/home-categories", {
    headers: { "X-Admin-Token": LOCAL_ADMIN_TOKEN },
  });
  return res.items ?? [];
}

/** Admin: save the Homepage Categories selection (enabled + display order). */
export async function saveAdminHomeCategories(
  items: { slug: string; order: number; enabled: boolean }[],
) {
  return local<{ items: (Category & { order?: number })[] }>("/api/admin/home-categories", {
    method: "PUT",
    headers: { "X-Admin-Token": LOCAL_ADMIN_TOKEN },
    body: JSON.stringify({ items }),
  });
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

// Orders live in our own local backend, same as cart/checkout — upstream has
// no order records to read back (see checkoutCart below).
export async function fetchMyOrders() {
  const res = await localAuthed<{ items: any[] } | any[]>("/api/me/orders");
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

// Admin: every order placed through our local checkout, across all customers.
export async function fetchAdminOrders() {
  const res = await local<{ items: any[] } | any[]>("/api/admin/orders", {
    headers: { "X-Admin-Token": LOCAL_ADMIN_TOKEN },
  });
  return Array.isArray(res) ? res : res.items ?? [];
}

// Wallet and referral data are served by the website API so the app and the
// website admin panel operate on the same authenticated user and database.
export async function fetchWallet() {
  return upstream<WalletSnapshot>("/api/wallet", { withAuth: true });
}

export async function createMockWalletTopup(amount: number) {
  return upstream<{ ok: boolean; wallet: WalletSnapshot }>("/api/wallet/recharge/mock", {
    method: "POST",
    withAuth: true,
    body: JSON.stringify({ amount }),
  });
}

export async function claimInstallReward(code?: string, installReferrer?: string, testMode = false) {
  return upstream<{ ok: boolean; eligible?: boolean; alreadyClaimed?: boolean; wallet?: WalletSnapshot; message?: string }>(
    "/api/wallet/referrals/claim",
    { method: "POST", withAuth: true, body: JSON.stringify({ code: code?.trim() || "", installReferrer, testMode, source: installReferrer ? "google_play" : undefined }) },
  );
}

export async function requestWalletPayout(amount: number, payoutAddress: string) {
  return upstream<{ ok: boolean; payout: any }>("/api/wallet/payouts", {
    method: "POST",
    withAuth: true,
    body: JSON.stringify({ amount, payoutAddress }),
  });
}

export async function fetchWalletPayouts() {
  const res = await upstream<{ items: any[] }>("/api/wallet/payouts", { withAuth: true });
  return res.items ?? [];
}

export async function checkoutWithWallet(items: CartItem[]) {
  return upstream<{ ok: boolean; order: { id: string; number: string; totals: { total: number } }; wallet: WalletSnapshot }>(
    "/api/wallet/checkout",
    {
      method: "POST",
      withAuth: true,
      body: JSON.stringify({
        items: items.map((item) => ({
          productId: item.productId ?? item.id,
          slug: item.slug,
          quantity: item.quantity,
        })),
      }),
    },
  );
}

export async function clearCart() {
  const raw = await localAuthed<any>("/api/me/cart/clear", {
    method: "POST",
    body: JSON.stringify({}),
  });
  return normaliseCart(raw);
}

// ---------------------------------------------------------------------------
// Cart & checkout
// ---------------------------------------------------------------------------
// Cart items are assembled by our local backend from the upstream catalog, so
// their `image` arrives as a relative media path (e.g. "/api/media/xyz") just
// like a raw product does. <Image> can't resolve those, so run every cart item
// through the same absolutiser used for product media before handing it to the
// cart/checkout screens.
function normaliseCartItem(it: CartItem): CartItem {
  return {
    ...it,
    image: absolutiseMediaUrl(it.image ?? it.imageUrl ?? it.gallery?.[0]),
  };
}

function normaliseCart(raw: any): Cart {
  const rawItems: CartItem[] = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : [];
  const items = rawItems.map(normaliseCartItem);
  const subtotal =
    raw?.subtotal ??
    raw?.total ??
    items.reduce((s, it) => s + (Number(it.price) || 0) * (it.quantity ?? 0), 0);
  return {
    items,
    subtotal: Number(subtotal) || 0,
    total: Number(raw?.total ?? subtotal) || 0,
    itemCount: items.reduce((s, it) => s + (it.quantity ?? 0), 0),
  };
}

// Upstream (enterprise-supply-1.emergent.host) has no server-side cart API —
// its own site keeps the cart in browser localStorage, unauthenticated. Our
// signed-in, cross-device cart is backed by our own local supplementary
// backend instead, keyed off the same session credential used for the
// upstream-auth proxy (see client.ts's localAuthed / backend's /api/me/cart*).
export async function fetchCart(): Promise<Cart> {
  const raw = await localAuthed<any>("/api/me/cart");
  return normaliseCart(raw);
}

export async function addToCart(payload: { productId?: string; slug?: string; quantity: number }) {
  const raw = await localAuthed<any>("/api/me/cart/add", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normaliseCart(raw);
}

export async function updateCartItem(payload: { productId: string; quantity: number }) {
  const raw = await localAuthed<any>("/api/me/cart/update", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normaliseCart(raw);
}

export async function removeCartItem(payload: { productId: string }) {
  const raw = await localAuthed<any>("/api/me/cart/remove", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normaliseCart(raw);
}

export async function checkoutCart(payload?: Record<string, unknown>) {
  return localAuthed<{ id?: string; orderId?: string; status?: string }>("/api/me/checkout", {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
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
  const [splash, logo, banner, ann, welcome, footer, appSettings, siteSettings, legacy] = await Promise.all([
    fetchUpstreamCMS<UpstreamSplash>("/api/cms/splash"),
    fetchUpstreamCMS<UpstreamLogo>("/api/cms/logo"),
    fetchUpstreamCMS<{ items?: UpstreamBannerItem[] }>("/api/cms/banner"),
    fetchUpstreamCMS<{ items?: UpstreamAnnouncement[] }>("/api/cms/announcements"),
    fetchUpstreamCMS<{ items?: UpstreamWelcomeItem[] }>("/api/cms/welcome"),
    // Footer: upstream first, then local supplementary.
    fetchUpstreamCMS<Footer>("/api/cms/footer").then((r) =>
      r && (r.about || r.quickLinks || r.policyLinks || r.storeBadges || r.contactColumns || r.socials || r.copyright) ? r : null,
    ),
    fetchUpstreamCMS<{
      settings?: {
        logo?: { url?: string; darkUrl?: string };
        splash?: UpstreamSplash;
        welcomeSlides?: UpstreamWelcomeItem[];
        homeBanners?: (UpstreamBannerItem & { active?: boolean })[];
        announcements?: (UpstreamAnnouncement & { active?: boolean })[];
        footer?: Footer;
      };
    }>("/api/app-settings"),
    fetchUpstreamCMS<{ settings?: { logoUrl?: string } }>("/api/settings"),
    fetchLocalCMS<{ cms: MobileCMS }>("/api/mobile/cms").then((r) => r?.cms ?? null),
  ]);

  const localFooter = await fetchLocalCMS<Footer>("/api/cms/footer");
  // The dedicated App Settings footer is the app's editable source of truth.
  // Prefer it over the older shared website CMS footer so stale policy/contact
  // content there cannot overwrite current app footer settings.
  const footerSource = appSettings?.settings?.footer ?? footer ?? localFooter ?? legacy?.footer;
  const resolvedFooter: Footer | undefined = footerSource ? {
    ...footerSource,
    storeBadges: footerSource.storeBadges ? {
      ...footerSource.storeBadges,
      playStoreImage: absolutiseMediaUrl(footerSource.storeBadges.playStoreImage),
      appStoreImage: absolutiseMediaUrl(footerSource.storeBadges.appStoreImage),
    } : undefined,
  } : undefined;

  const appLogoUrl = appSettings?.settings?.logo?.url;
  const siteLogoUrl = siteSettings?.settings?.logoUrl;
  const appSplash = appSettings?.settings?.splash;
  const appHomeBanner = (appSettings?.settings?.homeBanners ?? []).find((b) => b?.active !== false);
  const appAnnouncement = (appSettings?.settings?.announcements ?? []).find(
    (a) => a?.active !== false,
  );
  const appWelcome = appSettings?.settings?.welcomeSlides?.[0];

  const bannerItem = banner?.items?.[0] ?? appHomeBanner;
  const welcomeItem = welcome?.items?.[0] ?? appWelcome;
  const upstreamAnnouncement =
    pickActiveAnnouncement(ann?.items) ??
    (appAnnouncement?.message && appAnnouncement.message.trim() !== ""
      ? appAnnouncement.message
      : undefined);

  // Build the full list of banners from whichever source has content. Priority:
  // (1) upstream /api/cms/banner.items[], (2) upstream /api/app-settings.homeBanners
  // (filtered by active !== false), (3) legacy single homeBannerImage.
  const upstreamBanners = (banner?.items ?? [])
    .map((b) => ({
      image: absolutiseMediaUrl(b?.image) ?? "",
      title: b?.title,
      subtitle: b?.subtitle,
      ctaLink: b?.ctaLink,
    }))
    .filter((b) => !!b.image);
  const appSettingsBanners = (appSettings?.settings?.homeBanners ?? [])
    .filter((b) => b?.active !== false)
    .map((b) => ({
      image: absolutiseMediaUrl(b?.image) ?? "",
      title: b?.title,
      subtitle: b?.subtitle,
      ctaLink: b?.ctaLink,
    }))
    .filter((b) => !!b.image);
  const legacyBanners = legacy?.homeBannerImage
    ? [{ image: legacy.homeBannerImage, title: legacy.homeBannerText, subtitle: "", ctaLink: "" }]
    : [];
  const homeBanners: HomeBanner[] =
    upstreamBanners.length > 0
      ? upstreamBanners
      : appSettingsBanners.length > 0
        ? appSettingsBanners
        : legacyBanners;

  const splashImage =
    pickString(
      absolutiseMediaUrl(splash?.image),
      absolutiseMediaUrl(appSplash?.image),
      legacy?.splashImage,
    ) ?? "";
  const splashDurationMs =
    splash?.durationMs ?? appSplash?.durationMs ?? legacy?.splashDurationMs ?? 1600;
  const appLogo =
    pickString(
      absolutiseMediaUrl(logo?.url),
      absolutiseMediaUrl(appLogoUrl),
      absolutiseMediaUrl(siteLogoUrl),
      legacy?.appLogo,
    ) ?? "";
  const homeBannerImage =
    pickString(absolutiseMediaUrl(bannerItem?.image), legacy?.homeBannerImage) ?? "";
  const homeBannerText =
    pickString(bannerItem?.title, bannerItem?.subtitle, legacy?.homeBannerText) ?? "";
  const announcement = pickString(upstreamAnnouncement, legacy?.announcement) ?? "";
  const welcomeHeading =
    pickString(welcomeItem?.heading, welcomeItem?.title, legacy?.welcomeHeading) ?? "";
  const welcomeSubtext =
    pickString(welcomeItem?.subtext, welcomeItem?.subtitle, legacy?.welcomeSubtext) ?? "";
  const welcomeImage =
    pickString(absolutiseMediaUrl(welcomeItem?.image), legacy?.welcomeImage) ?? "";

  return {
    splashImage,
    splashDurationMs,
    appLogo,
    welcomeHeading,
    welcomeSubtext,
    welcomeImage,
    homeBannerImage,
    homeBannerText,
    homeBanners,
    announcement,
    footer: resolvedFooter,
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
