"""Montez Infobyte mobile app - supplementary backend.

Provides endpoints that don't exist on the upstream site backend
(enterprise-supply-1.emergent.host): mobile CMS overrides, OTP login,
push registration, and admin push broadcast.

Products, categories, RFQ, settings and page CMS are consumed directly
from the upstream site backend by the mobile app.
"""
from fastapi import FastAPI, APIRouter, HTTPException, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import random
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
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


# ---------------------------------------------------------------------------
# Root
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"ok": True, "service": "Montez Infobyte Mobile API", "time": now_utc().isoformat()}


# ---------------------------------------------------------------------------
# Mobile CMS
# ---------------------------------------------------------------------------
async def _get_cms_doc() -> dict:
    doc = await db.mobile_cms.find_one({"_id": "singleton"}, {"_id": 0})
    if not doc:
        default = MobileCMS().model_dump()
        await db.mobile_cms.insert_one({"_id": "singleton", **default})
        return default
    return doc


@api_router.get("/mobile/cms")
async def get_mobile_cms():
    return {"cms": await _get_cms_doc()}


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
    patch["updatedAt"] = now_utc().isoformat()
    await db.mobile_cms.update_one({"_id": "singleton"}, {"$set": patch}, upsert=True)
    return {"cms": await _get_cms_doc()}


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
