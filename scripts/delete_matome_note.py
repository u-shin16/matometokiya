"""まとめときやの既存メモ（と子孫メモ）を、書き込み専用APIで削除する。
アプリのゴミ箱と同じソフトデリートで、アプリ画面から復元できる。"""

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
# 既にシェルでexport済みの環境変数は上書きしない(override=False が既定)。
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

API_URL_ENV = "MATOME_TODO_API_URL"
WRITE_TOKEN_ENV = "MATOME_TODO_API_WRITE_TOKEN"
MAX_RESPONSE_BYTES = 5 * 1024 * 1024


class DeleteError(RuntimeError):
    """メモを削除できなかった場合の利用者向けエラー。"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="まとめときやの既存メモ（と子孫メモ）を削除します（ゴミ箱に移動）。"
    )
    parser.add_argument("note_id", help="削除するメモのID")
    parser.add_argument("--yes", action="store_true", help="確認プロンプトをスキップする")
    parser.add_argument(
        "--api-url",
        default=os.getenv(API_URL_ENV, "").strip(),
        help=f"読み取り用Todo APIのURL(既定: 環境変数 {API_URL_ENV})。ここから削除用URLを組み立てます。",
    )
    return parser.parse_args()


def _note_delete_url(todo_api_url: str, note_id: str) -> str:
    if not todo_api_url:
        raise DeleteError(f"{API_URL_ENV} または --api-url を指定してください。")
    if not note_id:
        raise DeleteError("note_idを指定してください。")

    parsed = urllib.parse.urlsplit(todo_api_url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise DeleteError("API URLはhttpまたはhttpsの完全なURLで指定してください。")
    if parsed.username or parsed.password:
        raise DeleteError("API URLへユーザー名やパスワードを埋め込まないでください。")
    if parsed.scheme != "https" and parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise DeleteError("ローカルホスト以外のAPI URLにはhttpsを使用してください。")

    base_path = parsed.path.rstrip("/")
    if not base_path.endswith("/todos"):
        raise DeleteError(f"{API_URL_ENV} は .../api/v1/todos の形式で指定してください。")

    note_path = base_path[: -len("/todos")] + f"/notes/{urllib.parse.quote(note_id, safe='')}"
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, note_path, "", ""))


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


def delete_note(api_url: str, token: str, note_id: str) -> dict[str, Any]:
    if not token:
        raise DeleteError(f"環境変数 {WRITE_TOKEN_ENV} を設定してください。")

    url = _note_delete_url(api_url, note_id)
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
            "User-Agent": "matometokiya-note-deleter/1.0",
        },
        method="DELETE",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            response_body = response.read(MAX_RESPONSE_BYTES + 1)
    except urllib.error.HTTPError as error:
        raise DeleteError(f"メモ削除APIエラー: {_read_error_message(error)}") from error
    except urllib.error.URLError as error:
        raise DeleteError(f"メモ削除APIへ接続できません: {error.reason}") from error

    if len(response_body) > MAX_RESPONSE_BYTES:
        raise DeleteError("メモ削除APIの応答サイズが上限を超えました。")
    try:
        return json.loads(response_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise DeleteError("メモ削除APIから不正なJSON応答を受信しました。") from error


def main() -> int:
    args = parse_args()
    if not args.yes:
        answer = input(f"メモ {args.note_id} とその子孫メモをゴミ箱に移動します。よろしいですか？ [y/N]: ")
        if answer.strip().lower() != "y":
            print("キャンセルしました。")
            return 1

    try:
        result = delete_note(
            args.api_url,
            os.getenv(WRITE_TOKEN_ENV, "").strip(),
            args.note_id,
        )
    except DeleteError as error:
        print(f"エラー: {error}", file=sys.stderr)
        return 1

    print(f"メモ {result.get('id', args.note_id)} をゴミ箱に移動しました。アプリ画面から復元できます。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
