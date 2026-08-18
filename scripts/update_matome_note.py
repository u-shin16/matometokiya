"""まとめときやの既存メモを、書き込み専用APIでtitle/content更新する。"""

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


class UpdateError(RuntimeError):
    """メモを更新できなかった場合の利用者向けエラー。"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="まとめときやの既存メモのtitle/contentを更新します。"
    )
    parser.add_argument("note_id", help="更新するメモのID")
    parser.add_argument("--title", default=None, help="新しいタイトル（省略時は変更しない）")
    parser.add_argument("--content", default=None, help="新しい本文（省略時は変更しない）")
    parser.add_argument(
        "--api-url",
        default=os.getenv(API_URL_ENV, "").strip(),
        help=f"読み取り用Todo APIのURL(既定: 環境変数 {API_URL_ENV})。ここから更新用URLを組み立てます。",
    )
    return parser.parse_args()


def _note_update_url(todo_api_url: str, note_id: str) -> str:
    if not todo_api_url:
        raise UpdateError(f"{API_URL_ENV} または --api-url を指定してください。")
    if not note_id:
        raise UpdateError("note_idを指定してください。")

    parsed = urllib.parse.urlsplit(todo_api_url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise UpdateError("API URLはhttpまたはhttpsの完全なURLで指定してください。")
    if parsed.username or parsed.password:
        raise UpdateError("API URLへユーザー名やパスワードを埋め込まないでください。")
    if parsed.scheme != "https" and parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise UpdateError("ローカルホスト以外のAPI URLにはhttpsを使用してください。")

    base_path = parsed.path.rstrip("/")
    if not base_path.endswith("/todos"):
        raise UpdateError(f"{API_URL_ENV} は .../api/v1/todos の形式で指定してください。")

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


def update_note(
    api_url: str, token: str, note_id: str, title: str | None, content: str | None
) -> dict[str, Any]:
    if not token:
        raise UpdateError(f"環境変数 {WRITE_TOKEN_ENV} を設定してください。")
    if title is None and content is None:
        raise UpdateError("--title または --content の少なくとも一方を指定してください。")

    payload: dict[str, Any] = {}
    if title is not None:
        payload["title"] = title
    if content is not None:
        payload["content"] = content

    url = _note_update_url(api_url, note_id)
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "matometokiya-note-updater/1.0",
        },
        method="PATCH",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            response_body = response.read(MAX_RESPONSE_BYTES + 1)
    except urllib.error.HTTPError as error:
        raise UpdateError(f"メモ更新APIエラー: {_read_error_message(error)}") from error
    except urllib.error.URLError as error:
        raise UpdateError(f"メモ更新APIへ接続できません: {error.reason}") from error

    if len(response_body) > MAX_RESPONSE_BYTES:
        raise UpdateError("メモ更新APIの応答サイズが上限を超えました。")
    try:
        return json.loads(response_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise UpdateError("メモ更新APIから不正なJSON応答を受信しました。") from error


def main() -> int:
    args = parse_args()
    try:
        result = update_note(
            args.api_url,
            os.getenv(WRITE_TOKEN_ENV, "").strip(),
            args.note_id,
            args.title,
            args.content,
        )
    except UpdateError as error:
        print(f"エラー: {error}", file=sys.stderr)
        return 1

    print(f"メモ {result.get('id', args.note_id)} を更新しました。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
