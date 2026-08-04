"""Tests for split-per-section CMS endpoints /api/cms/{splash|logo|banner|announcements|welcome}."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://montez-mobile-mirror.preview.emergentagent.com").rstrip("/")
ADMIN_TOKEN = "montez-admin-2026"


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Individual endpoint shape ---
class TestCMSSplitEndpoints:
    def test_splash(self, api):
        r = api.get(f"{BASE_URL}/api/cms/splash")
        assert r.status_code == 200, r.text
        j = r.json()
        assert "splashImage" in j and isinstance(j["splashImage"], str)
        assert "splashDurationMs" in j and isinstance(j["splashDurationMs"], int)

    def test_logo(self, api):
        r = api.get(f"{BASE_URL}/api/cms/logo")
        assert r.status_code == 200
        j = r.json()
        assert "appLogo" in j and isinstance(j["appLogo"], str)

    def test_banner(self, api):
        r = api.get(f"{BASE_URL}/api/cms/banner")
        assert r.status_code == 200
        j = r.json()
        assert "homeBannerImage" in j and "homeBannerText" in j

    def test_announcements(self, api):
        r = api.get(f"{BASE_URL}/api/cms/announcements")
        assert r.status_code == 200
        j = r.json()
        assert "items" in j and isinstance(j["items"], list)
        assert "announcement" in j and isinstance(j["announcement"], str)

    def test_welcome(self, api):
        r = api.get(f"{BASE_URL}/api/cms/welcome")
        assert r.status_code == 200
        j = r.json()
        for k in ("welcomeHeading", "welcomeSubtext", "welcomeImage"):
            assert k in j
        assert isinstance(j.get("slides"), list) and len(j["slides"]) >= 1
        slide = j["slides"][0]
        for k in ("heading", "subtext", "image"):
            assert k in slide


# --- Single source of truth: PUT /api/mobile/cms should reflect in every /api/cms/* endpoint ---
class TestCMSSingletonPropagation:
    def test_update_reflects_in_all_split_endpoints(self, api):
        ts = int(time.time())
        payload = {
            "splashImage": f"https://example.com/splash_{ts}.jpg",
            "splashDurationMs": 1800,
            "appLogo": f"https://example.com/logo_{ts}.png",
            "welcomeHeading": f"TEST_welcome_head_{ts}",
            "welcomeSubtext": f"TEST_welcome_sub_{ts}",
            "welcomeImage": f"https://example.com/welcome_{ts}.jpg",
            "homeBannerImage": f"https://example.com/banner_{ts}.jpg",
            "homeBannerText": f"TEST_banner_text_{ts}",
            "announcement": f"CMS_REFRESH_LIVE_{ts}",
        }
        r = api.put(f"{BASE_URL}/api/mobile/cms", json=payload,
                    headers={"X-Admin-Token": ADMIN_TOKEN})
        assert r.status_code == 200, r.text

        # Splash
        j = api.get(f"{BASE_URL}/api/cms/splash").json()
        assert j["splashImage"] == payload["splashImage"]
        assert j["splashDurationMs"] == payload["splashDurationMs"]

        # Logo
        j = api.get(f"{BASE_URL}/api/cms/logo").json()
        assert j["appLogo"] == payload["appLogo"]

        # Banner
        j = api.get(f"{BASE_URL}/api/cms/banner").json()
        assert j["homeBannerImage"] == payload["homeBannerImage"]
        assert j["homeBannerText"] == payload["homeBannerText"]

        # Announcements
        j = api.get(f"{BASE_URL}/api/cms/announcements").json()
        assert j["announcement"] == payload["announcement"]
        assert payload["announcement"] in j["items"]

        # Welcome
        j = api.get(f"{BASE_URL}/api/cms/welcome").json()
        assert j["welcomeHeading"] == payload["welcomeHeading"]
        assert j["welcomeSubtext"] == payload["welcomeSubtext"]
        assert j["welcomeImage"] == payload["welcomeImage"]
        slide0 = j["slides"][0]
        assert slide0["heading"] == payload["welcomeHeading"]
        assert slide0["subtext"] == payload["welcomeSubtext"]
        assert slide0["image"] == payload["welcomeImage"]

        # Legacy singleton also matches
        legacy = api.get(f"{BASE_URL}/api/mobile/cms").json()["cms"]
        for k, v in payload.items():
            assert legacy[k] == v, f"legacy singleton drift on {k}"
