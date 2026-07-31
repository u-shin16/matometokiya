"""まとめときやの指定Todoを、書き込み専用APIで完了（done=true）にする。"""

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
WRITE_TOKEN_ENV = "MATOME_TODO_API_WRITE_TOKEN"
MAX_RESPONSE_BYTES = 5 * 1024 * 1024


class CompleteError(RuntimeError):
    """Todoを完了にできなかった場合の利用者向けエラー。"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="まとめときやの指定Todo IDを完了（done=true）にします。"
    )
    parser.add_argument("todo_id", help="完了にするTodoのID（fetch_matome_todos.pyの出力のID欄）")
    parser.add_argument(
        "--api-url",
        default=os.getenv(API_URL_ENV, "").strip(),
        help=f"読み取り用Todo APIのURL（既定: 環境変数 {API_URL_ENV}）。ここから完了用URLを組み立てます。",
    )
    return parser.parse_args()


def _validated_complete_url(api_url: str, todo_id: str) -> str:
    if not api_url:
        raise CompleteError(f"{API_URL_ENV} または --api-url を指定してください。")
    if not todo_id:
        raise CompleteError("todo_idを指定してください。")

    parsed = urllib.parse.urlsplit(api_url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise CompleteError("API URLはhttpまたはhttpsの完全なURLで指定してください。")
    if parsed.username or parsed.password:
        raise CompleteError("API URLへユーザー名やパスワードを埋め込まないでください。")
    if parsed.scheme != "https" and parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise CompleteError("ローカルホスト以外のAPI URLにはhttpsを使用してください。")

    base_path = parsed.path.rstrip("/")
    if not base_path.endswith("/todos"):
        raise CompleteError(
            f"{API_URL_ENV} は .../api/v1/todos の形式で指定してください。"
        )

    complete_path = f"{base_path}/{urllib.parse.quote(todo_id, safe='')}/complete"
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, complete_path, "", ""))


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


def complete_todo(api_url: str, token: str, todo_id: str) -> dict[str, Any]:
    if not token:
        raise CompleteError(f"環境変数 {WRITE_TOKEN_ENV} を設定してください。")

    url = _validated_complete_url(api_url, todo_id)
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
            "User-Agent": "matometokiya-todo-completer/1.0",
            "Content-Length": "0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            body = response.read(MAX_RESPONSE_BYTES + 1)
    except urllib.error.HTTPError as error:
        raise CompleteError(f"Todo完了APIエラー: {_read_error_message(error)}") from error
    except urllib.error.URLError as error:
        raise CompleteError(f"Todo完了APIへ接続できません: {error.reason}") from error

    if len(body) > MAX_RESPONSE_BYTES:
        raise CompleteError("Todo完了APIの応答サイズが上限を超えました。")
    try:
        return json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise CompleteError("Todo完了APIから不正なJSON応答を受信しました。") from error


def main() -> int:
    args = parse_args()
    try:
        result = complete_todo(
            args.api_url,
            os.getenv(WRITE_TOKEN_ENV, "").strip(),
            args.todo_id,
        )
    except CompleteError as error:
        print(f"エラー: {error}", file=sys.stderr)
        return 1

    print(f"Todo {result.get('id', args.todo_id)} を完了にしました。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
