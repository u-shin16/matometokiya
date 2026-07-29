"""
レガシーな data/notes.json・data/templates.json・data/media/*（Flask + 単一JSONファイル
時代のデータ）を、Firestore（users/{uid}/notes・users/{uid}/templates）と
Firebase Storage（users/{uid}/media/）へ移行する、ローカル専用・一回限りのスクリプト。

事前準備:
  1. このアプリで移行先アカウントを登録し、メール確認まで済ませて uid を控える
     （Firebaseコンソール > Authentication > Users で確認できる）
  2. プロジェクトルートに serviceAccountKey.json を配置する
  3. 本番VPSの data/notes.json・data/templates.json・data/media/* を、
     このリポジトリの data/ 以下の同名パスにコピーする
     （コピーするだけで、VPS側のファイルは削除しない）

実行:
  pip install -r requirements.txt
  python scripts/migrate_to_firestore.py --uid <uid> --dry-run
  python scripts/migrate_to_firestore.py --uid <uid>
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import sys
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import quote

BASE_DIR = Path(__file__).resolve().parent.parent

# script.js の ensureOfficialTemplates が初回ログイン時に削除する旧公式テンプレートID。
# 移行データに含まれていても書き込まず、書き込み直後に削除される無駄を避ける。
RETIRED_OFFICIAL_TEMPLATE_IDS = {"official-todo", "official-diary"}

MEDIA_REF_RE = re.compile(r"/media/([^\"'\s)>]+)")


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="レガシーJSON/メディアデータをFirestore/Storageへ移行する"
    )
    parser.add_argument("--uid", required=True, help="移行先のFirebase Auth uid")
    parser.add_argument("--notes-file", default="data/notes.json")
    parser.add_argument("--templates-file", default="data/templates.json")
    parser.add_argument("--media-dir", default="data/media")
    parser.add_argument("--service-account", default="serviceAccountKey.json")
    parser.add_argument(
        "--dry-run", action="store_true",
        help="書き込みを行わず、件数・メディア解決状況のみ表示する",
    )
    return parser.parse_args()


def media_refs_in(content: str) -> set[str]:
    return set(MEDIA_REF_RE.findall(content or ""))


def collect_referenced_filenames(
    notes: list[dict[str, Any]], templates: list[dict[str, Any]]
) -> set[str]:
    refs: set[str] = set()
    for note in notes:
        refs |= media_refs_in(note.get("content", ""))
        for item in note.get("media", []):
            if item.get("filename"):
                refs.add(item["filename"])

    def walk(node: dict[str, Any]) -> None:
        refs.update(media_refs_in(node.get("content", "")))
        for child in node.get("children", []):
            walk(child)

    for template in templates:
        tree = template.get("tree")
        if tree:
            walk(tree)

    return refs


def rewrite_content(content: str, url_map: dict[str, str]) -> str:
    if not content:
        return content
    return MEDIA_REF_RE.sub(lambda m: url_map.get(m.group(1), m.group(0)), content)


def rewrite_template_tree(node: dict[str, Any], url_map: dict[str, str]) -> None:
    node["content"] = rewrite_content(node.get("content", ""), url_map)
    for child in node.get("children", []):
        rewrite_template_tree(child, url_map)


def assign_orders(notes: list[dict[str, Any]]) -> None:
    siblings: dict[Any, list[dict[str, Any]]] = {}
    for note in notes:
        siblings.setdefault(note.get("parent_id"), []).append(note)
    for group in siblings.values():
        for i, note in enumerate(group):
            note["order"] = (i + 1) * 1000.0


def chunked(items: list[Any], size: int):
    for i in range(0, len(items), size):
        yield items[i : i + size]


def main() -> None:
    args = parse_args()

    notes_file     = (BASE_DIR / args.notes_file).resolve()
    templates_file = (BASE_DIR / args.templates_file).resolve()
    media_dir      = (BASE_DIR / args.media_dir).resolve()

    if not notes_file.exists():
        print(f"{notes_file} が見つかりません。")
        print("本番VPS（musubimemo.webtool-labs.com）の data/notes.json・data/templates.json・")
        print(f"data/media/* を {BASE_DIR / 'data'} 以下の同名パスにコピーしてから再実行してください。")
        print("（コピーするだけで、VPS側のファイルは削除しないでください）")
        sys.exit(1)

    notes_data: dict[str, Any] = json.loads(notes_file.read_text(encoding="utf-8"))
    notes: list[dict[str, Any]] = notes_data.get("notes", [])

    templates: list[dict[str, Any]] = []
    if templates_file.exists():
        templates_data: dict[str, Any] = json.loads(templates_file.read_text(encoding="utf-8"))
        templates = [
            t for t in templates_data.get("templates", [])
            if t.get("id") not in RETIRED_OFFICIAL_TEMPLATE_IDS
        ]

    referenced = collect_referenced_filenames(notes, templates)
    found      = sorted(name for name in referenced if (media_dir / name).is_file())
    missing    = sorted(referenced - set(found))

    print(f"ノート: {len(notes)}件")
    print(f"テンプレート: {len(templates)}件")
    print(f"メディア参照: {len(referenced)}件中 {len(found)}件を {media_dir} 内で検出")
    if missing:
        print("見つからないメディア（参照は元のまま残します）:")
        for name in missing:
            print(f"  - {name}")

    assign_orders(notes)

    if args.dry_run:
        print("\n--dry-run のため、Firestore/Storageへの書き込みは行いません。")
        return

    service_account_path = (BASE_DIR / args.service_account).resolve()
    if not service_account_path.exists():
        print(f"{service_account_path} が見つかりません。")
        print("Firebaseコンソールでサービスアカウント鍵を生成し、")
        print("プロジェクトルートに serviceAccountKey.json として配置してください。")
        sys.exit(1)

    from dotenv import load_dotenv

    load_dotenv(BASE_DIR / ".env")
    bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET")
    if not bucket_name:
        print(".env に FIREBASE_STORAGE_BUCKET が設定されていません。")
        sys.exit(1)

    import firebase_admin
    from firebase_admin import credentials, firestore, storage

    cred = credentials.Certificate(str(service_account_path))
    firebase_admin.initialize_app(cred, {"storageBucket": bucket_name})

    db     = firestore.client()
    bucket = storage.bucket()

    media_map: dict[str, dict[str, Any]] = {}
    for name in found:
        src      = media_dir / name
        ext      = (src.suffix.lstrip(".") or "bin").lower()
        media_id = uuid.uuid4().hex[:12]
        storage_path = f"users/{args.uid}/media/{media_id}.{ext}"
        mime_type    = mimetypes.guess_type(name)[0] or "application/octet-stream"

        token = str(uuid.uuid4())
        blob  = bucket.blob(storage_path)
        blob.metadata = {"firebaseStorageDownloadTokens": token}
        blob.upload_from_filename(str(src), content_type=mime_type)

        download_url = (
            f"https://firebasestorage.googleapis.com/v0/b/{bucket.name}"
            f"/o/{quote(storage_path, safe='')}?alt=media&token={token}"
        )
        media_map[name] = {
            "id":           media_id,
            "storagePath":  storage_path,
            "downloadURL":  download_url,
            "mime_type":    mime_type,
        }
        print(f"  アップロード: {name} -> {storage_path}")

    url_map = {name: info["downloadURL"] for name, info in media_map.items()}

    for note in notes:
        note["content"] = rewrite_content(note.get("content", ""), url_map)

        new_media = []
        for item in note.get("media", []):
            info = media_map.get(item.get("filename"))
            if not info:
                print(
                    f"  警告: メモ「{note.get('title', '?')}」のメディア "
                    f"{item.get('filename')} が見つからないため除外します。"
                )
                continue
            new_media.append({
                "id":            info["id"],
                "filename":      info["storagePath"],
                "original_name": item.get("original_name", item.get("filename")),
                "mime_type":     item.get("mime_type") or info["mime_type"],
                "created_at":    item.get("created_at", now_iso()),
                "storagePath":   info["storagePath"],
                "downloadURL":   info["downloadURL"],
            })
        note["media"] = new_media

        note.setdefault("parent_id", None)
        note.setdefault("source_file", None)
        note.setdefault("pinned", False)
        note.setdefault("checked", False)
        note.setdefault("checked_at", None)

    for template in templates:
        tree = template.get("tree")
        if tree:
            rewrite_template_tree(tree, url_map)
        template.setdefault("official", False)

    notes_ref     = db.collection("users").document(args.uid).collection("notes")
    templates_ref = db.collection("users").document(args.uid).collection("templates")

    for chunk in chunked(notes, 450):
        batch = db.batch()
        for note in chunk:
            batch.set(notes_ref.document(note["id"]), note)
        batch.commit()
    print(f"\nFirestoreへ {len(notes)}件のノートを書き込みました。")

    for chunk in chunked(templates, 450):
        batch = db.batch()
        for template in chunk:
            batch.set(templates_ref.document(template["id"]), template)
        batch.commit()
    print(f"Firestoreへ {len(templates)}件のテンプレートを書き込みました。")

    print("\n完了しました。元の data/notes.json・data/templates.json・data/media/* はそのまま残しています。")


if __name__ == "__main__":
    main()
