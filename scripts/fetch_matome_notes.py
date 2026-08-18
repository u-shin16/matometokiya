"""まとめときやの全メモを取得し、階層がわかる形で標準出力へ表示する。
Claude Codeがメモ全体を読み込んで要約するためのスクリプト。

鍵付きメモの本文は既定では除外される（タイトルのみ）。--include-lockedを付けると、
アプリ画面で鍵付きメモを開くときと同じアカウントのログインパスワードをその場で
入力してもらい、サーバー側で検証できた場合だけ本文も取得する。"""

from __future__ import annotations

import argparse
import getpass
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
# 既にシェルでexport済みの環境変数は上書きしない(override=False が既定)。
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
        help=f"Todo APIのURL(既定: 環境変数 {API_URL_ENV}。末尾の/todosを/notesまたは/notes/unlockに置き換えて使用)",
    )
    parser.add_argument(
        "--include-locked",
        action="store_true",
        help="鍵付きメモの本文も取得する（実行時にアカウントのログインパスワードの入力を求める）",
    )
    return parser.parse_args()


def _base_url(todo_api_url: str) -> tuple[str, str, str]:
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

    return parsed.scheme, parsed.netloc, parsed.path[: -len("/todos")]


def _notes_api_url(todo_api_url: str) -> str:
    scheme, netloc, base_path = _base_url(todo_api_url)
    return urllib.parse.urlunsplit((scheme, netloc, base_path + "/notes", "", ""))


def _notes_unlock_api_url(todo_api_url: str) -> str:
    scheme, netloc, base_path = _base_url(todo_api_url)
    return urllib.parse.urlunsplit((scheme, netloc, base_path + "/notes/unlock", "", ""))


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


def _request_notes(url: str, token: str, *, method: str, body: bytes | None = None) -> list[dict[str, Any]]:
    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {token}",
        "User-Agent": "matometokiya-note-fetcher/1.0",
    }
    if body is not None:
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            response_body = response.read(MAX_RESPONSE_BYTES + 1)
    except urllib.error.HTTPError as error:
        raise FetchError(f"Notes APIエラー: {_read_error_message(error)}") from error
    except urllib.error.URLError as error:
        raise FetchError(f"Notes APIへ接続できません: {error.reason}") from error

    if len(response_body) > MAX_RESPONSE_BYTES:
        raise FetchError("Notes APIの応答サイズが上限を超えました。")
    try:
        payload = json.loads(response_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise FetchError("Notes APIから不正なJSON応答を受信しました。") from error

    notes = payload.get("notes") if isinstance(payload, dict) else None
    if not isinstance(notes, list) or not all(isinstance(note, dict) for note in notes):
        raise FetchError("Notes APIの応答形式が正しくありません。")
    return notes


def fetch_notes(api_url: str, token: str) -> list[dict[str, Any]]:
    if not token:
        raise FetchError(f"環境変数 {API_TOKEN_ENV} を設定してください。")
    return _request_notes(_notes_api_url(api_url), token, method="GET")


def fetch_notes_with_locked(api_url: str, token: str, password: str) -> list[dict[str, Any]]:
    if not token:
        raise FetchError(f"環境変数 {API_TOKEN_ENV} を設定してください。")
    body = json.dumps({"password": password}).encode("utf-8")
    return _request_notes(_notes_unlock_api_url(api_url), token, method="POST", body=body)


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
        locked = "🔒 " if note.get("locked") else ""
        lines.append(f"{indent}- {checked}{locked}{title}")
        content = _single_line(note.get("content"))
        if content:
            lines.append(f"{indent}  {content}")
        elif note.get("locked"):
            lines.append(f"{indent}  (鍵付きのため本文は非表示。読ませたい場合はアプリ側で鍵を外すか --include-locked を使ってください)")
    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    token = os.getenv(API_TOKEN_ENV, "").strip()
    try:
        if args.include_locked:
            password = getpass.getpass("まとめときやのアカウントパスワード（鍵付きメモを開くのと同じもの）: ")
            notes = fetch_notes_with_locked(args.api_url, token, password)
        else:
            notes = fetch_notes(args.api_url, token)
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
