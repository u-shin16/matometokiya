from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from scripts import connect_matome


class ConnectMatomeTests(unittest.TestCase):
    def test_rejects_non_numeric_code(self):
        with self.assertRaises(connect_matome.ConnectError):
            connect_matome.exchange_code(connect_matome.EXCHANGE_URL, "abcdefgh")

    def test_rejects_wrong_length_code(self):
        with self.assertRaises(connect_matome.ConnectError):
            connect_matome.exchange_code(connect_matome.EXCHANGE_URL, "123")

    def test_write_env_creates_new_file(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            env_path = Path(temporary_directory) / ".env"
            connect_matome.write_env(
                env_path, {"read_token": "r-token", "write_token": "w-token"}
            )
            content = env_path.read_text(encoding="utf-8")

        self.assertIn("MATOME_TODO_API_URL=https://matome.webtool-labs.com/api/v1/todos", content)
        self.assertIn("MATOME_TODO_API_TOKEN=r-token", content)
        self.assertIn("MATOME_TODO_API_WRITE_TOKEN=w-token", content)

    def test_write_env_preserves_other_lines_and_replaces_managed_keys(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            env_path = Path(temporary_directory) / ".env"
            env_path.write_text(
                "GEMINI_API_KEY=abc\n"
                "MATOME_TODO_API_TOKEN=old-token\n"
                "MATOME_TODO_API_URL=https://old.example/\n",
                encoding="utf-8",
            )

            connect_matome.write_env(
                env_path, {"read_token": "new-r", "write_token": "new-w"}
            )
            content = env_path.read_text(encoding="utf-8")

        self.assertIn("GEMINI_API_KEY=abc", content)
        self.assertNotIn("old-token", content)
        self.assertNotIn("https://old.example/", content)
        self.assertIn("MATOME_TODO_API_TOKEN=new-r", content)
        self.assertEqual(content.count("MATOME_TODO_API_TOKEN="), 1)


if __name__ == "__main__":
    unittest.main()
