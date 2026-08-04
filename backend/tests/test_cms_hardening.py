"""Tests for CMS hardening: absolutise URLs on PUT + GET, reject local-disk paths,
and verify shape alignment with upstream."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    "https://montez-mobile-mirror.preview.emergentagent.com",
).rstrip("/")
ADMIN_TOKEN = "montez-admin-2026"
PUBLIC_MEDIA_BASE = "https://enterprise-supply-1.emergent.host"


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Local-disk / non-http path rejection on PUT ---
class TestRejectLocalPaths:
    @pytest.mark.parametrize(
        "bad",
        [
            "/tmp/local.png",
            "file:///etc/passwd",
            "/root/x.png",
            "/var/foo.jpg",
            "/home/user/img.jpg",
            "/mnt/data/img.png",
        ],
    )
    def test_put_rejects_local_disk_paths(self, api, bad):
        r = api.put(
            f"{BASE_URL}/api/mobile/cms",
            json={"homeBannerImage": bad},
            headers={"X-Admin-Token": ADMIN_TOKEN},
        )
        assert r.status_code == 400, f"expected 400 for {bad}, got {r.status_code}: {r.text}"
        assert "must be an absolute URL" in r.text or "local-disk" in r.text


# --- Absolutise on PUT ---
class TestAbsolutiseOnPut:
    def test_put_relative_becomes_absolute(self, api):
        rel = "/api/media/TEST_hardening_xyz"
        r = api.put(
            f"{BASE_URL}/api/mobile/cms",
            json={"homeBannerImage": rel},
            headers={"X-Admin-Token": ADMIN_TOKEN},
        )
        assert r.status_code == 200, r.text
        stored = r.json()["cms"]["homeBannerImage"]
        assert stored == f"{PUBLIC_MEDIA_BASE}{rel}", f"expected absolute, got {stored}"

        # subsequent GET reflects same absolute URL
        g = api.get(f"{BASE_URL}/api/mobile/cms").json()
        assert g["cms"]["homeBannerImage"] == f"{PUBLIC_MEDIA_BASE}{rel}"

    def test_put_absolute_url_unchanged(self, api):
        abs_url = "https://images.unsplash.com/photo-abc?w=100"
        r = api.put(
            f"{BASE_URL}/api/mobile/cms",
            json={"homeBannerImage": abs_url},
            headers={"X-Admin-Token": ADMIN_TOKEN},
        )
        assert r.status_code == 200
        assert r.json()["cms"]["homeBannerImage"] == abs_url


# --- Shape alignment with upstream ---
class TestCMSShapes:
    def test_splash_shape(self, api):
        j = api.get(f"{BASE_URL}/api/cms/splash").json()
        # both aliases populated
        assert "image" in j and "splashImage" in j
        assert j["image"] == j["splashImage"]
        assert "durationMs" in j and "splashDurationMs" in j
        assert j["durationMs"] == j["splashDurationMs"]

    def test_logo_shape(self, api):
        j = api.get(f"{BASE_URL}/api/cms/logo").json()
        assert "url" in j and "appLogo" in j
        assert j["url"] == j["appLogo"]

    def test_banner_items_shape_populated(self, api):
        # Ensure homeBannerImage is set first
        api.put(
            f"{BASE_URL}/api/mobile/cms",
            json={"homeBannerImage": "/api/media/TEST_banner_shape"},
            headers={"X-Admin-Token": ADMIN_TOKEN},
        )
        j = api.get(f"{BASE_URL}/api/cms/banner").json()
        assert "items" in j and isinstance(j["items"], list)
        assert len(j["items"]) >= 1
        item = j["items"][0]
        for k in ("image", "title", "subtitle", "ctaText", "ctaLink"):
            assert k in item, f"banner item missing key {k}"
        assert item["image"].startswith("http"), "banner image must be absolute"

    def test_banner_items_empty_when_no_image(self, api):
        # Clear homeBannerImage by setting empty string is disallowed (would 400).
        # Instead, direct-mongo-like path: set via URL to a valid absolute, then observe.
        # We simulate empty via absolute="" is rejected too; so just verify contract:
        # if image is truthy, items must be [...]; if not, items must be [].
        j = api.get(f"{BASE_URL}/api/cms/banner").json()
        image = j.get("homeBannerImage") or ""
        if image:
            assert len(j["items"]) >= 1
        else:
            assert j["items"] == []

    def test_announcements_items_shape(self, api):
        j = api.get(f"{BASE_URL}/api/cms/announcements").json()
        assert "items" in j and isinstance(j["items"], list)
        if j["items"]:
            item = j["items"][0]
            for k in ("message", "type", "startsAt", "endsAt"):
                assert k in item, f"announcement item missing {k}"

    def test_welcome_items_shape(self, api):
        j = api.get(f"{BASE_URL}/api/cms/welcome").json()
        assert "items" in j and isinstance(j["items"], list)
        assert "welcomeHeading" in j and "welcomeSubtext" in j and "welcomeImage" in j
        if j["items"]:
            item = j["items"][0]
            for k in ("image", "heading", "subtext"):
                assert k in item


# --- GET absolutisation even for legacy relative data in mongo ---
class TestGetAbsolutisation:
    def test_get_returns_absolute_for_legacy_relative(self, api):
        # Insert relative path bypassing PUT by using a valid PUT (which absolutises)
        # then simulate legacy state via direct pymongo write.
        from motor.motor_asyncio import AsyncIOMotorClient
        import asyncio

        async def seed():
            c = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
            db = c[os.environ.get("DB_NAME", "test_database")]
            await db.mobile_cms.update_one(
                {"_id": "singleton"},
                {"$set": {"homeBannerImage": "/api/media/LEGACY_relative_xyz"}},
                upsert=True,
            )
            c.close()

        asyncio.run(seed())

        # GET should absolutise on the way out
        j = api.get(f"{BASE_URL}/api/mobile/cms").json()
        assert (
            j["cms"]["homeBannerImage"]
            == f"{PUBLIC_MEDIA_BASE}/api/media/LEGACY_relative_xyz"
        ), j["cms"]["homeBannerImage"]

        # Same for /api/cms/banner
        b = api.get(f"{BASE_URL}/api/cms/banner").json()
        assert b["homeBannerImage"].startswith("https://")
        assert b["items"][0]["image"].startswith("https://")
