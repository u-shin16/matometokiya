"""「Claudeに任せる」（/api/v1/agent/runs）のテスト。起動とFirestoreは偽物に差し替える。"""
from __future__ import annotations

import unittest
from unittest.mock import MagicMock, patch

import app as app_module

ENV = {
    "CLAUDE_AGENT_OWNER_UID": "owner",
    "CLAUDE_ROUTINE_FIRE_URL": "https://api.anthropic.com/v1/claude_code/routines/trig_x/fire",
    "CLAUDE_ROUTINE_FIRE_TOKEN": "test-token",
}


class AgentTest(unittest.TestCase):
    def setUp(self):
        self.client = app_module.app.test_client()
        self.ref = MagicMock()
        self.ref.order_by.return_value.limit.return_value.stream.return_value = []
        self.fire = MagicMock(return_value="https://claude.ai/code/session_1")
        for patcher in (
            patch.dict("os.environ", ENV),
            patch.object(app_module, "_agent_runs_ref", return_value=self.ref),
            patch.object(app_module, "fire_claude_routine", self.fire),
        ):
            patcher.start()
            self.addCleanup(patcher.stop)

    def _as(self, uid):
        patcher = patch.object(app_module, "verify_firebase_id_token", return_value=(uid, None))
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_login_required(self):
        self.assertEqual(self.client.post("/api/v1/agent/runs", json={"text": "a"}).status_code, 401)
        self.fire.assert_not_called()

    def test_other_user_cannot_see_or_fire(self):
        self._as("someone")
        self.assertFalse(self.client.get("/api/v1/agent/runs").get_json()["enabled"])
        self.assertEqual(self.client.post("/api/v1/agent/runs", json={"text": "a"}).status_code, 404)
        self.fire.assert_not_called()

    def test_owner_fires_and_saves(self):
        self._as("owner")
        self.assertTrue(self.client.get("/api/v1/agent/runs").get_json()["enabled"])
        res = self.client.post("/api/v1/agent/runs", json={"text": " 直して "})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self.fire.call_args.args[2], "直して")
        self.assertNotIn("test-token", res.get_data(as_text=True))
        self.ref.add.assert_called_once()

    def test_empty_and_too_long(self):
        self._as("owner")
        for text in ("  ", "a" * 20001):
            self.assertEqual(self.client.post("/api/v1/agent/runs", json={"text": text}).status_code, 400)
        self.fire.assert_not_called()


if __name__ == "__main__":
    unittest.main()
