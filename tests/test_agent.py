"""「Claudeに任せる」のチャット（/api/v1/agent/*）のテスト。起動とFirestoreは偽物に差し替える。"""
from __future__ import annotations

import itertools
import re
import tempfile
import unittest
from io import BytesIO
from pathlib import Path
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import app as app_module

ENV = {
    "CLAUDE_AGENT_OWNER_UID": "owner",
    "CLAUDE_ROUTINE_FIRE_URL": "https://api.anthropic.com/v1/claude_code/routines/trig_x/fire",
    "CLAUDE_ROUTINE_FIRE_TOKEN": "fire-secret",
}


class _Doc:
    def __init__(self, store, key):
        self.store, self.id = store, key

    def get(self):
        data = self.store.get(self.id)
        return SimpleNamespace(exists=data is not None, id=self.id,
                               to_dict=lambda: dict(data) if data else None)

    def set(self, data):
        self.store[self.id] = dict(data)

    def update(self, data):
        self.store[self.id].update(data)


class _Collection:
    def __init__(self):
        self.store, self.ids = {}, itertools.count(1)

    def document(self, key=None):
        return _Doc(self.store, key or f"chat{next(self.ids)}")

    def order_by(self, *args, **kwargs):
        query = MagicMock()
        query.limit.return_value.stream.return_value = [_Doc(self.store, k).get() for k in self.store]
        return query


def _append(ref, message, **fields):
    data = ref.store[ref.id]
    data["messages"] = data["messages"] + [message]
    data.update(fields)


class AgentTest(unittest.TestCase):
    def setUp(self):
        self.client = app_module.app.test_client()
        self.chats, self.tokens = _Collection(), {}
        self.fire = MagicMock(return_value="https://claude.ai/code/session_1")
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.files_dir = Path(folder.name)
        for patcher in (
            patch.dict("os.environ", ENV),
            patch.object(app_module, "_agent_chats_ref", return_value=self.chats),
            patch.object(app_module, "_agent_token_ref", lambda t: _Doc(self.tokens, t)),
            patch.object(app_module, "_agent_append", _append),
            patch.object(app_module, "fire_claude_routine", self.fire),
            patch.object(app_module, "_AGENT_FILES_DIR", self.files_dir),
        ):
            patcher.start()
            self.addCleanup(patcher.stop)

    def _as(self, uid):
        patcher = patch.object(app_module, "verify_firebase_id_token", return_value=(uid, None))
        patcher.start()
        self.addCleanup(patcher.stop)

    def _send(self, text="直して", chat_id=""):
        return self.client.post("/api/v1/agent/messages", json={"text": text, "chat_id": chat_id})

    def _report(self, token, kind, text="ok"):
        return self.client.post("/api/v1/agent/report", json={"kind": kind, "text": text},
                                headers={"Authorization": f"Bearer {token}"})

    def _chat(self, chat_id="chat1"):
        return self.client.get(f"/api/v1/agent/chats/{chat_id}").get_json()

    def test_login_required(self):
        self.assertEqual(self._send().status_code, 401)
        self.fire.assert_not_called()

    def test_other_user_cannot_see_or_send(self):
        self._as("someone")
        self.assertFalse(self.client.get("/api/v1/agent/chats").get_json()["enabled"])
        self.assertEqual(self._send().status_code, 404)
        self.assertEqual(self.client.get("/api/v1/agent/chats/chat1").status_code, 404)
        self.fire.assert_not_called()

    def test_conversation(self):
        self._as("owner")
        res = self._send("一覧を出して")
        self.assertEqual(res.get_json()["chat_id"], "chat1")
        token = next(iter(self.tokens))
        sent = self.fire.call_args.args[2]
        self.assertIn(token, sent)
        self.assertIn("一覧を出して", sent)
        self.assertNotIn("fire-secret", sent + res.get_data(as_text=True))
        self.assertEqual(self._send("次", "chat1").status_code, 409)

        self.assertEqual(self._report(token, "progress", "読んでいます").status_code, 200)
        self.assertEqual(self._chat()["status"], "running")
        self.assertEqual(self._report(token, "result", "3件です").status_code, 200)
        chat = self._chat()
        self.assertEqual(chat["status"], "done")
        self.assertEqual([m["role"] for m in chat["messages"]], ["user", "progress", "result"])
        # 返事のあとは同じ鍵を使えない
        self.assertEqual(self._report(token, "result").status_code, 401)

        self._send("2件目を明日に", "chat1")
        follow = self.fire.call_args.args[2]
        self.assertTrue(re.search(r"これまでの会話.*一覧を出して.*3件です.*今回の指示.*2件目を明日に", follow, re.S))
        self.assertNotIn("読んでいます", follow)

    def test_report_rejects_bad_token_and_body(self):
        self._as("owner")
        self._send()
        token = next(iter(self.tokens))
        self.assertEqual(self._report("wrong", "result").status_code, 401)
        self.assertEqual(self._report(token, "user").status_code, 400)
        self.assertEqual(self._report(token, "result", " ").status_code, 400)
        self.tokens[token]["expires_at"] = datetime.now(timezone.utc) - timedelta(seconds=1)
        self.assertEqual(self._report(token, "result").status_code, 401)

    def test_fire_failure_is_shown(self):
        self._as("owner")
        self.fire.side_effect = OSError("boom")
        self._send()
        chat = self._chat()
        self.assertEqual(chat["status"], "done")
        self.assertEqual(chat["messages"][-1]["role"], "error")

    def _upload(self, files, text=""):
        return self.client.post("/api/v1/agent/messages", content_type="multipart/form-data",
                                data={"text": text, "files": [(BytesIO(d), n) for n, d in files]})

    def test_attachment_only_for_run_token(self):
        self._as("owner")
        self.assertEqual(self._upload([('../写真 $(x);.png', b"png-data")]).status_code, 200)
        token = next(iter(self.tokens))
        sent = self.fire.call_args.args[2]
        self.assertIn("/api/v1/agent/files/0", sent)
        self.assertIn("0_写真_x_.png", sent)
        self.assertNotIn("$(x)", sent.split("## 添付ファイル")[1])
        url = "/api/v1/agent/files/0"
        self.assertEqual(self.client.get(url).status_code, 401)
        res = self.client.get(url, headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res.data, b"png-data")
        self.assertEqual(self.client.get("/api/v1/agent/files/1", headers={"Authorization": f"Bearer {token}"}).status_code, 404)
        self._report(token, "result")
        self.assertEqual(self.client.get(url, headers={"Authorization": f"Bearer {token}"}).status_code, 401)

    def test_attachment_limits(self):
        self._as("owner")
        self.assertEqual(self._upload([(f"{i}.txt", b"a") for i in range(4)]).status_code, 400)
        self.assertEqual(self._upload([("big.bin", b"a" * (10 * 1024 * 1024 + 1))]).status_code, 400)
        self.fire.assert_not_called()

    def test_repo_selection(self):
        self._as("owner")
        with patch.dict("os.environ", {"CLAUDE_AGENT_REPOS": "RakuYade-management,matometokiya"}):
            names = [r["name"] for r in self.client.get("/api/v1/agent/chats").get_json()["repos"]]
            self.assertEqual(names, ["RakuYade-management", "matometokiya"])
            bad = self.client.post("/api/v1/agent/messages", json={"text": "a", "repo": "secret"})
            self.assertEqual(bad.status_code, 400)
            self.fire.assert_not_called()
            self.client.post("/api/v1/agent/messages", json={"text": "a", "repo": "matometokiya"})
            self.assertIn("## 対象リポジトリ\nmatometokiya", self.fire.call_args.args[2])
            self.assertEqual(self._chat()["repo"], "matometokiya")
            self.chats.store["chat1"]["status"] = "done"
            mixed = self.client.post("/api/v1/agent/messages",
                                     json={"text": "b", "chat_id": "chat1", "repo": "RakuYade-management"})
            self.assertEqual(mixed.status_code, 400)
            self.assertEqual(self.fire.call_count, 1)

    def test_skills_per_repo(self):
        self._as("owner")
        with patch.dict("os.environ", {"CLAUDE_AGENT_REPOS": "RakuYade-management,note,other"}):
            repos = {r["name"]: [s["name"] for s in r["skills"]]
                     for r in self.client.get("/api/v1/agent/chats").get_json()["repos"]}
            self.assertIn("zenn-diary", repos["RakuYade-management"])
            self.assertIn("free-ideas", repos["note"])
            self.assertNotIn("zenn-diary", repos["note"])
            self.assertIn("note-draft", repos["note"])
            self.assertNotIn("deploy", repos["note"])
            self.assertEqual(repos["other"], [])
            self.client.post("/api/v1/agent/messages", json={"text": "/free-ideas", "repo": "note"})
            self.assertIn("note の .claude/skills/free-ideas/SKILL.md", self.fire.call_args.args[2])
            self.client.post("/api/v1/agent/messages", json={"text": "/zenn-diary", "repo": "note"})
            self.assertNotIn("## 使うスキル", self.fire.call_args.args[2])

    def test_empty_and_too_long(self):
        self._as("owner")
        for text in ("  ", "a" * 20001):
            self.assertEqual(self._send(text).status_code, 400)
        self.fire.assert_not_called()


if __name__ == "__main__":
    unittest.main()
