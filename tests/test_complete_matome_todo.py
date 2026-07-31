from __future__ import annotations

import unittest

from scripts import complete_matome_todo


class CompleteMatomeTodoTests(unittest.TestCase):
    def test_requires_https_for_remote_api(self):
        with self.assertRaises(complete_matome_todo.CompleteError):
            complete_matome_todo._validated_complete_url(
                "http://matome.webtool-labs.com/api/v1/todos",
                "todo-1",
            )

    def test_builds_complete_url_from_todos_url(self):
        url = complete_matome_todo._validated_complete_url(
            "https://matome.webtool-labs.com/api/v1/todos",
            "todo-1",
        )
        self.assertEqual(
            url, "https://matome.webtool-labs.com/api/v1/todos/todo-1/complete"
        )

    def test_encodes_todo_id_in_url(self):
        url = complete_matome_todo._validated_complete_url(
            "https://matome.webtool-labs.com/api/v1/todos",
            "todo/with slash",
        )
        self.assertIn("todo%2Fwith%20slash/complete", url)

    def test_rejects_url_not_ending_in_todos(self):
        with self.assertRaises(complete_matome_todo.CompleteError):
            complete_matome_todo._validated_complete_url(
                "https://matome.webtool-labs.com/api/v1/other",
                "todo-1",
            )

    def test_requires_todo_id(self):
        with self.assertRaises(complete_matome_todo.CompleteError):
            complete_matome_todo._validated_complete_url(
                "https://matome.webtool-labs.com/api/v1/todos",
                "",
            )

    def test_requires_token(self):
        with self.assertRaises(complete_matome_todo.CompleteError):
            complete_matome_todo.complete_todo(
                "https://matome.webtool-labs.com/api/v1/todos",
                "",
                "todo-1",
            )


if __name__ == "__main__":
    unittest.main()
