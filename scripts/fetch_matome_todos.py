"""まとめときやの未完了Todoを、実行中プロジェクトの docs/TODO.txt へ追記する。"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# 実行時のカレントディレクトリに関わらず、このリポジトリ直下の.envを読み込む。
# 既にシェルでexport済みの環境変数は上書きしない（override=False が既定）。
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

API_URL_ENV = "MATOME_TODO_API_URL"
API_TOKEN_ENV = "MATOME_TODO_API_TOKEN"
MAX_RESPONSE_BYTES = 5 * 1024 * 1024
TODO_ID_PATTERN = re.compile(r"(?m)^- ID:\s*(.+?)\s*$")


class FetchError(RuntimeError):
    """APIからTodoを取得できなかった場合の利用者向けエラー。"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="まとめときやの未完了Todoを docs/TODO.txt へ重複なく追加します。"
    )
    parser.add_argument(
        "--project",
        help="最上位メモのタイトルと完全一致する対象プロジェクト名",
    )
    parser.add_argument(
        "--api-url",
        default=os.getenv(API_URL_ENV, "").strip(),
        help=f"Todo APIのURL（既定: 環境変数 {API_URL_ENV}）",
    )
    return parser.parse_args()


def _validated_api_url(api_url: str, project: str | None) -> str:
    if not api_url:
        raise FetchError(f"{API_URL_ENV} または --api-url を指定してください。")

    parsed = urllib.parse.urlsplit(api_url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise FetchError("API URLはhttpまたはhttpsの完全なURLで指定してください。")
    if parsed.username or parsed.password:
        raise FetchError("API URLへユーザー名やパスワードを埋め込まないでください。")
    if parsed.scheme != "https" and parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise FetchError("ローカルホスト以外のAPI URLにはhttpsを使用してください。")

    query = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
    if project:
        query.append(("project", project))
    return urllib.parse.urlunsplit(
        (parsed.scheme, parsed.netloc, parsed.path, urllib.parse.urlencode(query), "")
    )


def _read_error_message(error: urllib.error.HTTPError) -> str:
    try:
        body = error.read(MAX_RESPONSE_BYTES).decode("utf-8")
        payload = json.loads(body)
        message = payload.get("error")
        if isinstance(message, str) and message.strip():
            return message.strip()
    except (UnicodeDecodeError, json.JSONDecodeError, AttributeError):
        pass
    return f"HTTP {error.code}"


def fetch_todos(api_url: str, token: str, project: str | None = None) -> list[dict[str, Any]]:
    if not token:
        raise FetchError(f"環境変数 {API_TOKEN_ENV} を設定してください。")

    url = _validated_api_url(api_url, project)
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
            "User-Agent": "matometokiya-todo-fetcher/1.0",
        },
        method="GET",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            body = response.read(MAX_RESPONSE_BYTES + 1)
    except urllib.error.HTTPError as error:
        raise FetchError(f"Todo APIエラー: {_read_error_message(error)}") from error
    except urllib.error.URLError as error:
        raise FetchError(f"Todo APIへ接続できません: {error.reason}") from error

    if len(body) > MAX_RESPONSE_BYTES:
        raise FetchError("Todo APIの応答サイズが上限を超えました。")
    try:
        payload = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise FetchError("Todo APIから不正なJSON応答を受信しました。") from error

    todos = payload.get("todos") if isinstance(payload, dict) else None
    if not isinstance(todos, list) or not all(isinstance(todo, dict) for todo in todos):
        raise FetchError("Todo APIの応答形式が正しくありません。")
    return todos


def _single_line(value: Any, fallback: str = "未設定") -> str:
    text = " ".join(str(value or "").split())
    return text or fallback


def existing_todo_ids(output_path: Path) -> set[str]:
    if not output_path.exists():
        return set()
    content = output_path.read_text(encoding="utf-8")
    return {match.group(1).strip() for match in TODO_ID_PATTERN.finditer(content)}


def _format_children(children: Any) -> list[str]:
    if not isinstance(children, list):
        return []
    lines = ["- 子メモ:"]
    for child in children:
        if not isinstance(child, dict):
            continue
        title = _single_line(child.get("title"), "")
        body = _single_line(child.get("content"), "")
        if title and body:
            lines.append(f"  - {title}: {body}")
        elif title or body:
            lines.append(f"  - {title or body}")
    return lines if len(lines) > 1 else []


def _format_path(path: Any) -> str:
    if not isinstance(path, list):
        return ""
    titles = [_single_line(item, "") for item in path]
    titles = [title for title in titles if title]
    return " > ".join(titles)


def format_todo(todo: dict[str, Any], fetched_at: str) -> str:
    lines = [
        "[まとめときや Todo]",
        f"- ID: {_single_line(todo.get('id'), '不明')}",
        f"- 内容: {_single_line(todo.get('content'), '無題')}",
        f"- 優先度: {_single_line(todo.get('priority'))}",
        f"- 対象プロジェクト: {_single_line(todo.get('project'))}",
        f"- 取得日時: {fetched_at}",
    ]

    path = _format_path(todo.get("path"))
    if path:
        lines.append(f"- 経路: {path}")

    note_content = _single_line(todo.get("note_content"), "")
    if note_content:
        lines.append(f"- メモ本文: {note_content}")

    lines.extend(_format_children(todo.get("children")))

    return "\n".join(lines)


def append_todos(project_root: Path, todos: list[dict[str, Any]]) -> tuple[Path, int, int]:
    resolved_root = project_root.resolve()
    docs_path = resolved_root / "docs"
    docs_path.mkdir(parents=True, exist_ok=True)
    resolved_docs_path = docs_path.resolve()
    if not resolved_docs_path.is_relative_to(resolved_root):
        raise OSError("docsフォルダがプロジェクト外を指しているため書き込みを中止しました。")

    output_path = resolved_docs_path / "TODO.txt"
    if output_path.exists() and not output_path.resolve().is_relative_to(resolved_root):
        raise OSError("docs/TODO.txtがプロジェクト外を指しているため書き込みを中止しました。")
    output_path.touch(exist_ok=True)

    known_ids = existing_todo_ids(output_path)
    new_todos = []
    skipped = 0
    for todo in todos:
        todo_id = _single_line(todo.get("id"), "")
        if not todo_id or todo_id in known_ids:
            skipped += 1
            continue
        known_ids.add(todo_id)
        new_todos.append(todo)

    if not new_todos:
        return output_path, 0, skipped

    fetched_at = datetime.now().astimezone().strftime("%Y-%m-%d %H:%M")
    blocks = "\n\n".join(format_todo(todo, fetched_at) for todo in new_todos)
    existing_size = output_path.stat().st_size
    with output_path.open("a", encoding="utf-8", newline="\n") as output:
        if existing_size:
            output.write("\n\n")
        output.write(blocks)
        output.write("\n")
    return output_path, len(new_todos), skipped


def main() -> int:
    args = parse_args()
    try:
        todos = fetch_todos(
            args.api_url,
            os.getenv(API_TOKEN_ENV, "").strip(),
            args.project,
        )
        output_path, added, skipped = append_todos(Path.cwd(), todos)
    except (FetchError, OSError, UnicodeError) as error:
        print(f"エラー: {error}", file=sys.stderr)
        return 1

    print(f"{output_path} に {added}件追加しました。")
    if skipped:
        print(f"既存またはID不明のTodo {skipped}件は追加しませんでした。")
    if not todos:
        print("条件に一致する未完了Todoはありません。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
