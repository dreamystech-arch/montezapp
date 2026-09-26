"""Montez Infobyte mobile app - supplementary backend.

Provides endpoints that don't exist on the upstream site backend
(enterprise-supply-1.emergent.host): mobile CMS overrides, OTP login,
push registration, and admin push broadcast.

Products, categories, RFQ, settings and page CMS are consumed directly
from the upstream site backend by the mobile app.
"""
from fastapi import FastAPI, APIRouter, HTTPException, Header, Request, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
import uuid
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Push service
PUSH_BASE_URL = "https://integrations.emergentagent.com"
PUSH_KEY = os.environ.get("EMERGENT_PUSH_KEY", "placeholder")

_push_client = httpx.AsyncClient(
    base_url=PUSH_BASE_URL,
    headers={"X-Push-Key": PUSH_KEY},
    timeout=10.0,
)

ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "montez-admin-2026")

app = FastAPI(title="Montez Infobyte Mobile API")
api_router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class MobileCMS(BaseModel):
    splashImage: str = "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"
    splashDurationMs: int = 1600
    appLogo: str = "https://enterprise-supply-1.emergent.host/api/media/f35b04da-6440-4c75-b6b8-ee7000113661"
    welcomeHeading: str = "India's Trusted B2B Manufacturing & Procurement Platform"
    welcomeSubtext: str = "Connecting manufacturers, suppliers, businesses and entrepreneurs through one powerful platform. Source smarter, scale faster, build with confidence."
    welcomeImage: str = "https://images.unsplash.com/photo-1590490584637-f0f83a370a95?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600"
    homeBannerImage: str = "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600"
    homeBannerText: str = "Verified Manufacturers • Transparent Pricing • Pan-India Delivery"
    announcement: str = "Free samples on select SKUs. Dispatch in 3-7 days."
    footer: dict = Field(
        default_factory=lambda: {
            "about": "Montez Infobyte connects verified Indian manufacturers, suppliers and businesses through one powerful B2B platform.",
            "quickLinks": [
                {"label": "About", "href": "https://montezinfobyte.com/about"},
                {"label": "Products", "href": "https://montezinfobyte.com/products"},
                {"label": "RFQ", "href": "https://montezinfobyte.com/rfq"},
                {"label": "Contact", "href": "https://montezinfobyte.com/contact"},
                {"label": "Get Your Store", "href": "https://montezinfobyte.com/get-your-store"},
            ],
            "contactColumns": [
                {"title": "Contact", "lines": ["+91 7639533953", "montez.spprt@gmail.com"]},
                {
                    "title": "Address",
                    "lines": [
                        "2nd floor W block,124",
                        "3rd Avenue Anna Nagar",
                        "Tamil Nadu, India",
                    ],
                },
            ],
            "socials": [
                {"label": "Facebook", "href": "https://www.facebook.com/montezinfobyte/", "icon": "logo-facebook"},
                {"label": "Instagram", "href": "https://www.instagram.com/montezinfobyte", "icon": "logo-instagram"},
                {"label": "LinkedIn", "href": "https://www.linkedin.com/company/montezinfobyte", "icon": "logo-linkedin"},
            ],
            "copyright": "© 2026 Montez Infobyte Private Limited. All rights reserved.",
        }
    )
    updatedAt: str = Field(default_factory=lambda: now_utc().isoformat())


class MobileCMSUpdate(BaseModel):
    splashImage: Optional[str] = None
    splashDurationMs: Optional[int] = None
    appLogo: Optional[str] = None
    welcomeHeading: Optional[str] = None
    welcomeSubtext: Optional[str] = None
    welcomeImage: Optional[str] = None
    homeBannerImage: Optional[str] = None
    homeBannerText: Optional[str] = None
    announcement: Optional[str] = None
    footer: Optional[dict] = None


class OtpSendBody(BaseModel):
    phone: str


class OtpVerifyBody(BaseModel):
    phone: str
    otp: str


class RegisterPushBody(BaseModel):
    user_id: str
    platform: str
    device_token: str


class BroadcastBody(BaseModel):
    title: str
    message: str
    action_url: Optional[str] = None


class HomeCategoryEntry(BaseModel):
    slug: str
    order: int = 0
    enabled: bool = True


class HomeCategoriesUpdate(BaseModel):
    items: List[HomeCategoryEntry]


# ---------------------------------------------------------------------------
# Root
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"ok": True, "service": "Montez Infobyte Mobile API", "time": now_utc().isoformat()}


# ---------------------------------------------------------------------------
# Mobile CMS
# ---------------------------------------------------------------------------
PUBLIC_MEDIA_BASE = os.environ.get(
    "PUBLIC_MEDIA_BASE",
    os.environ.get("MONTEZ_BACKEND_URL", "https://enterprise-supply-1.emergent.host"),
).rstrip("/")

LOCAL_FS_PREFIXES = ("file://", "/tmp/", "/var/", "/root/", "/home/", "/mnt/")


def _absolutise_url(u):
    """Ensure any image URL persisted or returned is an absolute HTTPS URL.

    - Rejects local-disk paths so nothing served from ephemeral disk sneaks in.
    - Prefixes relative paths (starting with `/`) with PUBLIC_MEDIA_BASE.
    - Leaves already-absolute http(s) URLs untouched.
    """
    if u is None or not isinstance(u, str):
        return u
    s = u.strip()
    if s == "":
        return s
    if any(s.lower().startswith(p) for p in LOCAL_FS_PREFIXES):
        return ""  # scrub — never serve local-disk paths to the app
    if s.startswith("http://") or s.startswith("https://"):
        return s
    if s.startswith("/"):
        return f"{PUBLIC_MEDIA_BASE}{s}"
    return s


def _absolutise_cms(doc: dict) -> dict:
    """Return a copy of the CMS doc with every image field absolutised."""
    out = dict(doc)
    for key in ("splashImage", "appLogo", "homeBannerImage", "welcomeImage"):
        if key in out:
            out[key] = _absolutise_url(out[key])
    # Footer may reference logos via absolute URLs already; nothing to rewrite there.
    return out


async def _get_cms_doc() -> dict:
    doc = await db.mobile_cms.find_one({"_id": "singleton"}, {"_id": 0})
    if not doc:
        default = MobileCMS().model_dump()
        await db.mobile_cms.insert_one({"_id": "singleton", **default})
        doc = default
    return _absolutise_cms(doc)


@api_router.get("/mobile/cms")
async def get_mobile_cms():
    return {"cms": await _get_cms_doc()}


# --- Split-per-section CMS endpoints matching /api/cms/{splash|logo|banner|announcements|welcome} ---
@api_router.get("/cms/splash")
async def get_cms_splash():
    doc = await _get_cms_doc()
    return {
        "image": doc.get("splashImage"),
        "splashImage": doc.get("splashImage"),
        "durationMs": doc.get("splashDurationMs"),
        "splashDurationMs": doc.get("splashDurationMs"),
    }


@api_router.get("/cms/logo")
async def get_cms_logo():
    doc = await _get_cms_doc()
    return {"url": doc.get("appLogo"), "appLogo": doc.get("appLogo")}


@api_router.get("/cms/banner")
async def get_cms_banner():
    """Return the same shape as upstream (items[]) so the frontend can consume
    either source with the same parser. Image is always an absolute URL."""
    doc = await _get_cms_doc()
    image = doc.get("homeBannerImage") or ""
    title = doc.get("homeBannerText") or ""
    return {
        "items": [{"image": image, "title": title, "subtitle": "", "ctaText": "", "ctaLink": ""}]
        if image
        else [],
        "homeBannerImage": image,
        "homeBannerText": title,
    }


@api_router.get("/cms/announcements")
async def get_cms_announcements():
    doc = await _get_cms_doc()
    text = doc.get("announcement") or ""
    items = (
        [{"message": text, "type": "info", "startsAt": None, "endsAt": None}] if text else []
    )
    return {"items": items, "announcement": text}


@api_router.get("/cms/welcome")
async def get_cms_welcome():
    doc = await _get_cms_doc()
    image = doc.get("welcomeImage") or ""
    heading = doc.get("welcomeHeading") or ""
    subtext = doc.get("welcomeSubtext") or ""
    items = (
        [{"image": image, "heading": heading, "subtext": subtext}]
        if (image or heading or subtext)
        else []
    )
    return {
        "items": items,
        "welcomeHeading": heading,
        "welcomeSubtext": subtext,
        "welcomeImage": image,
        "slides": items,
    }


@api_router.get("/cms/footer")
async def get_cms_footer():
    doc = await _get_cms_doc()
    footer = doc.get("footer") or MobileCMS().footer
    return footer


def _check_admin(x_admin_token: Optional[str]):
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(401, "Invalid admin token")


@api_router.put("/mobile/cms")
async def update_mobile_cms(
    body: MobileCMSUpdate,
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    # Absolutise + scrub local-disk paths on every image field before persisting.
    for key in ("splashImage", "appLogo", "homeBannerImage", "welcomeImage"):
        if key in patch:
            normalised = _absolutise_url(patch[key])
            if not normalised:
                raise HTTPException(
                    400,
                    f"{key} must be an absolute URL — local-disk paths are not allowed",
                )
            patch[key] = normalised
    patch["updatedAt"] = now_utc().isoformat()
    await db.mobile_cms.update_one({"_id": "singleton"}, {"$set": patch}, upsert=True)
    return {"cms": await _get_cms_doc()}


# ---------------------------------------------------------------------------
# Home categories — admin picks + orders which product categories the mobile
# app's Home screen surfaces. Backed by mongo `home_categories` collection.
# ---------------------------------------------------------------------------
async def _fetch_upstream_categories() -> List[dict]:
    url = os.environ.get("MONTEZ_BACKEND_URL", "https://enterprise-supply-1.emergent.host")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client_http:
            resp = await client_http.get(f"{url}/api/categories")
            resp.raise_for_status()
            data = resp.json()
            return data.get("items") or []
    except Exception as e:
        logging.warning(f"upstream categories fetch failed: {e}")
        return []


async def _get_home_category_overrides() -> Dict[str, dict]:
    cursor = db.home_categories.find({}, {"_id": 0})
    return {doc["slug"]: doc async for doc in cursor}


@api_router.get("/cms/home-categories")
async def get_public_home_categories():
    """Public: ordered list of enabled categories for the mobile Home screen.

    Joins live upstream category metadata with the admin's saved overrides.
    Categories the admin has never touched are omitted from the mobile home
    view (they only appear once the admin enables them here).
    """
    overrides = await _get_home_category_overrides()
    if not overrides:
        return {"items": []}
    cats = await _fetch_upstream_categories()
    by_slug = {c.get("slug"): c for c in cats if c.get("slug")}
    merged = []
    for slug, ov in overrides.items():
        if not ov.get("enabled", True):
            continue
        meta = by_slug.get(slug) or {}
        merged.append(
            {
                "slug": slug,
                "name": meta.get("name") or slug.replace("-", " ").title(),
                "icon": meta.get("icon"),
                "desc": meta.get("desc"),
                "order": int(ov.get("order", 0)),
            }
        )
    merged.sort(key=lambda c: (c["order"], c["name"].lower()))
    return {"items": merged}


@api_router.get("/admin/home-categories")
async def get_admin_home_categories(x_admin_token: Optional[str] = Header(default=None)):
    """Admin: every upstream category + its enabled/order override state, so an
    admin UI can render checkboxes + drag-order controls."""
    _check_admin(x_admin_token)
    overrides = await _get_home_category_overrides()
    cats = await _fetch_upstream_categories()
    rows = []
    for c in cats:
        slug = c.get("slug")
        if not slug:
            continue
        ov = overrides.get(slug, {})
        rows.append(
            {
                "slug": slug,
                "name": c.get("name") or slug,
                "icon": c.get("icon"),
                "desc": c.get("desc"),
                "enabled": bool(ov.get("enabled", False)),
                "order": int(ov.get("order", 999)),
            }
        )
    rows.sort(key=lambda r: (r["order"], r["name"].lower()))
    return {"items": rows}


@api_router.put("/admin/home-categories")
async def update_admin_home_categories(
    body: HomeCategoriesUpdate,
    x_admin_token: Optional[str] = Header(default=None),
):
    """Admin: replace the saved home-category selection.

    Accepts `{items: [{slug, order, enabled}]}`. Slugs not present in the
    request are removed from the selection.
    """
    _check_admin(x_admin_token)
    valid_slugs = {c.get("slug") for c in await _fetch_upstream_categories() if c.get("slug")}
    kept: List[str] = []
    for entry in body.items:
        if valid_slugs and entry.slug not in valid_slugs:
            # Skip slugs that don't exist upstream — never let admin save typos.
            continue
        await db.home_categories.update_one(
            {"slug": entry.slug},
            {
                "$set": {
                    "slug": entry.slug,
                    "order": entry.order,
                    "enabled": entry.enabled,
                    "updatedAt": now_utc().isoformat(),
                }
            },
            upsert=True,
        )
        kept.append(entry.slug)
    # Delete any previously-saved slug not present in this PUT.
    await db.home_categories.delete_many({"slug": {"$nin": kept}})
    return await get_public_home_categories()


# ---------------------------------------------------------------------------
# OTP login (dev)
# ---------------------------------------------------------------------------
@api_router.post("/mobile/otp/send")
async def send_otp(body: OtpSendBody):
    phone = body.phone.strip()
    if len(phone) < 6:
        raise HTTPException(400, "Invalid phone number")
    # Dev OTP: 123456 for demo. Persist to allow verification.
    otp = "123456"
    expires_at = now_utc() + timedelta(minutes=10)
    await db.otps.update_one(
        {"phone": phone},
        {"$set": {"phone": phone, "otp": otp, "expiresAt": expires_at.isoformat()}},
        upsert=True,
    )
    logging.info(f"[OTP] phone={phone} otp={otp}")
    return {"status": "sent", "phone": phone, "devOtp": otp}


@api_router.post("/mobile/otp/verify")
async def verify_otp(body: OtpVerifyBody):
    phone = body.phone.strip()
    doc = await db.otps.find_one({"phone": phone}, {"_id": 0})
    if not doc or doc.get("otp") != body.otp.strip():
        raise HTTPException(400, "Invalid OTP")
    expires_at = datetime.fromisoformat(doc["expiresAt"])
    if now_utc() > expires_at:
        raise HTTPException(400, "OTP expired")

    user = await db.users.find_one({"phone": phone}, {"_id": 0})
    if not user:
        user = {
            "id": str(uuid.uuid4()),
            "phone": phone,
            "createdAt": now_utc().isoformat(),
        }
        await db.users.insert_one({**user})
        user = await db.users.find_one({"phone": phone}, {"_id": 0})

    await db.otps.delete_one({"phone": phone})
    token = f"montez-{user['id']}"
    return {"token": token, "user": user}


# ---------------------------------------------------------------------------
# Web relay for the upstream (enterprise-supply-1.emergent.host) session.
#
# That API only ever answers `Access-Control-Allow-Origin: *` with no
# `Access-Control-Allow-Credentials`, and browsers refuse to complete any
# `credentials:'include'` fetch against a wildcard CORS response — the
# request fails outright with "Failed to fetch". Browsers also never expose
# `Set-Cookie` to JS regardless of CORS, so there is no way for the mobile
# web build to hold the upstream session cookie itself. We complete the
# login server-to-server instead (no browser CORS rules apply here), keep
# the real cookie in `web_sessions`, and hand the browser an opaque bearer
# token that maps to it. Native is unaffected — it talks to upstream
# directly and keeps working exactly as before.
# ---------------------------------------------------------------------------
def _extract_cookie_header(set_cookie_values: Optional[List[str]]) -> Optional[str]:
    if not set_cookie_values:
        return None
    pairs = [v.split(";", 1)[0].strip() for v in set_cookie_values]
    pairs = [p for p in pairs if "=" in p]
    return "; ".join(pairs) if pairs else None


class ProxyVerifyOtpBody(BaseModel):
    email: str
    otp: str


@api_router.post("/proxy/auth/verify-otp")
async def proxy_verify_otp(body: ProxyVerifyOtpBody):
    async with httpx.AsyncClient(timeout=15.0) as client_http:
        resp = await client_http.post(
            f"{PUBLIC_MEDIA_BASE}/api/auth/verify-otp",
            json=body.model_dump(),
        )
    try:
        data = resp.json()
    except Exception:
        raise HTTPException(502, "Upstream returned an invalid response")
    if resp.status_code >= 400:
        raise HTTPException(resp.status_code, data.get("error") or "Verification failed")

    token = str(uuid.uuid4())
    await db.web_sessions.update_one(
        {"token": token},
        {
            "$set": {
                "token": token,
                "cookie": _extract_cookie_header(resp.headers.get_list("set-cookie")),
                "user": data.get("user"),
                "createdAt": now_utc().isoformat(),
            }
        },
        upsert=True,
    )
    return {**data, "token": token}


@api_router.api_route("/proxy/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_authenticated(path: str, request: Request, authorization: Optional[str] = Header(default=None)):
    """Relay any other authenticated upstream call using the session stashed
    by proxy_verify_otp above, identified by the bearer token the browser
    sends back."""
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    session = await db.web_sessions.find_one({"token": token}, {"_id": 0}) if token else None
    if not session or not session.get("cookie"):
        raise HTTPException(401, "Not authenticated")

    body = await request.body()
    headers = {"Cookie": session["cookie"]}
    if body:
        headers["Content-Type"] = request.headers.get("content-type", "application/json")

    async with httpx.AsyncClient(timeout=15.0) as client_http:
        resp = await client_http.request(
            request.method,
            f"{PUBLIC_MEDIA_BASE}/api/{path}",
            params=dict(request.query_params),
            content=body,
            headers=headers,
        )

    if path == "auth/logout":
        await db.web_sessions.delete_one({"token": token})

    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type=resp.headers.get("content-type", "application/json"),
    )


# ---------------------------------------------------------------------------
# Cart — upstream (enterprise-supply-1.emergent.host) has no server-side cart
# API of its own; its site keeps the cart in browser localStorage, entirely
# unauthenticated. To give signed-in users a cart that syncs across devices,
# we store it ourselves, keyed by the upstream user id. Both native (which
# sends its real upstream session cookie as the bearer credential) and web
# (which sends the opaque proxy token from /proxy/auth/verify-otp) resolve to
# a user the same way other authenticated calls do.
# ---------------------------------------------------------------------------
class CartAddBody(BaseModel):
    productId: Optional[str] = None
    slug: Optional[str] = None
    quantity: int = 1


class CartUpdateBody(BaseModel):
    productId: str
    quantity: int


class CartRemoveBody(BaseModel):
    productId: str


async def _resolve_cart_user(authorization: Optional[str]) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Not authenticated")
    credential = authorization[7:].strip()

    session = await db.web_sessions.find_one({"token": credential}, {"_id": 0})
    if session and session.get("user"):
        return session["user"]

    # Not a known proxy token — treat it as a raw upstream session cookie
    # (the native path) and ask upstream who it belongs to.
    async with httpx.AsyncClient(timeout=10.0) as client_http:
        resp = await client_http.get(
            f"{PUBLIC_MEDIA_BASE}/api/auth/me", headers={"Cookie": credential}
        )
    user = resp.json().get("user") if resp.status_code == 200 else None
    if not user:
        raise HTTPException(401, "Not authenticated")
    return user


async def _find_upstream_product(product_id: Optional[str], slug: Optional[str]) -> Optional[dict]:
    if not product_id and not slug:
        return None
    async with httpx.AsyncClient(timeout=10.0) as client_http:
        resp = await client_http.get(f"{PUBLIC_MEDIA_BASE}/api/products")
    if resp.status_code != 200:
        return None
    for p in resp.json().get("items") or []:
        if (product_id and p.get("id") == product_id) or (slug and p.get("slug") == slug):
            return p
    return None


def _cart_unit_price(item: dict) -> float:
    raw = item.get("price")
    if isinstance(raw, (int, float)):
        return float(raw)
    digits = "".join(ch for ch in str(raw or "") if ch.isdigit() or ch == ".")
    if digits:
        return float(digits)
    return float(item.get("priceFrom") or 0)


def _product_image(product: dict) -> str:
    """Absolute image URL for a catalog product.

    Upstream serves product images as relative media paths ("/api/media/xyz"),
    and some records only carry the image inside `gallery`. Pick the first
    usable one and absolutise it so cart/order consumers never see a path they
    can't render.
    """
    candidates = [product.get("image"), product.get("imageUrl")]
    gallery = product.get("gallery")
    if isinstance(gallery, list):
        candidates.extend(g for g in gallery if isinstance(g, str))
    for candidate in candidates:
        url = _absolutise_url(candidate)
        if url:
            return url
    return ""


def _with_absolute_images(items: List[dict]) -> List[dict]:
    """Copy of `items` with each image absolutised — repairs items stored
    before images were absolutised at write time."""
    return [{**it, "image": _product_image(it)} for it in items]


def _cart_response(items: List[dict]) -> dict:
    subtotal = sum(_cart_unit_price(it) * it.get("quantity", 0) for it in items)
    item_count = sum(it.get("quantity", 0) for it in items)
    return {
        "items": _with_absolute_images(items),
        "subtotal": subtotal,
        "total": subtotal,
        "itemCount": item_count,
    }


async def _get_cart_items(user_id: str) -> List[dict]:
    doc = await db.carts.find_one({"userId": user_id}, {"_id": 0})
    return doc.get("items", []) if doc else []


async def _save_cart_items(user_id: str, items: List[dict]) -> None:
    await db.carts.update_one(
        {"userId": user_id},
        {"$set": {"userId": user_id, "items": items, "updatedAt": now_utc().isoformat()}},
        upsert=True,
    )


@api_router.get("/me/cart")
async def get_my_cart(authorization: Optional[str] = Header(default=None)):
    user = await _resolve_cart_user(authorization)
    return _cart_response(await _get_cart_items(user["id"]))


@api_router.post("/me/cart/add")
async def add_to_my_cart(body: CartAddBody, authorization: Optional[str] = Header(default=None)):
    user = await _resolve_cart_user(authorization)
    if not body.productId and not body.slug:
        raise HTTPException(400, "productId or slug is required")

    items = await _get_cart_items(user["id"])
    existing = next(
        (
            it
            for it in items
            if (body.productId and it.get("productId") == body.productId)
            or (body.slug and it.get("slug") == body.slug)
        ),
        None,
    )
    if existing:
        existing["quantity"] = existing.get("quantity", 0) + max(body.quantity, 1)
    else:
        product = await _find_upstream_product(body.productId, body.slug)
        if not product:
            raise HTTPException(404, "Product not found")
        items.append(
            {
                "productId": product.get("id"),
                "slug": product.get("slug"),
                "name": product.get("name"),
                "image": _product_image(product),
                "price": product.get("price"),
                "priceFrom": product.get("priceFrom"),
                "moq": product.get("moq"),
                "quantity": max(body.quantity, 1),
            }
        )
    await _save_cart_items(user["id"], items)
    return _cart_response(items)


@api_router.post("/me/cart/update")
async def update_my_cart_item(body: CartUpdateBody, authorization: Optional[str] = Header(default=None)):
    user = await _resolve_cart_user(authorization)
    items = await _get_cart_items(user["id"])
    if body.quantity <= 0:
        items = [it for it in items if it.get("productId") != body.productId]
    else:
        for it in items:
            if it.get("productId") == body.productId:
                it["quantity"] = body.quantity
                break
    await _save_cart_items(user["id"], items)
    return _cart_response(items)


@api_router.post("/me/cart/remove")
async def remove_my_cart_item(body: CartRemoveBody, authorization: Optional[str] = Header(default=None)):
    user = await _resolve_cart_user(authorization)
    items = [it for it in await _get_cart_items(user["id"]) if it.get("productId") != body.productId]
    await _save_cart_items(user["id"], items)
    return _cart_response(items)


@api_router.post("/me/checkout")
async def checkout_my_cart(authorization: Optional[str] = Header(default=None)):
    """Same story as cart itself — upstream has no checkout endpoint either
    (its own site's "checkout" just converts the local cart into an RFQ).
    We record the order against our own cart storage and clear it."""
    user = await _resolve_cart_user(authorization)
    items = await _get_cart_items(user["id"])
    if not items:
        raise HTTPException(400, "Cart is empty")

    order = {
        "id": str(uuid.uuid4()),
        "userId": user["id"],
        "customerEmail": user.get("email"),
        "customerName": user.get("name"),
        "items": items,
        **{k: v for k, v in _cart_response(items).items() if k != "items"},
        "status": "placed",
        "createdAt": now_utc().isoformat(),
    }
    await db.orders.insert_one(order)
    await _save_cart_items(user["id"], [])
    return {"id": order["id"], "orderId": order["id"], "status": "placed"}


def _order_summary(order: dict, include_customer: bool = False) -> dict:
    items = order.get("items", [])
    if len(items) == 1:
        product_name = items[0].get("name")
    elif items:
        product_name = f"{items[0].get('name')} + {len(items) - 1} more"
    else:
        product_name = None
    out = {
        "id": order.get("id"),
        "productName": product_name,
        "items": _with_absolute_images(items),
        "quantity": order.get("itemCount"),
        "subtotal": order.get("subtotal"),
        "total": order.get("total"),
        "status": order.get("status"),
        "paymentStatus": order.get("paymentStatus"),
        "paymentProvider": order.get("paymentProvider"),
        "createdAt": order.get("createdAt"),
    }
    if include_customer:
        out["customerEmail"] = order.get("customerEmail")
        out["customerName"] = order.get("customerName")
    return out


@api_router.get("/me/orders")
async def get_my_orders(authorization: Optional[str] = Header(default=None)):
    user = await _resolve_cart_user(authorization)
    cursor = db.orders.find({"userId": user["id"]}, {"_id": 0}).sort("createdAt", -1)
    return {"items": [_order_summary(o) async for o in cursor]}


@api_router.get("/admin/orders")
async def get_admin_orders(x_admin_token: Optional[str] = Header(default=None)):
    _check_admin(x_admin_token)
    cursor = db.orders.find({}, {"_id": 0}).sort("createdAt", -1)
    return {"items": [_order_summary(o, include_customer=True) async for o in cursor]}


# ---------------------------------------------------------------------------
# Push notifications
# ---------------------------------------------------------------------------
@api_router.post("/register-push", status_code=201)
async def register_push(body: RegisterPushBody):
    # Store locally so admin can enumerate registered users.
    await db.push_users.update_one(
        {"user_id": body.user_id},
        {
            "$set": {
                "user_id": body.user_id,
                "platform": body.platform,
                "device_token": body.device_token,
                "updatedAt": now_utc().isoformat(),
            }
        },
        upsert=True,
    )
    try:
        resp = await _push_client.post(
            "/api/v1/push/users/register", json=body.model_dump()
        )
        if resp.status_code == 401:
            # Placeholder key in preview is expected; don't hard-fail.
            logging.warning("EMERGENT_PUSH_KEY placeholder — upstream register skipped")
            return {"status": "registered_local"}
        if resp.status_code >= 500:
            raise HTTPException(502, "Push provider unavailable")
        resp.raise_for_status()
    except HTTPException:
        raise
    except Exception as e:
        logging.warning(f"Push register upstream failed (non-blocking): {e}")
    return {"status": "registered"}


async def send_push(recipients: List[str], data: dict, idempotency_key: Optional[str] = None) -> None:
    if not recipients:
        return
    if len(recipients) > 100:
        raise ValueError("max 100 recipients per /trigger call; chunk before sending")
    if "title" not in data or "message" not in data:
        raise ValueError("data must include title and message")
    payload: dict = {"recipients": recipients, "data": data}
    if idempotency_key:
        payload["$idempotency_key"] = idempotency_key
    resp = await _push_client.post("/api/v1/push/trigger", json=payload)
    if resp.status_code == 401:
        raise HTTPException(500, "EMERGENT_PUSH_KEY missing or invalid")
    if resp.status_code >= 500:
        raise HTTPException(502, "Push provider unavailable")
    resp.raise_for_status()


@api_router.post("/notifications/broadcast")
async def broadcast_notification(
    body: BroadcastBody,
    x_admin_token: Optional[str] = Header(default=None),
):
    _check_admin(x_admin_token)
    users_cursor = db.push_users.find({}, {"_id": 0, "user_id": 1})
    users = [u["user_id"] async for u in users_cursor]
    await db.broadcasts.insert_one(
        {
            "id": str(uuid.uuid4()),
            "title": body.title,
            "message": body.message,
            "action_url": body.action_url,
            "recipient_count": len(users),
            "createdAt": now_utc().isoformat(),
        }
    )
    if not users:
        return {"status": "no_recipients", "count": 0}
    data = {"title": body.title, "message": body.message}
    if body.action_url:
        data["action_url"] = body.action_url
    # Chunk in 100s
    chunk_size = 100
    sent = 0
    for i in range(0, len(users), chunk_size):
        chunk = users[i : i + chunk_size]
        try:
            await send_push(chunk, data, idempotency_key=str(uuid.uuid4()))
            sent += len(chunk)
        except Exception as e:
            logging.warning(f"Broadcast chunk failed (non-blocking): {e}")
    return {"status": "sent", "count": sent, "total": len(users)}


# ---------------------------------------------------------------------------
# Assemble
# ---------------------------------------------------------------------------
app.include_router(api_router)


@app.get("/health")
async def health():
    return {"status": "ok"}

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    await _push_client.aclose()
    client.close()
