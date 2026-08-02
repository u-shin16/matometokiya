from __future__ import annotations

import hashlib
import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import app as app_module


class _FakeSnapshot:
    def __init__(self, data):
        self._data = data

    @property
    def exists(self):
        return self._data is not None

    def to_dict(self):
        return dict(self._data) if self._data is not None else None


class _FakeDocRef:
    def __init__(self, store, key):
        self._store = store
        self._key = key

    def get(self):
        return _FakeSnapshot(self._store.get(self._key))

    def set(self, data, merge=False):
        if merge and self._key in self._store:
            self._store[self._key].update(data)
        else:
            self._store[self._key] = dict(data)

    def update(self, data):
        self._store[self._key].update(data)

    def delete(self):
        self._store.pop(self._key, None)


class _FakeCollection:
    def __init__(self, store):
        self._store = store

    def document(self, key):
        return _FakeDocRef(self._store, key)


class FakeFirestoreClient:
    """Firestoreクライアントの最小限のフェイク（in-memory）。ペアリングコード周りのテスト専用。"""

    def __init__(self):
        self._collections: dict[str, dict] = {}

    def collection(self, name):
        return _FakeCollection(self._collections.setdefault(name, {}))


class TodoPayloadTests(unittest.TestCase):
    def test_builds_only_incomplete_todos_and_derives_root_project(self):
        todos = [
            (
                "todo-pending",
                {
                    "note_id": "child",
                    "title": "追加時のタイトル",
                    "done": False,
                    "created_at": "2026-07-29T10:00:00",
                },
            ),
            (
                "todo-done",
                {
                    "note_id": "done-note",
                    "title": "完了済み",
                    "done": True,
                    "created_at": "2026-07-29T11:00:00",
                },
            ),
        ]
        notes = [
            ("root", {"title": "返事きたで", "parent_id": None}),
            ("child", {"title": "ログイン画面を改善する", "parent_id": "root"}),
            ("done-note", {"title": "完了済み", "parent_id": "root"}),
        ]

        result = app_module.build_incomplete_todo_payload(todos, notes)

        self.assertEqual(
            result,
            [
                {
                    "id": "todo-pending",
                    "content": "ログイン画面を改善する",
                    "note_content": "",
                    "children": [],
                    "path": ["返事きたで"],
                    "priority": None,
                    "project": "返事きたで",
                    "created_at": "2026-07-29T10:00:00",
                }
            ],
        )

    def test_includes_note_content_and_child_notes(self):
        todos = [
            (
                "todo-1",
                {
                    "note_id": "parent",
                    "title": "追加時のタイトル",
                    "done": False,
                    "created_at": "2026-07-29T10:00:00",
                },
            )
        ]
        notes = [
            ("root", {"title": "制作", "parent_id": None}),
            (
                "parent",
                {
                    "title": "最初の画面",
                    "content": "起動直後に表示する画面についてのメモ",
                    "parent_id": "root",
                },
            ),
            (
                "child-2",
                {"title": "ボタンを大きくする", "content": "", "parent_id": "parent", "order": 2},
            ),
            (
                "child-1",
                {"title": "配色を見直す", "content": "アクセントカラーを変更", "parent_id": "parent", "order": 1},
            ),
        ]

        result = app_module.build_incomplete_todo_payload(todos, notes)

        self.assertEqual(
            result[0]["note_content"], "起動直後に表示する画面についてのメモ"
        )
        self.assertEqual(
            result[0]["children"],
            [
                {"title": "配色を見直す", "content": "アクセントカラーを変更"},
                {"title": "ボタンを大きくする", "content": ""},
            ],
        )

    def test_includes_ancestor_path_from_root_to_parent(self):
        todos = [
            (
                "todo-1",
                {"note_id": "screen", "title": "追加時のタイトル", "done": False},
            )
        ]
        notes = [
            ("root", {"title": "制作", "parent_id": None}),
            ("app", {"title": "homepage", "parent_id": "root"}),
            ("screen", {"title": "最初の画面", "parent_id": "app"}),
        ]

        result = app_module.build_incomplete_todo_payload(todos, notes)

        self.assertEqual(result[0]["path"], ["制作", "homepage"])

    def test_project_filter_is_an_exact_match(self):
        todos = [
            (
                "todo-1",
                {
                    "note_id": "child",
                    "title": "ログイン画面を改善する",
                    "done": False,
                },
            )
        ]
        notes = [
            ("root", {"title": "返事きたで", "parent_id": None}),
            ("child", {"title": "ログイン画面を改善する", "parent_id": "root"}),
        ]

        self.assertEqual(
            len(app_module.build_incomplete_todo_payload(todos, notes, "返事きたで")),
            1,
        )
        self.assertEqual(
            app_module.build_incomplete_todo_payload(todos, notes, "別プロジェクト"),
            [],
        )

    def test_deleted_note_falls_back_to_todo_title(self):
        result = app_module.build_incomplete_todo_payload(
            [
                (
                    "todo-orphan",
                    {
                        "note_id": "missing",
                        "title": "削除前のタイトル",
                        "done": False,
                    },
                )
            ],
            [],
        )

        self.assertEqual(result[0]["content"], "削除前のタイトル")
        self.assertIsNone(result[0]["project"])


class TodoApiTests(unittest.TestCase):
    TOKEN = "test-token-that-is-long-and-random-enough"
    UID = "firebase-user-123"

    def setUp(self):
        app_module.app.config.update(TESTING=True)
        self.client = app_module.app.test_client()
        self.env = {
            "MATOME_TODO_API_UID": self.UID,
            "MATOME_TODO_API_TOKEN_SHA256": hashlib.sha256(
                self.TOKEN.encode("utf-8")
            ).hexdigest(),
        }

    def test_rejects_missing_token(self):
        with patch.dict(os.environ, self.env, clear=False):
            response = self.client.get("/api/v1/todos")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.headers["Cache-Control"], "no-store")
        self.assertIn("Bearer", response.headers["WWW-Authenticate"])

    def test_rejects_wrong_token(self):
        with (
            patch.dict(os.environ, self.env, clear=False),
            patch.object(app_module, "_lookup_user_token_uid", return_value=None),
        ):
            response = self.client.get(
                "/api/v1/todos",
                headers={"Authorization": "Bearer wrong-token"},
            )

        self.assertEqual(response.status_code, 401)

    def test_uses_server_side_uid_and_passes_project_filter(self):
        todos = [
            {
                "id": "todo-1",
                "content": "ログイン画面を改善する",
                "priority": None,
                "project": "返事きたで",
                "created_at": "2026-07-29T10:00:00",
            }
        ]
        with (
            patch.dict(os.environ, self.env, clear=False),
            patch.object(
                app_module,
                "fetch_incomplete_todos_for_uid",
                return_value=todos,
            ) as fetch,
        ):
            response = self.client.get(
                (
                    "/api/v1/todos"
                    "?project=%E8%BF%94%E4%BA%8B%E3%81%8D%E3%81%9F%E3%81%A7"
                    "&uid=another-user"
                ),
                headers={"Authorization": f"Bearer {self.TOKEN}"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["todos"], todos)
        self.assertTrue(response.get_json()["read_only"])
        fetch.assert_called_once_with(self.UID, "返事きたで")

    def test_post_is_not_allowed(self):
        response = self.client.post("/api/v1/todos")
        self.assertEqual(response.status_code, 405)


class TodoCompleteApiTests(unittest.TestCase):
    READ_TOKEN = "test-read-token-that-is-long-enough"
    WRITE_TOKEN = "test-write-token-that-is-long-enough"
    UID = "firebase-user-123"

    def setUp(self):
        app_module.app.config.update(TESTING=True)
        self.client = app_module.app.test_client()
        self.env = {
            "MATOME_TODO_API_UID": self.UID,
            "MATOME_TODO_API_TOKEN_SHA256": hashlib.sha256(
                self.READ_TOKEN.encode("utf-8")
            ).hexdigest(),
            "MATOME_TODO_API_WRITE_TOKEN_SHA256": hashlib.sha256(
                self.WRITE_TOKEN.encode("utf-8")
            ).hexdigest(),
        }

    def test_rejects_missing_token(self):
        with patch.dict(os.environ, self.env, clear=False):
            response = self.client.post("/api/v1/todos/todo-1/complete")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.headers["Cache-Control"], "no-store")

    def test_rejects_read_token_for_write_endpoint(self):
        with (
            patch.dict(os.environ, self.env, clear=False),
            patch.object(app_module, "_lookup_user_token_uid", return_value=None),
        ):
            response = self.client.post(
                "/api/v1/todos/todo-1/complete",
                headers={"Authorization": f"Bearer {self.READ_TOKEN}"},
            )

        self.assertEqual(response.status_code, 401)

    def test_marks_todo_done_with_write_token(self):
        with (
            patch.dict(os.environ, self.env, clear=False),
            patch.object(
                app_module, "mark_todo_done_for_uid", return_value=True
            ) as mark_done,
        ):
            response = self.client.post(
                "/api/v1/todos/todo-1/complete",
                headers={"Authorization": f"Bearer {self.WRITE_TOKEN}"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"id": "todo-1", "done": True})
        self.assertEqual(response.headers["Cache-Control"], "no-store")
        mark_done.assert_called_once_with(self.UID, "todo-1")

    def test_returns_404_when_todo_not_found(self):
        with (
            patch.dict(os.environ, self.env, clear=False),
            patch.object(app_module, "mark_todo_done_for_uid", return_value=False),
        ):
            response = self.client.post(
                "/api/v1/todos/missing-todo/complete",
                headers={"Authorization": f"Bearer {self.WRITE_TOKEN}"},
            )

        self.assertEqual(response.status_code, 404)

    def test_get_is_not_allowed(self):
        response = self.client.get("/api/v1/todos/todo-1/complete")
        self.assertEqual(response.status_code, 405)

    def test_accepts_per_user_token_without_admin_env_configured(self):
        """管理者用の環境変数が一切なくても、一般ユーザー用トークンで認証できる。"""
        with (
            patch.dict(os.environ, {}, clear=True),
            patch.object(
                app_module, "_lookup_user_token_uid", return_value="general-user-1"
            ),
            patch.object(app_module, "mark_todo_done_for_uid", return_value=True),
        ):
            response = self.client.post(
                "/api/v1/todos/todo-1/complete",
                headers={"Authorization": "Bearer some-general-user-token"},
            )

        self.assertEqual(response.status_code, 200)


class ClaudeConnectLogicTests(unittest.TestCase):
    """start_claude_connect / exchange_pairing_code の実際のロジックを、フェイクのFirestoreで検証する。"""

    def setUp(self):
        self.fake_db = FakeFirestoreClient()
        self._patcher = patch.object(
            app_module, "get_firestore_client", return_value=self.fake_db
        )
        self._patcher.start()
        self.addCleanup(self._patcher.stop)

    def test_start_creates_token_hashes_and_pairing_code(self):
        result = app_module.start_claude_connect("uid-1")

        self.assertEqual(len(result["code"]), app_module._CLAUDE_PAIRING_CODE_LENGTH)
        self.assertTrue(result["code"].isdigit())
        self.assertEqual(result["expires_in"], 600)

        pairing = self.fake_db._collections["pairing_codes"][result["code"]]
        self.assertEqual(pairing["uid"], "uid-1")
        self.assertIn("read_token", pairing)
        self.assertIn("write_token", pairing)

        user_doc = self.fake_db._collections["users"]["uid-1"]
        self.assertIn("claude_read_token_hash", user_doc)
        self.assertIn("claude_write_token_hash", user_doc)

    def test_exchange_returns_tokens_and_is_single_use(self):
        result = app_module.start_claude_connect("uid-1")
        code = result["code"]

        first = app_module.exchange_pairing_code(code)
        self.assertIsNotNone(first)
        self.assertIn("read_token", first)
        self.assertIn("write_token", first)

        second = app_module.exchange_pairing_code(code)
        self.assertIsNone(second)

    def test_exchange_rejects_expired_code(self):
        code = "99999999"
        self.fake_db._collections.setdefault("pairing_codes", {})[code] = {
            "uid": "uid-1",
            "read_token": "r",
            "write_token": "w",
            "expires_at": datetime.now(timezone.utc) - timedelta(seconds=1),
        }

        self.assertIsNone(app_module.exchange_pairing_code(code))

    def test_exchange_rejects_unknown_code(self):
        self.assertIsNone(app_module.exchange_pairing_code("00000000"))

    def test_authenticate_todo_request_resolves_uid_from_issued_token(self):
        result = app_module.start_claude_connect("uid-1")
        tokens = app_module.exchange_pairing_code(result["code"])

        read_hash = hashlib.sha256(tokens["read_token"].encode("utf-8")).hexdigest()
        self.assertEqual(
            app_module._lookup_user_token_uid(read_hash, "read"), "uid-1"
        )
        self.assertIsNone(
            app_module._lookup_user_token_uid(read_hash, "write")
        )

    def test_revoke_deletes_token_hashes(self):
        app_module.start_claude_connect("uid-1")
        self.assertEqual(len(self.fake_db._collections["api_tokens"]), 2)

        app_module._revoke_user_tokens("uid-1")

        self.assertEqual(len(self.fake_db._collections["api_tokens"]), 0)


class ClaudeConnectApiTests(unittest.TestCase):
    UID = "firebase-user-123"

    def setUp(self):
        app_module.app.config.update(TESTING=True)
        self.client = app_module.app.test_client()

    def test_start_requires_login(self):
        response = self.client.post("/api/v1/claude-connect/start")
        self.assertEqual(response.status_code, 401)

    def test_start_returns_code_for_logged_in_user(self):
        with (
            patch.object(
                app_module, "verify_firebase_id_token", return_value=(self.UID, None)
            ),
            patch.object(
                app_module,
                "start_claude_connect",
                return_value={"code": "12345678", "expires_in": 600},
            ) as start,
        ):
            response = self.client.post(
                "/api/v1/claude-connect/start",
                headers={"Authorization": "Bearer some-id-token"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"code": "12345678", "expires_in": 600})
        start.assert_called_once_with(self.UID)

    def test_status_requires_login(self):
        response = self.client.get("/api/v1/claude-connect/status")
        self.assertEqual(response.status_code, 401)

    def test_revoke_requires_login(self):
        response = self.client.post("/api/v1/claude-connect/revoke")
        self.assertEqual(response.status_code, 401)

    def test_exchange_rejects_malformed_code(self):
        response = self.client.post(
            "/api/v1/claude-connect/exchange", json={"code": "abc"}
        )
        self.assertEqual(response.status_code, 400)

    def test_exchange_rejects_unknown_or_expired_code(self):
        with patch.object(app_module, "exchange_pairing_code", return_value=None):
            response = self.client.post(
                "/api/v1/claude-connect/exchange", json={"code": "12345678"}
            )
        self.assertEqual(response.status_code, 404)

    def test_exchange_returns_tokens_for_valid_code(self):
        tokens = {"read_token": "r-token", "write_token": "w-token"}
        with patch.object(app_module, "exchange_pairing_code", return_value=tokens):
            response = self.client.post(
                "/api/v1/claude-connect/exchange", json={"code": "12345678"}
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), tokens)


if __name__ == "__main__":
    unittest.main()
