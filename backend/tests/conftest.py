"""Session-scoped snapshot/restore of the CMS singleton.

Several tests in this directory intentionally mutate the mobile_cms singleton
(TEST_/example.com placeholders, legacy relative-path writes via motor, etc.).
Without a restore hook, those placeholders leak into the live preview and break
the Home banner / footer / logo for real users after the test suite runs.

This session-scoped autouse fixture:
  1. Snapshots /api/mobile/cms.cms before any test runs.
  2. After the whole suite completes, PUTs the snapshot back so the live app
     shows the original production content again.
"""
import os

import pytest
import requests

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    "https://montez-mobile-mirror.preview.emergentagent.com",
).rstrip("/")
ADMIN_TOKEN = "montez-admin-2026"


@pytest.fixture(autouse=True, scope="session")
def _restore_cms_singleton_after_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    snapshot = None
    try:
        r = s.get(f"{BASE_URL}/api/mobile/cms", timeout=10)
        if r.status_code == 200:
            snapshot = r.json().get("cms")
    except Exception:
        snapshot = None
    yield
    if not snapshot:
        return
    # Strip fields the PUT endpoint does not accept / auto-manages.
    snapshot.pop("_id", None)
    snapshot.pop("updatedAt", None)
    try:
        s.put(
            f"{BASE_URL}/api/mobile/cms",
            json=snapshot,
            headers={
                "X-Admin-Token": ADMIN_TOKEN,
                "Content-Type": "application/json",
            },
            timeout=15,
        )
    except Exception:
        pass
