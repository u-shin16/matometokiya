"""まとめときやに新しいメモを、書き込み専用APIで作成する。"""

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


class CreateError(RuntimeError):
    """メモを作成できなかった場合の利用者向けエラー。"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="まとめときやに新しいメモを作成します。"
    )
    parser.add_argument("title", help="メモのタイトル（120文字まで）")
    parser.add_argument("--content", default="", help="メモの本文")
    parser.add_argument("--parent-id", default=None, help="親メモのID（省略時はルート直下）")
    parser.add_argument(
        "--api-url",
        default=os.getenv(API_URL_ENV, "").strip(),
        help=f"読み取り用Todo APIのURL(既定: 環境変数 {API_URL_ENV})。ここからメモ作成用URLを組み立てます。",
    )
    return parser.parse_args()


def _notes_api_url(todo_api_url: str) -> str:
    if not todo_api_url:
        raise CreateError(f"{API_URL_ENV} または --api-url を指定してください。")

    parsed = urllib.parse.urlsplit(todo_api_url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise CreateError("API URLはhttpまたはhttpsの完全なURLで指定してください。")
    if parsed.username or parsed.password:
        raise CreateError("API URLへユーザー名やパスワードを埋め込まないでください。")
    if parsed.scheme != "https" and parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise CreateError("ローカルホスト以外のAPI URLにはhttpsを使用してください。")

    base_path = parsed.path.rstrip("/")
    if not base_path.endswith("/todos"):
        raise CreateError(f"{API_URL_ENV} は .../api/v1/todos の形式で指定してください。")

    notes_path = base_path[: -len("/todos")] + "/notes"
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


def create_note(
    api_url: str, token: str, title: str, content: str, parent_id: str | None
) -> dict[str, Any]:
    if not token:
        raise CreateError(f"環境変数 {WRITE_TOKEN_ENV} を設定してください。")

    url = _notes_api_url(api_url)
    body = json.dumps({"title": title, "content": content, "parent_id": parent_id}).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "matometokiya-note-creator/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            response_body = response.read(MAX_RESPONSE_BYTES + 1)
    except urllib.error.HTTPError as error:
        raise CreateError(f"メモ作成APIエラー: {_read_error_message(error)}") from error
    except urllib.error.URLError as error:
        raise CreateError(f"メモ作成APIへ接続できません: {error.reason}") from error

    if len(response_body) > MAX_RESPONSE_BYTES:
        raise CreateError("メモ作成APIの応答サイズが上限を超えました。")
    try:
        return json.loads(response_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise CreateError("メモ作成APIから不正なJSON応答を受信しました。") from error


def main() -> int:
    args = parse_args()
    try:
        result = create_note(
            args.api_url,
            os.getenv(WRITE_TOKEN_ENV, "").strip(),
            args.title,
            args.content,
            args.parent_id,
        )
    except CreateError as error:
        print(f"エラー: {error}", file=sys.stderr)
        return 1

    print(f"メモを作成しました。ID: {result.get('id')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
