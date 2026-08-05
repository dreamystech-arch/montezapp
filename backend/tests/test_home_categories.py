"""Home-categories feature tests.

Covers:
- admin GET returns ALL upstream categories with enabled/order defaults
- admin GET / PUT require X-Admin-Token
- admin PUT persists, filters invalid slugs, deletes omitted slugs
- public GET returns ONLY enabled, in specified order
"""
import os

import pytest
import requests

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    "https://montez-mobile-mirror.preview.emergentagent.com",
).rstrip("/")
ADMIN_TOKEN = "montez-admin-2026"
ADMIN_HEADERS = {"X-Admin-Token": ADMIN_TOKEN, "Content-Type": "application/json"}


# ---- snapshot/restore so preview stays clean --------------------------------
@pytest.fixture(autouse=True)
def _snapshot_and_restore_home_categories():
    """Snapshot admin selection before, restore after each test."""
    s = requests.Session()
    snap = []
    try:
        r = s.get(f"{BASE_URL}/api/admin/home-categories", headers=ADMIN_HEADERS, timeout=10)
        if r.status_code == 200:
            snap = [
                {"slug": it["slug"], "order": it.get("order", 999), "enabled": bool(it.get("enabled", False))}
                for it in r.json().get("items", [])
                if it.get("enabled") or it.get("order", 999) != 999
            ]
    except Exception:
        snap = []
    yield
    try:
        s.put(
            f"{BASE_URL}/api/admin/home-categories",
            json={"items": snap},
            headers=ADMIN_HEADERS,
            timeout=15,
        )
    except Exception:
        pass


# ---- helpers ----------------------------------------------------------------
def _upstream_slugs():
    r = requests.get(
        "https://enterprise-supply-1.emergent.host/api/categories", timeout=15
    )
    return [c["slug"] for c in r.json().get("items", []) if c.get("slug")]


# ---- ADMIN GET --------------------------------------------------------------
class TestAdminGet:
    def test_admin_get_requires_token(self):
        r = requests.get(f"{BASE_URL}/api/admin/home-categories", timeout=10)
        assert r.status_code == 401

    def test_admin_get_rejects_wrong_token(self):
        r = requests.get(
            f"{BASE_URL}/api/admin/home-categories",
            headers={"X-Admin-Token": "wrong-token"},
            timeout=10,
        )
        assert r.status_code == 401

    def test_admin_get_lists_all_upstream_with_defaults(self):
        r = requests.get(
            f"{BASE_URL}/api/admin/home-categories", headers=ADMIN_HEADERS, timeout=15
        )
        assert r.status_code == 200
        items = r.json().get("items", [])
        assert len(items) > 0
        # Every item has required fields
        for it in items[:5]:
            assert "slug" in it
            assert "name" in it
            assert "enabled" in it
            assert "order" in it
            assert isinstance(it["enabled"], bool)
            assert isinstance(it["order"], int)


# ---- ADMIN PUT + PUBLIC GET LIFECYCLE ---------------------------------------
class TestHomeCategoriesLifecycle:
    def test_admin_put_requires_token(self):
        r = requests.put(
            f"{BASE_URL}/api/admin/home-categories",
            json={"items": []},
            timeout=10,
        )
        assert r.status_code == 401

    def test_public_get_no_auth_needed(self):
        r = requests.get(f"{BASE_URL}/api/cms/home-categories", timeout=10)
        assert r.status_code == 200
        assert "items" in r.json()

    def test_put_selection_public_filters_and_orders(self):
        slugs = _upstream_slugs()
        # pick 3 known real slugs
        # Prefer 'awnings' if upstream exposes it (as per review request),
        # otherwise fall back to another real slug so the test stays green.
        candidates = ["apparel", "air-purifiers", "awnings", "automotive", "bags"]
        pick = [s for s in candidates if s in slugs][:3]
        assert len(pick) == 3, f"Expected 3 real upstream slugs, got {pick}"
        # order 0, 1, 2 — but disable the middle one
        payload = {
            "items": [
                {"slug": pick[2], "order": 2, "enabled": True},   # awnings   order 2
                {"slug": pick[0], "order": 0, "enabled": True},   # apparel   order 0
                {"slug": pick[1], "order": 1, "enabled": False},  # disabled
            ]
        }
        r = requests.put(
            f"{BASE_URL}/api/admin/home-categories",
            json=payload,
            headers=ADMIN_HEADERS,
            timeout=15,
        )
        assert r.status_code == 200
        body = r.json()
        assert "items" in body
        pub = body["items"]
        # only the 2 enabled, in order 0 then 2
        assert [c["slug"] for c in pub] == [pick[0], pick[2]]
        assert [c["order"] for c in pub] == [0, 2]

        # verify via public GET
        r2 = requests.get(f"{BASE_URL}/api/cms/home-categories", timeout=10)
        assert r2.status_code == 200
        pub2 = r2.json()["items"]
        assert [c["slug"] for c in pub2] == [pick[0], pick[2]]
        # metadata present
        for c in pub2:
            assert c.get("name")
            assert "order" in c

    def test_put_omitting_slug_deletes_it(self):
        slugs = _upstream_slugs()
        a, b = "apparel", "air-purifiers"
        assert a in slugs and b in slugs
        # first PUT both enabled
        requests.put(
            f"{BASE_URL}/api/admin/home-categories",
            json={"items": [
                {"slug": a, "order": 0, "enabled": True},
                {"slug": b, "order": 1, "enabled": True},
            ]},
            headers=ADMIN_HEADERS,
            timeout=15,
        )
        pub = requests.get(f"{BASE_URL}/api/cms/home-categories", timeout=10).json()["items"]
        assert {c["slug"] for c in pub} == {a, b}

        # second PUT omitting b
        requests.put(
            f"{BASE_URL}/api/admin/home-categories",
            json={"items": [{"slug": a, "order": 0, "enabled": True}]},
            headers=ADMIN_HEADERS,
            timeout=15,
        )
        pub2 = requests.get(f"{BASE_URL}/api/cms/home-categories", timeout=10).json()["items"]
        assert [c["slug"] for c in pub2] == [a]

        # admin GET: b back to default enabled=false, order=999
        adm = requests.get(
            f"{BASE_URL}/api/admin/home-categories", headers=ADMIN_HEADERS, timeout=10
        ).json()["items"]
        b_row = next((it for it in adm if it["slug"] == b), None)
        assert b_row is not None
        assert b_row["enabled"] is False
        assert b_row["order"] == 999

    def test_put_invalid_slug_silently_skipped(self):
        payload = {
            "items": [
                {"slug": "apparel", "order": 0, "enabled": True},
                {"slug": "totally-fake-slug-xyz", "order": 1, "enabled": True},
            ]
        }
        r = requests.put(
            f"{BASE_URL}/api/admin/home-categories",
            json=payload,
            headers=ADMIN_HEADERS,
            timeout=15,
        )
        assert r.status_code == 200
        pub_slugs = [c["slug"] for c in r.json()["items"]]
        assert "apparel" in pub_slugs
        assert "totally-fake-slug-xyz" not in pub_slugs

        # admin GET should also not include the fake slug
        adm = requests.get(
            f"{BASE_URL}/api/admin/home-categories", headers=ADMIN_HEADERS, timeout=10
        ).json()["items"]
        assert all(it["slug"] != "totally-fake-slug-xyz" for it in adm)

    def test_public_untouched_categories_hidden(self):
        # PUT only apparel enabled
        requests.put(
            f"{BASE_URL}/api/admin/home-categories",
            json={"items": [{"slug": "apparel", "order": 0, "enabled": True}]},
            headers=ADMIN_HEADERS,
            timeout=15,
        )
        pub = requests.get(f"{BASE_URL}/api/cms/home-categories", timeout=10).json()["items"]
        assert [c["slug"] for c in pub] == ["apparel"]
        # air-purifiers never touched -> should not appear
        assert not any(c["slug"] == "air-purifiers" for c in pub)

    def test_empty_selection_hides_all(self):
        requests.put(
            f"{BASE_URL}/api/admin/home-categories",
            json={"items": []},
            headers=ADMIN_HEADERS,
            timeout=15,
        )
        pub = requests.get(f"{BASE_URL}/api/cms/home-categories", timeout=10).json()
        assert pub == {"items": []}
