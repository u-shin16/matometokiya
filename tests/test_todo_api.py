from __future__ import annotations

import hashlib
import os
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
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
    def __init__(self, client, store, key):
        self._client = client
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

    def collection(self, name):
        # サブコレクションも、名前だけで区別するフラットな入れ物にする
        # （既存のusers/api_tokens/pairing_codesと同じ簡略化）。
        return self._client.collection(name)


class _FakeCollection:
    def __init__(self, client, store):
        self._client = client
        self._store = store

    def document(self, key):
        return _FakeDocRef(self._client, self._store, key)


class FakeFirestoreClient:
    """Firestoreクライアントの最小限のフェイク（in-memory）。ペアリングコード周りのテスト専用。"""

    def __init__(self):
        self._collections: dict[str, dict] = {}

    def collection(self, name):
        return _FakeCollection(self, self._collections.setdefault(name, {}))


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


class AllNotesPayloadTests(unittest.TestCase):
    def test_orders_by_depth_then_order_then_id(self):
        notes = [
            ("root", {"title": "制作", "parent_id": None, "order": 0}),
            ("child-b", {"title": "後の項目", "parent_id": "root", "order": 2}),
            ("child-a", {"title": "先の項目", "content": "詳細", "parent_id": "root", "order": 1}),
        ]

        result = app_module.build_all_notes_payload(notes)

        self.assertEqual([note["id"] for note in result], ["root", "child-a", "child-b"])
        self.assertEqual(result[0]["path"], [])
        self.assertEqual(result[1]["path"], ["制作"])
        self.assertEqual(result[1]["content"], "詳細")

    def test_skips_notes_without_title_or_content(self):
        notes = [
            ("empty", {"title": "", "content": "", "parent_id": None}),
            ("kept", {"title": "残る", "parent_id": None}),
        ]

        result = app_module.build_all_notes_payload(notes)

        self.assertEqual([note["id"] for note in result], ["kept"])

    def test_includes_checked_state(self):
        notes = [("note", {"title": "済み", "parent_id": None, "checked": True})]

        result = app_module.build_all_notes_payload(notes)

        self.assertTrue(result[0]["checked"])

    def test_locked_note_content_is_always_hidden(self):
        notes = [
            ("note", {"title": "鍵付き", "content": "秘密の内容", "parent_id": None, "locked": True})
        ]

        result = app_module.build_all_notes_payload(notes)

        self.assertTrue(result[0]["locked"])
        self.assertEqual(result[0]["content"], "")

    def test_unlocked_note_content_is_always_included(self):
        notes = [("note", {"title": "通常", "content": "内容", "parent_id": None})]

        result = app_module.build_all_notes_payload(notes)

        self.assertFalse(result[0]["locked"])
        self.assertEqual(result[0]["content"], "内容")


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


class NotesApiTests(unittest.TestCase):
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
            response = self.client.get("/api/v1/notes")

        self.assertEqual(response.status_code, 401)

    def test_returns_all_notes_with_read_token(self):
        notes = [{"id": "note-1", "title": "メモ", "content": "", "path": [], "checked": False}]
        with (
            patch.dict(os.environ, self.env, clear=False),
            patch.object(app_module, "get_claude_include_locked_notes", return_value=False),
            patch.object(
                app_module, "fetch_all_notes_for_uid", return_value=notes
            ) as fetch,
        ):
            response = self.client.get(
                "/api/v1/notes",
                headers={"Authorization": f"Bearer {self.TOKEN}"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["notes"], notes)
        self.assertTrue(response.get_json()["read_only"])
        fetch.assert_called_once_with(self.UID, False)

    def test_passes_user_locked_notes_setting_to_fetch(self):
        with (
            patch.dict(os.environ, self.env, clear=False),
            patch.object(app_module, "get_claude_include_locked_notes", return_value=True),
            patch.object(
                app_module, "fetch_all_notes_for_uid", return_value=[]
            ) as fetch,
        ):
            response = self.client.get(
                "/api/v1/notes",
                headers={"Authorization": f"Bearer {self.TOKEN}"},
            )

        self.assertEqual(response.status_code, 200)
        fetch.assert_called_once_with(self.UID, True)

    def test_put_is_not_allowed(self):
        response = self.client.put("/api/v1/notes")
        self.assertEqual(response.status_code, 405)


class ClaudeConnectLockedNotesSettingApiTests(unittest.TestCase):
    UID = "firebase-user-123"

    def setUp(self):
        app_module.app.config.update(TESTING=True)
        self.client = app_module.app.test_client()

    def test_get_requires_login(self):
        response = self.client.get("/api/v1/claude-connect/locked-notes-setting")
        self.assertEqual(response.status_code, 401)

    def test_post_requires_login(self):
        response = self.client.post("/api/v1/claude-connect/locked-notes-setting")
        self.assertEqual(response.status_code, 401)

    def test_get_returns_current_setting(self):
        with (
            patch.object(
                app_module, "verify_firebase_id_token", return_value=(self.UID, None)
            ),
            patch.object(
                app_module, "get_claude_include_locked_notes", return_value=True
            ) as get_setting,
        ):
            response = self.client.get(
                "/api/v1/claude-connect/locked-notes-setting",
                headers={"Authorization": "Bearer some-id-token"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"include_locked": True})
        get_setting.assert_called_once_with(self.UID)

    def test_post_updates_setting(self):
        with (
            patch.object(
                app_module, "verify_firebase_id_token", return_value=(self.UID, None)
            ),
            patch.object(app_module, "set_claude_include_locked_notes") as set_setting,
        ):
            response = self.client.post(
                "/api/v1/claude-connect/locked-notes-setting",
                json={"include_locked": True},
                headers={"Authorization": "Bearer some-id-token"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"include_locked": True})
        set_setting.assert_called_once_with(self.UID, True)


class _FakeNoteSnapshot:
    def __init__(self, data):
        self._data = data

    @property
    def exists(self):
        return self._data is not None

    def to_dict(self):
        return dict(self._data) if self._data is not None else None


class NotesWriteApiTests(unittest.TestCase):
    TOKEN = "test-write-token-that-is-long-enough"
    UID = "firebase-user-123"

    def setUp(self):
        app_module.app.config.update(TESTING=True)
        self.client = app_module.app.test_client()
        self.env = {
            "MATOME_TODO_API_UID": self.UID,
            "MATOME_TODO_API_WRITE_TOKEN_SHA256": hashlib.sha256(
                self.TOKEN.encode("utf-8")
            ).hexdigest(),
        }

    # --- 作成 ---

    def test_create_rejects_missing_token(self):
        response = self.client.post("/api/v1/notes", json={"title": "x"})
        self.assertEqual(response.status_code, 401)

    def test_create_note(self):
        note = {"id": "note-1", "title": "見出し", "content": "本文", "parent_id": None}
        with (
            patch.dict(os.environ, self.env, clear=False),
            patch.object(app_module, "create_note_for_uid", return_value=note) as create,
        ):
            response = self.client.post(
                "/api/v1/notes",
                json={"title": "見出し", "content": "本文"},
                headers={"Authorization": f"Bearer {self.TOKEN}"},
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["id"], "note-1")
        create.assert_called_once_with(self.UID, "見出し", "本文", None)

    def test_create_returns_404_for_missing_parent(self):
        with (
            patch.dict(os.environ, self.env, clear=False),
            patch.object(app_module, "create_note_for_uid", return_value=None),
        ):
            response = self.client.post(
                "/api/v1/notes",
                json={"title": "x", "parent_id": "missing"},
                headers={"Authorization": f"Bearer {self.TOKEN}"},
            )

        self.assertEqual(response.status_code, 404)

    # --- 更新 ---

    def test_update_rejects_missing_token(self):
        response = self.client.patch("/api/v1/notes/note-1", json={"title": "x"})
        self.assertEqual(response.status_code, 401)

    def test_update_rejects_empty_payload(self):
        with patch.dict(os.environ, self.env, clear=False):
            response = self.client.patch(
                "/api/v1/notes/note-1",
                json={},
                headers={"Authorization": f"Bearer {self.TOKEN}"},
            )
        self.assertEqual(response.status_code, 400)

    def test_update_note(self):
        updated = {"id": "note-1", "title": "新タイトル", "content": "新本文"}
        fake_ref = SimpleNamespace(get=lambda: _FakeNoteSnapshot({"locked": False}))
        with (
            patch.dict(os.environ, self.env, clear=False),
            patch.object(app_module, "_note_ref", return_value=fake_ref),
            patch.object(
                app_module, "update_note_for_uid", return_value=updated
            ) as update,
        ):
            response = self.client.patch(
                "/api/v1/notes/note-1",
                json={"title": "新タイトル", "content": "新本文"},
                headers={"Authorization": f"Bearer {self.TOKEN}"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["title"], "新タイトル")
        update.assert_called_once_with(self.UID, "note-1", "新タイトル", "新本文", None)

    def test_update_checked_only(self):
        updated = {"id": "note-1", "title": "既存", "content": "既存本文", "checked": True}
        fake_ref = SimpleNamespace(get=lambda: _FakeNoteSnapshot({"locked": False}))
        with (
            patch.dict(os.environ, self.env, clear=False),
            patch.object(app_module, "_note_ref", return_value=fake_ref),
            patch.object(
                app_module, "update_note_for_uid", return_value=updated
            ) as update,
        ):
            response = self.client.patch(
                "/api/v1/notes/note-1",
                json={"checked": True},
                headers={"Authorization": f"Bearer {self.TOKEN}"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["checked"])
        update.assert_called_once_with(self.UID, "note-1", None, None, True)

    def test_update_returns_404_when_not_found(self):
        fake_ref = SimpleNamespace(get=lambda: _FakeNoteSnapshot(None))
        with (
            patch.dict(os.environ, self.env, clear=False),
            patch.object(app_module, "_note_ref", return_value=fake_ref),
            patch.object(app_module, "update_note_for_uid", return_value=None),
        ):
            response = self.client.patch(
                "/api/v1/notes/missing",
                json={"title": "x"},
                headers={"Authorization": f"Bearer {self.TOKEN}"},
            )

        self.assertEqual(response.status_code, 404)

    def test_update_rejects_locked_note_when_setting_off(self):
        fake_ref = SimpleNamespace(get=lambda: _FakeNoteSnapshot({"locked": True}))
        with (
            patch.dict(os.environ, self.env, clear=False),
            patch.object(app_module, "_note_ref", return_value=fake_ref),
            patch.object(app_module, "get_claude_include_locked_notes", return_value=False),
            patch.object(app_module, "update_note_for_uid") as update,
        ):
            response = self.client.patch(
                "/api/v1/notes/note-1",
                json={"title": "x"},
                headers={"Authorization": f"Bearer {self.TOKEN}"},
            )

        self.assertEqual(response.status_code, 403)
        update.assert_not_called()

    def test_update_allows_locked_note_when_setting_on(self):
        updated = {"id": "note-1", "title": "x", "content": ""}
        fake_ref = SimpleNamespace(get=lambda: _FakeNoteSnapshot({"locked": True}))
        with (
            patch.dict(os.environ, self.env, clear=False),
            patch.object(app_module, "_note_ref", return_value=fake_ref),
            patch.object(app_module, "get_claude_include_locked_notes", return_value=True),
            patch.object(app_module, "update_note_for_uid", return_value=updated) as update,
        ):
            response = self.client.patch(
                "/api/v1/notes/note-1",
                json={"title": "x"},
                headers={"Authorization": f"Bearer {self.TOKEN}"},
            )

        self.assertEqual(response.status_code, 200)
        update.assert_called_once()

    # --- 削除 ---

    def test_delete_rejects_missing_token(self):
        response = self.client.delete("/api/v1/notes/note-1")
        self.assertEqual(response.status_code, 401)

    def test_delete_note(self):
        fake_ref = SimpleNamespace(get=lambda: _FakeNoteSnapshot({"locked": False}))
        with (
            patch.dict(os.environ, self.env, clear=False),
            patch.object(app_module, "_note_ref", return_value=fake_ref),
            patch.object(app_module, "delete_note_for_uid", return_value=True) as delete,
        ):
            response = self.client.delete(
                "/api/v1/notes/note-1",
                headers={"Authorization": f"Bearer {self.TOKEN}"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"id": "note-1", "deleted": True})
        delete.assert_called_once_with(self.UID, "note-1")

    def test_delete_returns_404_when_not_found(self):
        fake_ref = SimpleNamespace(get=lambda: _FakeNoteSnapshot(None))
        with (
            patch.dict(os.environ, self.env, clear=False),
            patch.object(app_module, "_note_ref", return_value=fake_ref),
            patch.object(app_module, "delete_note_for_uid", return_value=False),
        ):
            response = self.client.delete(
                "/api/v1/notes/missing",
                headers={"Authorization": f"Bearer {self.TOKEN}"},
            )

        self.assertEqual(response.status_code, 404)

    def test_delete_rejects_locked_note_when_setting_off(self):
        fake_ref = SimpleNamespace(get=lambda: _FakeNoteSnapshot({"locked": True}))
        with (
            patch.dict(os.environ, self.env, clear=False),
            patch.object(app_module, "_note_ref", return_value=fake_ref),
            patch.object(app_module, "get_claude_include_locked_notes", return_value=False),
            patch.object(app_module, "delete_note_for_uid") as delete,
        ):
            response = self.client.delete(
                "/api/v1/notes/note-1",
                headers={"Authorization": f"Bearer {self.TOKEN}"},
            )

        self.assertEqual(response.status_code, 403)
        delete.assert_not_called()


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

    def test_start_only_creates_pairing_code_not_yet_connected(self):
        # コードを発行しただけの時点では、まだ誰も引き換えていないので
        # 「連携済み」にはならない（トークンも未登録）。これを保証しないと、
        # 発行しただけで画面が「連携済み」と表示され、実際には古いトークンの
        # ままなのに利用者が勘違いする不具合が再発する。
        result = app_module.start_claude_connect("uid-1")

        self.assertEqual(len(result["code"]), app_module._CLAUDE_PAIRING_CODE_LENGTH)
        self.assertTrue(result["code"].isdigit())
        self.assertEqual(result["expires_in"], 600)

        pairing = self.fake_db._collections["pairing_codes"][result["code"]]
        self.assertEqual(pairing["uid"], "uid-1")
        self.assertIn("read_token", pairing)
        self.assertIn("write_token", pairing)

        self.assertNotIn("users", self.fake_db._collections)
        self.assertNotIn("api_tokens", self.fake_db._collections)

    def test_exchange_marks_connected_and_creates_token_hashes(self):
        result = app_module.start_claude_connect("uid-1")
        exchanged = app_module.exchange_pairing_code(result["code"])
        self.assertIsNotNone(exchanged)

        user_doc = self.fake_db._collections["users"]["uid-1"]
        self.assertIn("claude_connected_at", user_doc)
        self.assertIn("claude_read_token_hash", user_doc)
        self.assertIn("claude_write_token_hash", user_doc)
        self.assertEqual(len(self.fake_db._collections["api_tokens"]), 2)

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
        result = app_module.start_claude_connect("uid-1")
        app_module.exchange_pairing_code(result["code"])
        self.assertEqual(len(self.fake_db._collections["api_tokens"]), 2)

        app_module._revoke_user_tokens("uid-1")

        self.assertEqual(len(self.fake_db._collections["api_tokens"]), 0)


class MarkTodoDoneLogicTests(unittest.TestCase):
    """mark_todo_done_for_uidが、Todo自体だけでなく元メモにもチェックを
    付けることを、フェイクのFirestoreで検証する。"""

    def setUp(self):
        self.fake_db = FakeFirestoreClient()
        self._patcher = patch.object(
            app_module, "get_firestore_client", return_value=self.fake_db
        )
        self._patcher.start()
        self.addCleanup(self._patcher.stop)

        self.fake_db.collection("users").document("uid-1").collection(
            "todos"
        ).document("todo-1").set({"note_id": "note-1", "done": False})
        self.fake_db.collection("users").document("uid-1").collection(
            "notes"
        ).document("note-1").set({"title": "対象メモ", "checked": False})

    def test_marks_note_checked_when_todo_has_note_id(self):
        found = app_module.mark_todo_done_for_uid("uid-1", "todo-1")
        self.assertTrue(found)

        todo = self.fake_db._collections["todos"]["todo-1"]
        self.assertTrue(todo["done"])

        note = self.fake_db._collections["notes"]["note-1"]
        self.assertTrue(note["checked"])
        self.assertIsNotNone(note.get("checked_at"))

    def test_returns_false_for_unknown_todo(self):
        found = app_module.mark_todo_done_for_uid("uid-1", "no-such-todo")
        self.assertFalse(found)

    def test_does_not_error_when_note_id_missing_or_note_deleted(self):
        self.fake_db.collection("users").document("uid-1").collection(
            "todos"
        ).document("todo-2").set({"done": False})  # note_idなし

        found = app_module.mark_todo_done_for_uid("uid-1", "todo-2")
        self.assertTrue(found)
        self.assertTrue(self.fake_db._collections["todos"]["todo-2"]["done"])


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


class McpServerTests(unittest.TestCase):
    """MCP（Claude Codeから直接つなぐ入口）のJSON-RPC応答。"""

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

    def _post(self, body, token):
        with patch.dict(os.environ, self.env, clear=False):
            return self.client.post(
                "/mcp", json=body, headers={"Authorization": f"Bearer {token}"}
            )

    def test_rejects_missing_token(self):
        response = self.client.post("/mcp", json={"jsonrpc": "2.0", "id": 1, "method": "ping"})
        self.assertEqual(response.status_code, 401)

    def test_rejects_wrong_token(self):
        with patch.dict(os.environ, self.env, clear=False), patch.object(
            app_module, "_lookup_user_token_uid", return_value=None
        ):
            response = self.client.post(
                "/mcp",
                json={"jsonrpc": "2.0", "id": 1, "method": "ping"},
                headers={"Authorization": "Bearer nope-nope-nope-nope-nope"},
            )
        self.assertEqual(response.status_code, 401)

    def test_get_is_not_allowed(self):
        self.assertEqual(self.client.get("/mcp").status_code, 405)

    def test_initialize_echoes_supported_protocol_version(self):
        response = self._post(
            {"jsonrpc": "2.0", "id": 1, "method": "initialize",
             "params": {"protocolVersion": "2025-03-26"}},
            self.READ_TOKEN,
        )
        payload = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["result"]["protocolVersion"], "2025-03-26")
        self.assertEqual(payload["result"]["serverInfo"]["name"], "matometokiya")

    def test_initialize_falls_back_for_unknown_version(self):
        response = self._post(
            {"jsonrpc": "2.0", "id": 1, "method": "initialize",
             "params": {"protocolVersion": "1999-01-01"}},
            self.READ_TOKEN,
        )
        self.assertEqual(
            response.get_json()["result"]["protocolVersion"],
            app_module.MCP_PROTOCOL_VERSION,
        )

    def test_notification_gets_no_body(self):
        response = self._post(
            {"jsonrpc": "2.0", "method": "notifications/initialized"}, self.READ_TOKEN
        )
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.get_data(), b"")

    def test_unknown_method_returns_json_rpc_error(self):
        response = self._post({"jsonrpc": "2.0", "id": 7, "method": "wat"}, self.READ_TOKEN)
        payload = response.get_json()
        self.assertEqual(payload["id"], 7)
        self.assertEqual(payload["error"]["code"], -32601)

    def test_read_token_lists_read_tools_only(self):
        response = self._post({"jsonrpc": "2.0", "id": 2, "method": "tools/list"}, self.READ_TOKEN)
        names = [tool["name"] for tool in response.get_json()["result"]["tools"]]
        self.assertEqual(names, ["list_notes", "list_todos"])

    def test_write_token_lists_write_tools_too(self):
        response = self._post({"jsonrpc": "2.0", "id": 2, "method": "tools/list"}, self.WRITE_TOKEN)
        names = [tool["name"] for tool in response.get_json()["result"]["tools"]]
        self.assertIn("create_note", names)
        self.assertIn("delete_note", names)
        self.assertIn("list_notes", names)

    def test_call_list_notes(self):
        notes = [{"id": "note-1", "title": "見出し", "content": "本文"}]
        with patch.object(app_module, "get_claude_include_locked_notes", return_value=False), \
             patch.object(app_module, "fetch_all_notes_for_uid", return_value=notes) as fetch:
            response = self._post(
                {"jsonrpc": "2.0", "id": 3, "method": "tools/call",
                 "params": {"name": "list_notes", "arguments": {}}},
                self.READ_TOKEN,
            )

        result = response.get_json()["result"]
        self.assertFalse(result["isError"])
        self.assertIn("見出し", result["content"][0]["text"])
        fetch.assert_called_once_with(self.UID, False)

    def test_call_create_note_with_read_token_is_rejected(self):
        response = self._post(
            {"jsonrpc": "2.0", "id": 4, "method": "tools/call",
             "params": {"name": "create_note", "arguments": {"title": "x"}}},
            self.READ_TOKEN,
        )
        result = response.get_json()["result"]
        self.assertTrue(result["isError"])
        self.assertIn("書き込み", result["content"][0]["text"])

    def test_call_create_note(self):
        note = {"id": "note-9", "title": "おにぎり", "content": "説明", "parent_id": None}
        with patch.object(app_module, "create_note_for_uid", return_value=note) as create:
            response = self._post(
                {"jsonrpc": "2.0", "id": 5, "method": "tools/call",
                 "params": {"name": "create_note", "arguments": {"title": "おにぎり", "content": "説明"}}},
                self.WRITE_TOKEN,
            )

        result = response.get_json()["result"]
        self.assertFalse(result["isError"])
        self.assertIn("note-9", result["content"][0]["text"])
        create.assert_called_once_with(self.UID, "おにぎり", "説明", None)

    def test_call_delete_note_moves_to_trash(self):
        with patch.object(
            app_module, "_note_ref",
            return_value=SimpleNamespace(get=lambda: _FakeNoteSnapshot({"locked": False})),
        ), patch.object(app_module, "delete_note_for_uid", return_value=True) as delete:
            response = self._post(
                {"jsonrpc": "2.0", "id": 6, "method": "tools/call",
                 "params": {"name": "delete_note", "arguments": {"note_id": "note-1"}}},
                self.WRITE_TOKEN,
            )

        result = response.get_json()["result"]
        self.assertFalse(result["isError"])
        self.assertIn("moved_to_trash", result["content"][0]["text"])
        delete.assert_called_once_with(self.UID, "note-1")

    def test_call_delete_note_blocks_locked_note(self):
        with patch.object(
            app_module, "_note_ref",
            return_value=SimpleNamespace(get=lambda: _FakeNoteSnapshot({"locked": True})),
        ), patch.object(app_module, "get_claude_include_locked_notes", return_value=False), \
             patch.object(app_module, "delete_note_for_uid") as delete:
            response = self._post(
                {"jsonrpc": "2.0", "id": 6, "method": "tools/call",
                 "params": {"name": "delete_note", "arguments": {"note_id": "note-1"}}},
                self.WRITE_TOKEN,
            )

        result = response.get_json()["result"]
        self.assertTrue(result["isError"])
        self.assertIn("鍵付き", result["content"][0]["text"])
        delete.assert_not_called()

    def test_call_update_note_requires_a_field(self):
        response = self._post(
            {"jsonrpc": "2.0", "id": 8, "method": "tools/call",
             "params": {"name": "update_note", "arguments": {"note_id": "note-1"}}},
            self.WRITE_TOKEN,
        )
        result = response.get_json()["result"]
        self.assertTrue(result["isError"])


class ClaudeConnectMcpCommandTests(unittest.TestCase):
    """MCP登録コマンドの発行（ログイン中の本人のみ）。"""

    UID = "firebase-user-123"

    def setUp(self):
        app_module.app.config.update(TESTING=True)
        self.client = app_module.app.test_client()

    def test_requires_login(self):
        response = self.client.post("/api/v1/claude-connect/mcp-command")
        self.assertEqual(response.status_code, 401)

    def test_returns_command_for_logged_in_user(self):
        issued = {
            "command": "claude mcp add --scope user ...",
            "token": "w-token",
            "connected_at": "2026-08-19T00:00:00+00:00",
        }
        with (
            patch.object(
                app_module, "verify_firebase_id_token", return_value=(self.UID, None)
            ),
            patch.object(app_module, "issue_claude_mcp_command", return_value=issued) as issue,
        ):
            response = self.client.post(
                "/api/v1/claude-connect/mcp-command",
                headers={"Authorization": "Bearer some-id-token"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), issued)
        issue.assert_called_once_with(self.UID)

    def test_command_includes_user_scope_and_endpoint(self):
        command = app_module.build_mcp_add_command("secret-token")
        self.assertIn("--scope user", command)
        self.assertIn("--transport http", command)
        self.assertIn(f"{app_module.SITE_URL}/mcp", command)
        self.assertIn('--header "Authorization: Bearer secret-token"', command)


if __name__ == "__main__":
    unittest.main()
