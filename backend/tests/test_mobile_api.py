"""Backend tests for Montez Infobyte mobile supplementary API."""
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


# --- Health ---
class TestHealth:
    def test_root(self, api):
        r = api.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        j = r.json()
        assert j.get("ok") is True


# --- Mobile CMS ---
class TestMobileCMS:
    def test_get_default(self, api):
        r = api.get(f"{BASE_URL}/api/mobile/cms")
        assert r.status_code == 200
        cms = r.json()["cms"]
        for k in ["splashImage", "splashDurationMs", "appLogo", "welcomeHeading",
                  "welcomeSubtext", "welcomeImage", "homeBannerImage",
                  "homeBannerText", "announcement"]:
            assert k in cms, f"Missing {k}"

    def test_put_without_token_401(self, api):
        r = api.put(f"{BASE_URL}/api/mobile/cms", json={"announcement": "nope"})
        assert r.status_code == 401

    def test_put_with_token_updates(self, api):
        new_val = f"TEST_announcement_{int(time.time())}"
        r = api.put(
            f"{BASE_URL}/api/mobile/cms",
            json={"announcement": new_val},
            headers={"X-Admin-Token": ADMIN_TOKEN},
        )
        assert r.status_code == 200, r.text
        assert r.json()["cms"]["announcement"] == new_val
        # Follow-up GET reflects change
        g = api.get(f"{BASE_URL}/api/mobile/cms")
        assert g.json()["cms"]["announcement"] == new_val


# --- OTP ---
class TestOtp:
    phone = "+919999900001"

    def test_send_otp(self, api):
        r = api.post(f"{BASE_URL}/api/mobile/otp/send", json={"phone": self.phone})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("status") == "sent"
        assert j.get("devOtp") == "123456"

    def test_verify_wrong(self, api):
        r = api.post(f"{BASE_URL}/api/mobile/otp/verify",
                     json={"phone": self.phone, "otp": "000000"})
        assert r.status_code == 400

    def test_verify_correct(self, api):
        # Re-send since previous verify consumed nothing (still there)
        api.post(f"{BASE_URL}/api/mobile/otp/send", json={"phone": self.phone})
        r = api.post(f"{BASE_URL}/api/mobile/otp/verify",
                     json={"phone": self.phone, "otp": "123456"})
        assert r.status_code == 200, r.text
        j = r.json()
        assert "token" in j and j["token"].startswith("montez-")
        assert j["user"]["phone"] == self.phone


# --- Push register ---
class TestPush:
    def test_register(self, api):
        r = api.post(f"{BASE_URL}/api/register-push", json={
            "user_id": "TEST_user_1",
            "platform": "android",
            "device_token": "ExponentPushToken[TEST]",
        })
        assert r.status_code == 201, r.text
        assert r.json()["status"] in ("registered_local", "registered")

    def test_broadcast_without_token_401(self, api):
        r = api.post(f"{BASE_URL}/api/notifications/broadcast",
                     json={"title": "t", "message": "m"})
        assert r.status_code == 401

    def test_broadcast_with_token(self, api):
        r = api.post(
            f"{BASE_URL}/api/notifications/broadcast",
            json={"title": "TEST_title", "message": "TEST_msg"},
            headers={"X-Admin-Token": ADMIN_TOKEN},
        )
        # In preview, upstream key is placeholder → non-blocking; endpoint should not crash
        assert r.status_code == 200, r.text
        assert "status" in r.json()
