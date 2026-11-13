"""アプリ内のAIアシスタント（/api/v1/assistant）のテスト。Geminiは偽物に差し替える。"""
from __future__ import annotations

import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import app as app_module
from google.genai import types as genai_types

NOTES = {
    "n1": {"id": "n1", "parent_id": None, "title": "買い物リスト", "content": "牛乳", "locked": False},
    "n4": {"id": "n4", "parent_id": None, "title": "日記", "content": "秘密", "locked": True},
}


class _Snap:
    def __init__(self, data):
        self._data = data
        self.exists = data is not None

    def to_dict(self):
        return dict(self._data) if self._data else None


class _Ref:
    def __init__(self, note_id):
        self._id = note_id

    def get(self):
        return _Snap(NOTES.get(self._id))


def _call_response(name, args):
    call = SimpleNamespace(name=name, args=args)
    content = genai_types.Content(role="model", parts=[genai_types.Part.from_function_call(name=name, args=args)])
    return SimpleNamespace(function_calls=[call], candidates=[SimpleNamespace(content=content)], text=None)


def _text_response(text):
    return SimpleNamespace(function_calls=None, candidates=[], text=text)


class _FakeClient:
    """決めておいた応答を順に返すGemini。受け取った会話も残す。"""

    def __init__(self, responses):
        self._responses = list(responses)
        self.seen = []
        self.models = self

    def generate_content(self, model, contents, config):
        self.seen.append(list(contents))
        return self._responses.pop(0)


class AssistantToolTests(unittest.TestCase):
    def setUp(self):
        patcher = patch.object(app_module, "_note_ref", side_effect=lambda uid, note_id: _Ref(note_id))
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_open_note_becomes_screen_action(self):
        actions = []
        app_module.run_assistant_tool("u", "open_note", {"note_id": "n1"}, actions)
        self.assertEqual(actions, [{"type": "open_note", "note_id": "n1", "title": "買い物リスト"}])

    def test_delete_is_left_to_screen_confirmation(self):
        actions = []
        with patch.object(app_module, "run_mcp_tool") as mcp:
            app_module.run_assistant_tool("u", "delete_note", {"note_id": "n1"}, actions)
        mcp.assert_not_called()
        self.assertEqual(actions[0]["type"], "delete_note")

    def test_locked_note_cannot_be_changed_or_deleted(self):
        for name in ("update_note", "move_note", "delete_note"):
            with patch.object(app_module, "run_mcp_tool") as mcp, self.assertRaises(app_module.McpToolError):
                app_module.run_assistant_tool("u", name, {"note_id": "n4", "title": "x"}, [])
            mcp.assert_not_called()

    def test_list_notes_never_includes_locked_content(self):
        with patch.object(app_module, "fetch_all_notes_for_uid", return_value=[]) as fetch:
            app_module.run_assistant_tool("u", "list_notes", {}, [])
        self.assertEqual(fetch.call_args.kwargs.get("include_locked"), False)

    def test_unknown_tool_is_rejected(self):
        with self.assertRaises(app_module.McpToolError):
            app_module.run_assistant_tool("u", "drop_everything", {}, [])

    def test_missing_note_is_reported(self):
        with self.assertRaises(app_module.McpToolError):
            app_module.run_assistant_tool("u", "open_note", {"note_id": "nope"}, [])


class RunAssistantTests(unittest.TestCase):
    def test_tool_result_is_fed_back_and_reply_returned(self):
        client = _FakeClient([
            _call_response("create_note", {"title": "逆質問"}),
            _text_response("作りました。"),
        ])
        with patch.object(app_module, "run_mcp_tool", return_value=json.dumps({"id": "x"})) as mcp:
            result = app_module.run_assistant("u", "逆質問を作って", [], None, client=client)
        mcp.assert_called_once()
        self.assertEqual(result["reply"], "作りました。")
        self.assertEqual(result["actions"], [{"type": "reload"}])
        # 2回目の呼び出しには道具の結果が入っている
        last = client.seen[1][-1]
        self.assertEqual(last.parts[0].function_response.name, "create_note")

    def test_stops_after_max_steps(self):
        client = _FakeClient([_call_response("list_todos", {}) for _ in range(app_module._ASSISTANT_MAX_STEPS)])
        with patch.object(app_module, "run_mcp_tool", return_value="{}"):
            result = app_module.run_assistant("u", "Todo", [], None, client=client)
        self.assertIn("手順が多すぎて", result["reply"])

    def test_history_is_trimmed_and_roles_mapped(self):
        history = [{"role": "assistant" if i % 2 else "user", "text": f"m{i}"} for i in range(30)]
        contents = app_module._assistant_history_contents(history)
        self.assertEqual(len(contents), app_module._ASSISTANT_MAX_HISTORY)
        self.assertEqual({c.role for c in contents}, {"user", "model"})


class AssistantEndpointTests(unittest.TestCase):
    def setUp(self):
        self.client = app_module.app.test_client()

    def test_requires_login(self):
        res = self.client.post("/api/v1/assistant", json={"message": "開いて"})
        self.assertEqual(res.status_code, 401)

    def test_daily_limit(self):
        with patch.object(app_module, "verify_firebase_id_token", return_value=("u", None)), \
             patch.object(app_module, "consume_assistant_quota", side_effect=app_module.AssistantLimitError()), \
             patch.object(app_module, "run_assistant") as run:
            res = self.client.post("/api/v1/assistant", json={"message": "開いて"})
        self.assertEqual(res.status_code, 429)
        run.assert_not_called()

    def test_ok(self):
        with patch.object(app_module, "verify_firebase_id_token", return_value=("u", None)), \
             patch.object(app_module, "consume_assistant_quota", return_value=49), \
             patch.object(app_module, "run_assistant", return_value={"reply": "開きました。", "actions": []}):
            res = self.client.post("/api/v1/assistant", json={"message": "開いて"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["remaining"], 49)

    def test_empty_message(self):
        with patch.object(app_module, "verify_firebase_id_token", return_value=("u", None)):
            res = self.client.post("/api/v1/assistant", json={"message": "  "})
        self.assertEqual(res.status_code, 400)


if __name__ == "__main__":
    unittest.main()
