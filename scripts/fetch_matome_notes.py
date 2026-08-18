"""まとめときやの全メモを取得し、階層がわかる形で標準出力へ表示する。
Claude Codeがメモ全体を読み込んで要約するためのスクリプト。"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# 実行時のカレントディレクトリに関わらず、このリポジトリ直下の.envを読み込む。
# 既にシェルでexport済みの環境変数は上書きしない（override=False が既定）。
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

API_URL_ENV = "MATOME_TODO_API_URL"
API_TOKEN_ENV = "MATOME_TODO_API_TOKEN"
MAX_RESPONSE_BYTES = 5 * 1024 * 1024


class FetchError(RuntimeError):
    """APIからメモを取得できなかった場合の利用者向けエラー。"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="まとめときやの全メモを取得し、標準出力に表示します。"
    )
    parser.add_argument(
        "--api-url",
        default=os.getenv(API_URL_ENV, "").strip(),
        help=f"Todo APIのURL（既定: 環境変数 {API_URL_ENV}。末尾の/todosを/notesに置き換えて使用）",
    )
    return parser.parse_args()


def _notes_api_url(todo_api_url: str) -> str:
    if not todo_api_url:
        raise FetchError(f"{API_URL_ENV} または --api-url を指定してください。")

    parsed = urllib.parse.urlsplit(todo_api_url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise FetchError("API URLはhttpまたはhttpsの完全なURLで指定してください。")
    if parsed.username or parsed.password:
        raise FetchError("API URLへユーザー名やパスワードを埋め込まないでください。")
    if parsed.scheme != "https" and parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise FetchError("ローカルホスト以外のAPI URLにはhttpsを使用してください。")
    if not parsed.path.endswith("/todos"):
        raise FetchError(f"{API_URL_ENV} は /api/v1/todos を指すURLにしてください。")

    notes_path = parsed.path[: -len("/todos")] + "/notes"
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, notes_path, "", ""))


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


def fetch_notes(api_url: str, token: str) -> list[dict[str, Any]]:
    if not token:
        raise FetchError(f"環境変数 {API_TOKEN_ENV} を設定してください。")

    url = _notes_api_url(api_url)
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
            "User-Agent": "matometokiya-note-fetcher/1.0",
        },
        method="GET",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            body = response.read(MAX_RESPONSE_BYTES + 1)
    except urllib.error.HTTPError as error:
        raise FetchError(f"Notes APIエラー: {_read_error_message(error)}") from error
    except urllib.error.URLError as error:
        raise FetchError(f"Notes APIへ接続できません: {error.reason}") from error

    if len(body) > MAX_RESPONSE_BYTES:
        raise FetchError("Notes APIの応答サイズが上限を超えました。")
    try:
        payload = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise FetchError("Notes APIから不正なJSON応答を受信しました。") from error

    notes = payload.get("notes") if isinstance(payload, dict) else None
    if not isinstance(notes, list) or not all(isinstance(note, dict) for note in notes):
        raise FetchError("Notes APIの応答形式が正しくありません。")
    return notes


def _single_line(value: Any, fallback: str = "") -> str:
    text = " ".join(str(value or "").split())
    return text or fallback


def format_notes(notes: list[dict[str, Any]]) -> str:
    lines = []
    for note in notes:
        path = note.get("path")
        depth = len(path) if isinstance(path, list) else 0
        indent = "  " * depth
        title = _single_line(note.get("title"), "無題")
        checked = "✓ " if note.get("checked") else ""
        lines.append(f"{indent}- {checked}{title}")
        content = _single_line(note.get("content"))
        if content:
            lines.append(f"{indent}  {content}")
    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    try:
        notes = fetch_notes(args.api_url, os.getenv(API_TOKEN_ENV, "").strip())
    except FetchError as error:
        print(f"エラー: {error}", file=sys.stderr)
        return 1

    if not notes:
        print("メモがありません。")
        return 0

    print(f"全{len(notes)}件のメモ:")
    print(format_notes(notes))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
