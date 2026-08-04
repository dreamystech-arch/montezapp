"""Tests for the new CMS footer endpoint /api/cms/footer + admin patch."""
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


@pytest.fixture(autouse=True)
def restore_footer():
    """Snapshot the current footer, run the test, then restore it.

    This prevents the destructive PUT in test_admin_patch_updates_footer from
    leaving TEST_ placeholder data in the DB (which would break the live
    Home-tab footer preview for real users)."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    original = None
    try:
        r = s.get(f"{BASE_URL}/api/cms/footer", timeout=10)
        if r.status_code == 200:
            original = r.json()
    except Exception:
        original = None
    yield
    if original is not None:
        try:
            s.put(
                f"{BASE_URL}/api/mobile/cms",
                json={"footer": original},
                headers={"X-Admin-Token": ADMIN_TOKEN, "Content-Type": "application/json"},
                timeout=10,
            )
        except Exception:
            pass


class TestFooterEndpoint:
    def test_shape(self, api):
        r = api.get(f"{BASE_URL}/api/cms/footer")
        assert r.status_code == 200, r.text
        j = r.json()
        # Expected top-level keys
        for k in ("about", "quickLinks", "contactColumns", "socials", "copyright"):
            assert k in j, f"footer missing key {k}"
        assert isinstance(j["quickLinks"], list) and len(j["quickLinks"]) >= 1
        assert isinstance(j["contactColumns"], list) and len(j["contactColumns"]) >= 1
        assert isinstance(j["socials"], list) and len(j["socials"]) >= 1
        # Quick link shape
        ql = j["quickLinks"][0]
        assert "label" in ql and "href" in ql
        # Contact column shape
        cc = j["contactColumns"][0]
        assert "title" in cc and isinstance(cc.get("lines"), list)
        # Social shape
        sc = j["socials"][0]
        assert "label" in sc and "href" in sc

    def test_admin_patch_updates_footer(self, api):
        ts = int(time.time())
        new_about = f"TEST_about_{ts}"
        new_copy = f"TEST_copyright_{ts}"
        patch = {"footer": {"about": new_about, "copyright": new_copy,
                             "quickLinks": [{"label": "X", "href": "https://example.com/x"}],
                             "contactColumns": [{"title": "C", "lines": ["l1"]}],
                             "socials": [{"label": "S", "href": "https://example.com/s", "icon": "logo-facebook"}]}}
        r = api.put(f"{BASE_URL}/api/mobile/cms", json=patch,
                    headers={"X-Admin-Token": ADMIN_TOKEN})
        assert r.status_code == 200, r.text
        # /api/cms/footer must reflect
        j = api.get(f"{BASE_URL}/api/cms/footer").json()
        assert j["about"] == new_about
        assert j["copyright"] == new_copy
        assert j["quickLinks"][0]["label"] == "X"
        # And /api/mobile/cms.cms.footer also matches
        legacy = api.get(f"{BASE_URL}/api/mobile/cms").json()["cms"]
        assert legacy["footer"]["about"] == new_about
        assert legacy["footer"]["copyright"] == new_copy

    def test_put_footer_without_token_401(self, api):
        r = api.put(f"{BASE_URL}/api/mobile/cms",
                    json={"footer": {"about": "nope"}})
        assert r.status_code == 401
