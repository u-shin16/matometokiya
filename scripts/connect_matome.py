"""まとめときやの「Claude連携」画面で発行された短いコードを使って、
このスクリプトと同じディレクトリの .env にAPIトークンを自動で書き込む。

コピペで長いトークンを扱う場面をなくすためのスクリプト。
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

EXCHANGE_URL = "https://matome.webtool-labs.com/api/v1/claude-connect/exchange"
MAX_RESPONSE_BYTES = 1 * 1024 * 1024
ENV_KEYS = ("MATOME_TODO_API_URL", "MATOME_TODO_API_TOKEN", "MATOME_TODO_API_WRITE_TOKEN")
TODO_API_URL = "https://matome.webtool-labs.com/api/v1/todos"


class ConnectError(RuntimeError):
    """連携に失敗した場合の利用者向けエラー。"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="まとめときやの連携コードを使って、このディレクトリの.envにトークンを設定します。"
    )
    parser.add_argument("code", help="まとめときやの「Claude連携」画面に表示された8桁のコード")
    parser.add_argument(
        "--exchange-url",
        default=EXCHANGE_URL,
        help="コード引き換えAPIのURL（通常は変更不要）",
    )
    return parser.parse_args()


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


def exchange_code(exchange_url: str, code: str) -> dict[str, str]:
    if not code.isdigit() or len(code) != 8:
        raise ConnectError("コードは8桁の数字で指定してください。")

    body = json.dumps({"code": code}).encode("utf-8")
    request = urllib.request.Request(
        exchange_url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "matometokiya-todo-connector/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            payload_bytes = response.read(MAX_RESPONSE_BYTES + 1)
    except urllib.error.HTTPError as error:
        raise ConnectError(f"連携に失敗しました: {_read_error_message(error)}") from error
    except urllib.error.URLError as error:
        raise ConnectError(f"連携APIへ接続できません: {error.reason}") from error

    if len(payload_bytes) > MAX_RESPONSE_BYTES:
        raise ConnectError("連携APIの応答サイズが上限を超えました。")
    try:
        payload = json.loads(payload_bytes.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ConnectError("連携APIから不正なJSON応答を受信しました。") from error

    read_token = payload.get("read_token")
    write_token = payload.get("write_token")
    if not isinstance(read_token, str) or not isinstance(write_token, str) or not read_token or not write_token:
        raise ConnectError("連携APIの応答にトークンが含まれていません。")

    return {"read_token": read_token, "write_token": write_token}


def _existing_lines_without_managed_keys(env_path: Path) -> list[str]:
    if not env_path.exists():
        return []
    pattern = re.compile(r"^\s*(" + "|".join(ENV_KEYS) + r")\s*=")
    lines = env_path.read_text(encoding="utf-8").splitlines()
    return [line for line in lines if not pattern.match(line)]


def write_env(env_path: Path, tokens: dict[str, str]) -> None:
    lines = _existing_lines_without_managed_keys(env_path)
    if lines and lines[-1].strip():
        lines.append("")
    lines.append("# scripts/connect_matome.py が自動生成（このセクションは丸ごと上書きされます）")
    lines.append(f"MATOME_TODO_API_URL={TODO_API_URL}")
    lines.append(f"MATOME_TODO_API_TOKEN={tokens['read_token']}")
    lines.append(f"MATOME_TODO_API_WRITE_TOKEN={tokens['write_token']}")
    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    try:
        tokens = exchange_code(args.exchange_url, args.code)
    except ConnectError as error:
        print(f"エラー: {error}", file=sys.stderr)
        return 1

    env_path = Path(__file__).resolve().parent.parent / ".env"
    write_env(env_path, tokens)

    print(f"連携が完了しました。{env_path} にトークンを保存しました。")
    print("これで fetch_matome_todos.py / complete_matome_todo.py が使えます。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
