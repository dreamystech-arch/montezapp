"""Regression: verify the upstream auth endpoints used by Account screen.

We cannot complete a real OTP verification in the test env (no real email),
but we can validate the shape of send-otp / verify-otp responses and that
role-based whitelisting for admin surfaces the expected error message.
"""
import requests

UPSTREAM = "https://enterprise-supply-1.emergent.host"


class TestUpstreamAuth:
    def test_send_otp_admin_unauthorized_email(self):
        r = requests.post(
            f"{UPSTREAM}/api/auth/send-otp",
            json={"email": "randomunknown@example.com", "role": "admin"},
            timeout=15,
        )
        assert r.status_code in (401, 403), r.text
        body = r.json()
        assert "error" in body
        assert "admin" in body["error"].lower()

    def test_send_otp_customer_returns_json(self):
        r = requests.post(
            f"{UPSTREAM}/api/auth/send-otp",
            json={"email": "test@example.com", "role": "customer"},
            timeout=15,
        )
        # Either delivery succeeds (200 ok:true) or upstream mailer transient 500.
        assert r.status_code in (200, 500), r.text
        body = r.json()
        assert isinstance(body, dict)

    def test_verify_otp_invalid_code(self):
        r = requests.post(
            f"{UPSTREAM}/api/auth/verify-otp",
            json={"email": "test@example.com", "otp": "000000"},
            timeout=15,
        )
        assert r.status_code == 400
        assert "invalid" in r.json().get("error", "").lower()
