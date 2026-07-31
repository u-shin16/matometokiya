from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from scripts import fetch_matome_todos


class FetchMatomeTodosTests(unittest.TestCase):
    TODOS = [
        {
            "id": "todo-1",
            "content": "ログイン画面を改善する",
            "priority": None,
            "project": "返事きたで",
        },
        {
            "id": "todo-2",
            "content": "APIテストを追加する",
            "priority": "高",
            "project": "返事きたで",
        },
    ]

    def test_creates_docs_file_and_writes_requested_format(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            output_path, added, skipped = fetch_matome_todos.append_todos(
                root, self.TODOS
            )
            content = output_path.read_text(encoding="utf-8")

        self.assertEqual(added, 2)
        self.assertEqual(skipped, 0)
        self.assertEqual(output_path.name, "TODO.txt")
        self.assertEqual(output_path.parent.name, "docs")
        self.assertEqual(content.count("[まとめときや Todo]"), 2)
        self.assertIn("- ID: todo-1", content)
        self.assertIn("- 内容: ログイン画面を改善する", content)
        self.assertIn("- 優先度: 未設定", content)
        self.assertIn("- 優先度: 高", content)
        self.assertIn("- 対象プロジェクト: 返事きたで", content)
        self.assertRegex(content, r"- 取得日時: \d{4}-\d{2}-\d{2} \d{2}:\d{2}")

    def test_includes_note_content_and_children(self):
        todos = [
            {
                "id": "todo-1",
                "content": "最初の画面",
                "priority": None,
                "project": "制作",
                "note_content": "起動直後に表示する画面についてのメモ",
                "children": [
                    {"title": "配色を見直す", "content": "アクセントカラーを変更"},
                    {"title": "ボタンを大きくする", "content": ""},
                ],
            }
        ]
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            output_path, _, _ = fetch_matome_todos.append_todos(root, todos)
            content = output_path.read_text(encoding="utf-8")

        self.assertIn("- メモ本文: 起動直後に表示する画面についてのメモ", content)
        self.assertIn("- 子メモ:", content)
        self.assertIn("- 配色を見直す: アクセントカラーを変更", content)
        self.assertIn("- ボタンを大きくする", content)

    def test_omits_note_content_and_children_when_empty(self):
        todos = [{"id": "todo-1", "content": "無題", "priority": None, "project": None}]
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            output_path, _, _ = fetch_matome_todos.append_todos(root, todos)
            content = output_path.read_text(encoding="utf-8")

        self.assertNotIn("メモ本文", content)
        self.assertNotIn("子メモ", content)

    def test_does_not_append_existing_ids_twice(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            output_path, first_added, _ = fetch_matome_todos.append_todos(
                root, self.TODOS
            )
            _, second_added, skipped = fetch_matome_todos.append_todos(
                root, self.TODOS
            )
            content = output_path.read_text(encoding="utf-8")

        self.assertEqual(first_added, 2)
        self.assertEqual(second_added, 0)
        self.assertEqual(skipped, 2)
        self.assertEqual(content.count("- ID: todo-1"), 1)
        self.assertEqual(content.count("- ID: todo-2"), 1)

    def test_refuses_docs_symlink_outside_project(self):
        with (
            tempfile.TemporaryDirectory() as project_directory,
            tempfile.TemporaryDirectory() as outside_directory,
        ):
            root = Path(project_directory)
            (root / "docs").symlink_to(Path(outside_directory), target_is_directory=True)

            with self.assertRaises(OSError):
                fetch_matome_todos.append_todos(root, self.TODOS)

    def test_requires_https_for_remote_api(self):
        with self.assertRaises(fetch_matome_todos.FetchError):
            fetch_matome_todos._validated_api_url(
                "http://matome.webtool-labs.com/api/v1/todos",
                None,
            )

    def test_encodes_project_query(self):
        url = fetch_matome_todos._validated_api_url(
            "https://matome.webtool-labs.com/api/v1/todos",
            "返事きたで",
        )
        self.assertIn(
            "project=%E8%BF%94%E4%BA%8B%E3%81%8D%E3%81%9F%E3%81%A7",
            url,
        )


if __name__ == "__main__":
    unittest.main()
