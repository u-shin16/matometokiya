# まとめときや

階層的にアイデアやプロジェクトを管理できる Flask 製メモ帳アプリです。

## 最上位メモ（複数作成対応）

このアプリでは **最上位メモを何個でも作成できます**。

- 左上の **＋ボタン** を押すと最上位メモが作成されます
- `parent_id: null` のメモが最上位メモになります
- 最上位メモの下に子メモを追加して、自由に階層管理できます

```
アイデア
├── アプリ案
└── 収益化案

開発プロジェクト
├── memo
└── alarm-app

勉強メモ
├── Python
└── Flask
```

## 主な機能

- **最上位メモを複数作成**（＋ボタン）
- メモを親子階層で管理
- メモ追加（ツリーの ＋ ボタン、または「メモを追加」ボタン）
- メモのチェック（上部ボタンまたは右クリックメニューから設定、一覧に大きな ✅ を表示）
- メモ削除（最上位メモも削除可能、子メモもまとめて削除）
- 最上位メモのピン留め（右クリックメニューから設定、常に一覧の上部へ表示）
- タイトル・本文検索
- AIメモ・AIマインドマップ生成
  - テーマの直接入力、または参照ファイルから生成
  - 対応ファイルは10MBまで（アップロード内容は保存しません）
- メモとマインドマップの双方向同期
  - 「マップ化」または「メモ化」で作成した組み合わせを自動同期
  - タイトル・本文・子要素の追加・並び順・削除を相互に反映
- 合言葉による共同編集
  - ホストが「ホストとして開始」を押すと4桁の数字の合言葉が自動生成され、それをゲストに伝えて同じ数字で参加してもらう
  - ホスト作成時は、開いている親メモ1件（配下のメモ・同期中のマインドマップを含む）だけを共同ルームへコピー。他の個人メモは共有されない
  - 変更はFirestoreのリアルタイム購読で他の参加者へ反映
  - 共同作業中はヘッダー右上に「共同作業中」ボタンが表示され、参加メンバーの確認・共同編集設定・退出をワンクリックで行える
- ドラッグ操作でメモ移動
  - メモとメモの間へドロップ → 同じ階層内で並び替え
  - 子メモをルート側の先頭/末尾ゾーンへドロップ → 同じ親メモ配下の子メモ同士で先頭/末尾へ移動
  - 別のメモへドロップ → そのメモの子へ移動
  - 右クリックの「同じ親の最上位へ移動」 → 同じ親メモ配下の先頭へ移動
  - 右クリックの「同じ親の最下位へ移動」 → 同じ親メモ配下の末尾へ移動
- ファイル読み込み
  - ドラッグ&ドロップ
  - ファイル選択
  - 選択中のメモがあれば子として追加、なければ最上位として追加
- テンプレート
  - 公式テンプレート（開発メモ）
  - 選択中のメモと子メモを保存
  - 保存済みテンプレートから新しい最上位メモを追加
- JSONエクスポート

## 対応ファイル

- `.txt`
- `.md`
- `.csv`
- `.json`
- `.pdf`
- `.docx`
- `.xlsx`
- `.png`
- `.jpg` / `.jpeg`
- `.webp`
- `.heic` / `.heif`

## 起動手順

```bash
cd memo
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python app.py
```

ブラウザで以下を開きます。

```text
http://127.0.0.1:5001
```

## Firebase設定

このアプリはFirebase Authentication（メール/パスワード、およびGoogleログイン）でログインし、メモ・テンプレートはFirestore、添付メディアはFirebase Storageへブラウザから直接保存します（バックエンドAPIは経由しません）。アカウントごと（`uid`単位）にデータが分離されます。
メール/パスワードで新規登録した場合は確認メールが送信され、メール認証が完了するまでアプリ画面は表示されません（GoogleログインはGoogle側でメール確認済みのため、この待ち時間なしですぐ使えます）。

既にメール/パスワードで登録済みのメールアドレスで「Googleで続ける」を押した場合は、`auth/account-exists-with-different-credential` を検知して自動的に連携ダイアログを出します。既存のパスワードを入力すると、新しい別アカウント（空のメモ）にはならず、同じ`uid`・同じメモのままGoogleログインが使えるようになります。

1. [Firebaseコンソール](https://console.firebase.google.com/)で対象プロジェクトを開く
2. 「プロジェクトの設定」→「全般」→「マイアプリ」で新しいWebアプリを登録する
3. 表示される `firebaseConfig`（apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId）を [`static/js/firebase-config.js`](static/js/firebase-config.js) の `firebaseConfig` に貼り付ける
4. 「Authentication」→「Sign-in method」で「メール/パスワード」と「Google」の両プロバイダを有効にする
   - 「Google」有効化時にサポートメールの選択を求められるので、管理用のメールアドレスを選ぶ
5. 「Authentication」→「Settings」→「Authorized domains」に公開ドメイン（例: `matome.webtool-labs.com`）を追加する
   - 確認メール再送時に `auth/unauthorized-continue-uri` が出る場合、この設定が不足しています
   - Googleログインボタンを押しても反応がない・`auth/unauthorized-domain` が出る場合も、まずここを疑う（`localhost` は自動で許可される）
6. 「Authentication」→「Templates」→「メールアドレスの確認」で、アクションURLを `https://<公開ドメイン>/auth/action` に設定する
7. 「Firestore Database」を開き、本番モードでデータベースを作成する。「ルール」タブで、このリポジトリの [`firestore.rules`](firestore.rules) の内容を貼り付けてPublishする
8. 「Storage」を開き、Storageを有効化する（**プロジェクトがSparkプランの場合、Blazeプラン（従量課金）へのアップグレードを求められることがあります**）。「Rules」タブで、このリポジトリの [`storage.rules`](storage.rules) の内容を貼り付けてPublishする

`static/js/firebase-config.js` の値（apiKeyを含む）はブラウザに公開される前提のFirebase Web設定であり、秘密情報ではないためそのままコミットして構いません。`apiKey` が空の場合、ログイン画面に「Firebaseが設定されていません」と表示されます。

`.env`（`.env.example` を参照）の `FIREBASE_STORAGE_BUCKET` は、後述の既存データ移行スクリプト（`scripts/migrate_to_firestore.py`）専用です。

### メール認証テンプレート

Firebaseコンソールの「メールアドレスの確認」テンプレートは、以下の文面にするとアプリ内の認証待ち画面と揃います。

件名:

```text
まとめときや のメールアドレスの確認
```

本文:

```text
お客様

メールアドレスを確認するには、次のリンクをクリックしてください。

%LINK%

このアドレスの確認を依頼していない場合は、このメールを無視してください。

よろしくお願いいたします。

まとめときや チーム
```

リンクを開いた後の承認画面は `/auth/action` で表示されます。Firebaseコンソール側のアクションURLを設定していない場合、Firebase標準の英語画面が表示されます。

### Gmailで迷惑メールに入りにくくする設定

Gmailの迷惑メール判定はアプリのコードだけでは完全に制御できません。初回送信で迷惑メールに入る場合は、FirebaseとDNS側で送信ドメインの信頼性を上げてください。

1. Firebaseコンソールの「Authentication」→「Templates」で「Customize domain」を開き、公開サイトと同じドメインまたはサブドメインを設定する
2. Firebaseが表示するDNSレコード（TXT/CNAMEなど）をドメインのDNSに追加する
3. 検証が完了したら「Apply Custom Domain」を押し、メールの差出人ドメインと確認リンクを `firebaseapp.com` ではなく公開ドメイン側に寄せる
4. 独自メール配信サービスを使う場合は、送信ドメインにSPF、DKIM、DMARCを設定する
5. Gmail Postmaster Toolsで迷惑メール率を確認し、件名・本文・送信頻度を調整する

確認メールの件名と本文は、長いURLだけが目立つ文面を避け、サービス名が分かる短い件名にしてください。例として、公開サービス名が「はよおきんかい」の場合は件名を `はよおきんかい のメールアドレスの確認` にし、本文末尾も `はよおきんかい チーム` に揃えます。

### VPSなど自前サーバーにデプロイする場合の注意点

Firebase Authentication（Google/メールログインとも）とこのアプリの共同編集機能（`crypto.subtle` によるSHA-256ハッシュ生成）は、ブラウザの「セキュアコンテキスト」を要求します。`localhost` は例外として許可されますが、それ以外のドメイン・IPアドレスでは**HTTPS必須**です。VPS上でHTTPのまま公開すると、ログインボタンを押しても無反応、または `crypto.subtle` 関連のエラーで合言葉ルームが作成できない、といった症状になります。

1. VPSの前段にNginx等のリバースプロキシを立て、Let's Encrypt（certbot）などでTLS証明書を取得し、公開ドメインをHTTPSで待ち受ける
2. Flask（`app.py`）はプロキシの内側で普段どおりHTTPのまま動かして問題ない（`gunicorn`などでプロセス管理し、Nginxから `proxy_pass` する構成が一般的）
3. Firebaseコンソールの「Authentication」→「Settings」→「Authorized domains」に、そのHTTPS公開ドメインを追加する（IPアドレスやHTTPのみのドメインは弾かれる）
4. Googleログインが `auth/unauthorized-domain` で失敗する場合も、まず3を確認する

## データ保存場所

メモ・テンプレートは、ユーザーごとにFirestoreの以下のコレクションへブラウザから直接保存されます。

- `users/{uid}/notes/{noteId}`
- `users/{uid}/templates/{templateId}`
- `users/{uid}/mindmaps/{mindMapId}`

添付した画像・動画はFirebase Storageの `users/{uid}/media/` 以下に保存されます。

共同編集では、ランダムなIDを持つ共同ルームへ以下を保存します。合言葉自体はルームIDには使わず、ブラウザ側で生成したSHA-256ハッシュから `passphraseIndex/{hash}` を経由してルームIDを引きます。これにより「合言葉を作り直す」操作でも、中身（メモ・マインドマップ・参加者）は同じルームのまま、合言葉のポインタだけを差し替えられます。

- `passphraseIndex/{hash}` → `{ room_id }`
- `collabRooms/{roomId}/notes/{noteId}`
- `collabRooms/{roomId}/mindmaps/{mindMapId}`
- `collabRooms/{roomId}/members/{uid}`
- `collabRooms/{roomId}/presence/{uid}`
- Firebase Storage: `collabRooms/{roomId}/media/`

`firestore.rules` により、個人データは各ユーザーの `uid` 配下のみ、共同編集データは参加者として登録されたログイン済みユーザーが読み書きできます。共同ルーム本体の更新はホストのみ許可されます。共同編集中の表示用presenceは、参加者が互いに読み取れ、自分の状態だけを書き込めます。`storage.rules` では個人メディアを本人限定、共同メディアをログイン済みユーザーかつ有効なルームID配下に限定します。通常の画面操作ではバックエンドサーバーを経由しません。後述のTodo APIだけが、環境変数で固定した1ユーザーの未完了Todoに対して、Firestoreの読み取り（一覧取得）と、対象Todoの`done`フィールドのみの書き込み（完了マーク）を行います。

Todoはユーザーごとに次のコレクションへ保存されます。

```text
users/{uid}/todos/{todoId}
```

現在のTodoドキュメントは次のフィールドを持ちます。

| フィールド | 型 | 内容 |
| --- | --- | --- |
| `id` | string | Todo ID（ドキュメントIDと同じ） |
| `note_id` | string | 対応する `users/{uid}/notes/{noteId}` のID |
| `title` | string | Todo追加時点のメモタイトル |
| `done` | boolean | `false` が未完了、`true` が完了 |
| `created_at` | string | Todo追加日時（ローカルISO形式） |

優先度と対象プロジェクトの専用フィールドはありません。読み取り専用APIでは、優先度を `null` として返し、対象プロジェクトは対応メモから `parent_id` を辿った最上位メモのタイトルとして導出します。

## Claude Code / Claude Desktop からMCPでつなぐ（推奨）

利用者がこのリポジトリを用意しなくても、まとめときやのメモとTodoをClaudeから直接読み書きできるようにする入口です。**アプリの画面に出るコマンドを1行実行するだけ**で、cloneもPythonも`.env`も要りません。

### 利用者の手順

1. まとめときやにログイン →「アカウント」→「Claude連携」→「Claude Codeと連携する」
2. 表示された登録コマンドを「コピーする」
3. **パソコンのターミナル**（Claude Codeのチャット欄ではない）に貼り付けて1回実行

```bash
claude mcp add --scope user --transport http matometokiya \
  https://matome.webtool-labs.com/mcp \
  --header "Authorization: Bearer <発行されたトークン>"
```

4. `claude mcp list` に `matometokiya ... ✔ Connected` と出れば完了

`--scope user` を付けているので、どのフォルダでClaude Codeを開いても使えます。登録先はそのPCの`~/.claude.json`で、Claudeアカウント側には何も保存されません（＝別の端末では再度コマンドの実行が必要）。

### エンドポイント

```text
POST /mcp
Authorization: Bearer <読み取り用 または 書き込み用トークン>
```

- MCP（Model Context Protocol）のStreamable HTTP入口です。JSON-RPCで`initialize`・`ping`・`tools/list`・`tools/call`に応答します
- 通知（`id`なし。`notifications/initialized`など）には本文なしの`202`を返します
- `GET /mcp`・`DELETE /mcp`は`405`（サーバー発のSSEやセッション終了には未対応）
- MCPはヘッダーを1本しか持てないため、**読み取り用・書き込み用のどちらのトークンでも認証**します。書き込み用のときだけ書き込み系ツールを`tools/list`に含め、読み取り用トークンで書き込みツールを呼ぶと拒否します
- `initialize`の応答で`instructions`（このサーバーの使い方をClaudeへ伝える文章）を返します。連携直後にいきなりツールを呼ばず選択肢を出すこと、削除の作法、鍵付きメモの扱いなどをここに書いています。リポジトリの`CLAUDE.md`はcloneした人にしか届かないため、**全利用者に効かせたい方針はここに書きます**
- `initialize`を受けた時点で`users/{uid}.claude_mcp_connected_at`を更新します。アプリ画面はこれを見て、登録コマンドが実際に使われたら表示を自動的に閉じます

### ツール一覧

| ツール | 必要なトークン | 中身 |
| --- | --- | --- |
| `list_notes` | 読み取り可 | `fetch_all_notes_for_uid`（鍵付きメモの扱いは設定に従う） |
| `list_todos` | 読み取り可 | `fetch_incomplete_todos_for_uid` |
| `create_note` | 書き込み用 | `create_note_for_uid` |
| `update_note` | 書き込み用 | `update_note_for_uid`（鍵付きは`403`相当で拒否） |
| `delete_note` | 書き込み用 | `delete_note_for_uid`（ゴミ箱へ移動。完全削除の手段はなし） |
| `complete_todo` | 書き込み用 | `mark_todo_done_for_uid` |

### 登録コマンドの発行

```text
POST /api/v1/claude-connect/mcp-command
Authorization: Bearer <FirebaseのIDトークン（ログイン中の本人）>
→ {"command": "claude mcp add ...", "remove_command": "claude mcp remove matometokiya -s user",
   "token": "...", "connection_id": "...", "connected_at": "..."}
```

- 呼ぶたびに新しい読み書きトークンを発行し、**連携を1つ追加**します。**すでにある連携は失効しません**
  - 以前は呼ぶたびに既存トークンを失効させていたため、登録コマンドをもう一度出しただけで、動いていた端末の連携が黙って切れていました（2026-08-20に実際に発生）。別端末を足したいだけの人まで巻き添えになるため、追加だけを行う形に変更しています
  - 同時に持てる連携は`_MAX_CLAUDE_CONNECTIONS`（既定5件）まで。超える場合は409を返し、既存の連携には一切触れません
- 整理の手段は「すべての連携を解除」（`revoke`）だけです。連携ごとの解除UIは作っていません。1台しか使わない利用者にとって、連携の一覧は読めない画面になるためです。上限に達した場合も、すべて解除してから連携し直します
- サーバーはトークンのSHA-256しか保存しないため、**平文を渡せるのはこの応答の1回だけ**です。画面でも既定はマスク表示で、「コピーする」だけが実物を扱います
- `remove_command`は、`claude mcp add`が`already exists`で失敗したときに先に実行してもらう1行です。画面にも同じものを出します

## Claude CodeからTodoを取得・完了にする（REST API）

以下はMCPより前からあるREST APIです。MCPの各ツールも内部ではこれと同じ関数を呼んでいます。スクリプト（`scripts/*.py`）はこのAPIを叩きます。


### 読み取り専用API

```text
GET /api/v1/todos
GET /api/v1/todos?project=返事きたで
Authorization: Bearer <読み取り用APIトークン>
```

- 本番URL: `https://matome.webtool-labs.com/api/v1/todos`
- `project` は省略可能で、最上位メモのタイトルとの完全一致です
- `users/{MATOME_TODO_API_UID}/todos` のうち `done == false` だけを返します
- UIDはサーバーの環境変数で固定し、リクエストからは受け取りません
- 成功時は `{"todos": [...], "count": 1, "project": null, "read_only": true}` を返します
- 各Todoは `id`, `content`, `priority`, `project`, `created_at` を含みます
- 認証失敗は `401`、サーバー設定不足は `503`、Firestore読み取り失敗は `502` です
- 応答には `Cache-Control: no-store` を付けます

### 完了にする書き込みAPI

```text
POST /api/v1/todos/<todo_id>/complete
Authorization: Bearer <書き込み用APIトークン>
```

- 本番URL: `https://matome.webtool-labs.com/api/v1/todos/<todo_id>/complete`
- `todo_id` は読み取りAPIが返す `id` の値です
- **読み取り用とは別のトークン**（`MATOME_TODO_API_WRITE_TOKEN_SHA256`）で認証します。読み取り用トークンではアクセスできません
- 対象Todoの `done` を `true` に更新するだけで、他のフィールドやメモ本体は変更しません
- 成功時は `{"id": "...", "done": true}` を返します
- 対象が存在しない場合は `404`、認証失敗は `401`、サーバー設定不足は `503`、Firestore書き込み失敗は `502` です
- 応答には `Cache-Control: no-store` を付けます
- `GET`、`PUT`、`PATCH`、`DELETE` は提供しません

### 全メモを取得する読み取り専用API

```text
GET /api/v1/notes
Authorization: Bearer <読み取り用APIトークン>
```

- 本番URL: `https://matome.webtool-labs.com/api/v1/notes`
- Todo取得APIと**同じ読み取り用トークン**で認証します（別トークンの発行は不要）
- `users/{uid}/notes` の全件を、階層の浅い順（親→子）に並べて返します。タイトル・本文どちらも空のメモは含みません
- 成功時は `{"notes": [...], "count": 1, "read_only": true}` を返します
- 各メモは `id`, `title`, `content`, `path`（ルートから直近の親までの祖先タイトル）, `locked`, `checked`, `created_at` を含みます
- **鍵付きメモ（`locked: true`）は既定では本文（`content`）を空にし、タイトルだけ返します**。含めるかどうかは、まとめときやのアプリ画面「Claude連携」内のトグル設定（利用者本人がログイン状態で切り替える）で決まります。APIリクエスト側からは指定できません
- 認証失敗は `401`、Firestore読み取り失敗は `502` です
- PC側では `scripts/fetch_matome_notes.py` を実行すると、`MATOME_TODO_API_URL`・`MATOME_TODO_API_TOKEN`をそのまま使って全メモの階層を標準出力に表示します（ファイルへの書き込みはしません）。トグルがオフなら鍵付きメモは「(鍵付きのため本文は非表示)」とだけ表示されます。Claude Codeがこの出力を読んで要約などを行います

### 鍵付きメモの内容もClaude連携で取得するかどうかの設定

```text
GET  /api/v1/claude-connect/locked-notes-setting
POST /api/v1/claude-connect/locked-notes-setting
Authorization: Bearer <FirebaseのIDトークン（ログイン中の本人）>

POSTのボディ: {"include_locked": true}
```

- アプリ画面「アカウント」→「Claude連携」内のチェックボックス「鍵付きメモの内容もClaude連携で取得できるようにする」から変更します（既定はオフ）
- ログイン中の本人だけが変更できます（Todo/Notes APIの読み取り用トークンではなく、Firebase IDトークンで認証）
- 設定値は `users/{uid}.claude_include_locked_notes` に保存され、`GET /api/v1/notes` はこの値を見て鍵付きメモの本文を含めるかどうかを決めます

### メモの作成・更新・削除（書き込みAPI）

```text
POST   /api/v1/notes                 メモを新規作成
PATCH  /api/v1/notes/<note_id>       メモのtitle/content/checkedを更新
DELETE /api/v1/notes/<note_id>       メモ（と子孫メモ）を削除
Authorization: Bearer <書き込み用APIトークン>
```

- Todo完了APIと**同じ書き込み用トークン**で認証します（読み取り用トークンではアクセスできません）
- 作成：ボディに`title`・`content`・`parent_id`（省略時はルート直下）を指定します。`parent_id`が見つからない場合は`404`
- 更新：ボディに`title`・`content`・`checked`のいずれか（複数可）を指定します。全て省略した場合は`400`。`checked`はTodo完了時にメモへ付くチェックマークと同じもので、`true`にすると`checked_at`も現在時刻になります
- 削除：**アプリのゴミ箱と同じソフトデリート**です（`deleted: true`を立てるだけで、Firestoreのドキュメント自体は消しません）。子孫メモも一緒に削除され、アプリ画面のゴミ箱からいつでも復元できます
- 更新・削除のどちらも、対象メモが**鍵付き（`locked: true`）で、かつ上記の鍵付きメモ設定がオフの場合は`403`**を返します。Claudeが読めない鍵付きメモを、内容を見ないまま書き換えたり消したりできてしまうのを防ぐためです
- PC側では次のスクリプトを使います
  - `python3 scripts/create_matome_note.py "タイトル" --content "本文" [--parent-id <ID>]`
  - `python3 scripts/update_matome_note.py <ID> [--title "新タイトル"] [--content "新本文"] [--check | --uncheck]`
  - `python3 scripts/delete_matome_note.py <ID>`（実行前に確認プロンプトが出ます。`--yes`でスキップ可能）
- 開いたままのアプリ画面には、リアルタイム同期によりこれらの変更が自動的に反映されます

### トークンとVPS側の環境変数

読み取り用・書き込み用それぞれに、十分に長いランダムトークンを生成し、そのSHA-256だけをVPSへ設定します。平文トークンはClaude Codeを実行するPC側だけに保存してください。

```bash
python - <<'PY'
import hashlib
import secrets

for label, env_name, hash_env_name in [
    ("読み取り用", "MATOME_TODO_API_TOKEN", "MATOME_TODO_API_TOKEN_SHA256"),
    ("書き込み用", "MATOME_TODO_API_WRITE_TOKEN", "MATOME_TODO_API_WRITE_TOKEN_SHA256"),
]:
    token = secrets.token_urlsafe(32)
    print(f"PC用 {env_name}={token}  ({label})")
    print(f"VPS用 {hash_env_name}={hashlib.sha256(token.encode()).hexdigest()}")
PY
```

VPS側:

```dotenv
MATOME_TODO_API_UID=<Firebase Authenticationの対象uid>
MATOME_TODO_API_TOKEN_SHA256=<読み取り用トークンの64文字SHA-256>
MATOME_TODO_API_WRITE_TOKEN_SHA256=<書き込み用トークンの64文字SHA-256>
GOOGLE_APPLICATION_CREDENTIALS=/etc/matometokiya/service-account.json
```

`GOOGLE_APPLICATION_CREDENTIALS` の代わりに、サービスアカウントJSON全体を `FIREBASE_SERVICE_ACCOUNT_JSON` へ設定することもできます。どちらも設定されている場合は `FIREBASE_SERVICE_ACCOUNT_JSON` を優先します。サービスアカウントには対象Firestoreを読み書きできる最小限のIAM権限を与えてください（書き込みAPIがdoneフィールドを更新するため）。

Claude Codeを実行するPC側:

```bash
export MATOME_TODO_API_URL="https://matome.webtool-labs.com/api/v1/todos"
export MATOME_TODO_API_TOKEN="<読み取り用の平文トークン>"
export MATOME_TODO_API_WRITE_TOKEN="<書き込み用の平文トークン>"
```

### 実行

追加先にしたいVS Codeプロジェクトのルートをカレントディレクトリにして実行します。

```bash
python /path/to/matometokiya/scripts/fetch_matome_todos.py
python /path/to/matometokiya/scripts/fetch_matome_todos.py --project "返事きたで"
```

このリポジトリ自身で実行する場合:

```bash
python scripts/fetch_matome_todos.py --project "返事きたで"
```

現在のカレントディレクトリに `docs/TODO.txt` を作成し、Todo IDがまだ記録されていない未完了Todoだけを次の形式で追記します。Todoが0件でも `docs` と `TODO.txt` は作成します。

```text
[まとめときや Todo]
- ID: 0123456789ab
- 内容: ログイン画面を改善する
- 優先度: 未設定
- 対象プロジェクト: 返事きたで
- 取得日時: YYYY-MM-DD HH:MM
```

### 対応したTodoを完了にする

`docs/TODO.txt` に記録されたID（`- ID: ...`の値）を指定して実行します。

```bash
python /path/to/matometokiya/scripts/complete_matome_todo.py 0123456789ab
```

成功すると `Todo 0123456789ab を完了にしました。` と表示され、まとめときや側のチェックボックスも完了状態になります。`docs/TODO.txt` 自体は自動更新されないため、対応済みの行を手動で削除するかそのまま残すかは運用次第です。

### VPSへ反映する

VPSの実際の配置先・systemdサービス名へ読み替えて実行します。

```bash
cd /path/to/matometokiya
git pull --ff-only
source .venv/bin/activate
pip install -r requirements.txt
```

その後、VPSの秘密情報管理先（systemdの `EnvironmentFile` など）へ上記サーバー用環境変数を設定し、Gunicornサービスを再起動します。

```bash
sudo systemctl restart <matometokiya-service-name>
sudo systemctl status <matometokiya-service-name>
```

Nginxなどのリバースプロキシでは `/api/v1/todos` も既存Flaskアプリへ転送し、必ずHTTPSで公開してください。

### セキュリティとロールバック

- 平文トークン、サービスアカウントJSON、`.env` はコミットしないでください
- URLクエリにはトークンを入れず、必ず `Authorization` ヘッダーを使ってください
- Firebase Admin SDKはFirestoreルールを迂回するため、UID固定とBearer認証を外さないでください
- 読み取り用・書き込み用トークンは必ず別のものにしてください。読み取り用トークンが漏れても、書き込み（完了マーク）はできない状態を維持するためです
- Todo完了APIは対象Todoの `done` フィールドのみを更新し、それ以外のフィールドやメモ本体・他のTodoには一切触れません
- メモの書き込みAPI（作成・更新・削除）は同じ書き込み用トークンで全メモにアクセスできます。削除はソフトデリートのためアプリのゴミ箱から復元できますが、更新（title/content上書き）に元に戻す機能はないので、トークンの取り扱いには注意してください
- 鍵付きメモもFirestore上では暗号化されていないため、APIは紐づくメモのタイトルを返します
- トークン漏えい時は新しいトークンを生成し、VPSのハッシュとPC側トークンを同時に差し替えてください（読み取り用・書き込み用は個別に差し替え可能です）
- 公開運用ではNginx等でレート制限とアクセスログの保護も設定してください
- 元に戻す場合は、デプロイコミットを `git revert` して再デプロイし、追加したTodo API環境変数を削除してサービスを再起動します。書き込みAPIは `done` フィールドの更新のみで、Todoドキュメント自体の削除や内容の書き換えは行わないため、データ構造の復元作業は不要です（`done` を意図せず `true` にしてしまった場合は、まとめときやのアプリ画面から該当Todoを未完了に戻せます）
- クライアント側の追記だけを戻す場合は、対象プロジェクトの `docs/TODO.txt` から `[まとめときや Todo]` ブロックを削除します

## ユーザーごとのトークン発行（Claude連携）

上記の管理者用トークン（環境変数で固定した1人のUID）とは別に、**ログイン中のユーザーが自分自身でトークンを発行できる仕組み**です。現在の主導線は前述のMCP（`POST /api/v1/claude-connect/mcp-command`）で、以下のペアリングコード方式は**画面から削除済み**の旧方式です（APIは残しています）。

### 旧方式（ペアリングコード。UIからの導線なし）

1. `POST /api/v1/claude-connect/start` で8桁の数字コード（10分間だけ有効、1回だけ使える）を発行する
2. Claude Codeで「まとめときやと連携して、コードは〇〇〇〇〇〇〇〇」のように伝える
3. Claude Codeが`scripts/connect_matome.py <コード>`を実行し、コードをAPIトークンに引き換えて、そのディレクトリの`.env`に書き込む
4. 以降は`fetch_matome_todos.py`・`complete_matome_todo.py`などのスクリプトが使える

この方式はリポジトリのcloneとPython環境が前提で、一般ユーザーには使えませんでした。MCP対応にあたって画面のボタンを削除し、スクリプトを使う開発者向けの手段として残してあります。

このユーザー自身のトークンは、`api_tokens/{トークンのSHA-256ハッシュ}`（Firestore）に保存され、Todo取得・完了API（`/api/v1/todos`系）はこのコレクションを見てユーザーを特定します。管理者用の環境変数トークンとは独立して動作し、どちらも同時に使えます。

### API仕様

```text
POST /api/v1/claude-connect/start
Authorization: Bearer <Firebase IDトークン>
→ {"code": "12345678", "expires_in": 600}

POST /api/v1/claude-connect/exchange
Body: {"code": "12345678"}
→ {"read_token": "...", "write_token": "..."}
（成功・失敗にかかわらずコードはこの時点で使い捨てられる）

GET /api/v1/claude-connect/status
Authorization: Bearer <Firebase IDトークン>
→ {"connected": true, "connected_at": "..."}

POST /api/v1/claude-connect/revoke
Authorization: Bearer <Firebase IDトークン>
→ {"connected": false}
```

- `start`・`status`・`revoke`はログイン中のユーザー本人のみが呼べます（Firebase IDトークンで検証）
- `exchange`はコード自体が認証情報を兼ねるため、ログイン不要です。コードは10分で失効し、1回使うと即座に無効になります
- 新しく連携すると、連携が1つ増えます。既存のトークンは失効しません（同時に最大`_MAX_CLAUDE_CONNECTIONS`件）
- `status`は`connection_count`（生きている連携の数）と`disconnected`（連携した記録はあるが鍵が1つも残っていない状態）を返します。画面はこれを見て「連携が切れています」と復旧手順を出します

### 実行

```bash
python scripts/connect_matome.py 12345678
```

このスクリプトと同じ`matometokiya`リポジトリ内の`.env`に、`MATOME_TODO_API_URL`・`MATOME_TODO_API_TOKEN`・`MATOME_TODO_API_WRITE_TOKEN`を自動で書き込みます（既存の他の設定行は変更しません）。

### 連携後にClaudeへ言えること

- 「Todo見せて」「メモを見せて」「〇〇というメモを作って」「チェックつけて」
- **「このメモ消して」→ ゴミ箱へ移動**

「消して」を完全削除ではなくゴミ箱への移動として扱わせる指示は、次の2か所に置いています。

- **MCP利用者向け**: `initialize`が返す`instructions`（`app.py`の`MCP_INSTRUCTIONS`）。cloneしていない全ユーザーに効きます
- **このリポジトリで作業する人向け**: 直下の`CLAUDE.md`。Claude Codeがこのリポジトリを開いた時に自動で読み込みます

完全削除する手段はAPI・MCPのどちらにも用意しておらず、アプリのゴミ箱から本人が操作するしかありません。あわせて、実行前に対象を確認すること・子メモもまとめて移動することを伝えること・鍵付きメモには触らないことをルールとして明記しています。

### セキュリティ

- サーバーが保存するのはトークンのSHA-256ハッシュだけで、平文は発行時の応答にしか現れません（＝後から再表示できない代わりに、サーバー側が漏れてもトークンは復元できません）
- MCP登録コマンドは画面上では既定でマスク表示し、「コピーする」だけが実物を扱います
- ペアリングコード（旧方式）は短時間で失効し、1回しか使えないため、多少見られても実害は小さい設計です
- `api_tokens`・`pairing_codes`コレクションは、Firestoreのセキュリティルールで特に許可していない（＝デフォルトで拒否される）ため、クライアントSDKから直接読み書きされることはありません。サーバー側（Admin SDK）からのみアクセスします

## 既存データの移行（旧バージョンからのアップグレード）

旧バージョン（Flask + JSONファイル保存）からアップグレードする場合、`scripts/migrate_to_firestore.py` で既存データをFirestore/Storageへ移行できます。

1. このアプリで移行先アカウントを登録し、メール確認まで完了して `uid` を控える（Firebaseコンソール「Authentication」→「Users」で確認できる）
2. 「プロジェクトの設定」→「サービスアカウント」→「新しい秘密鍵の生成」でJSONをダウンロードし、プロジェクトルートに `serviceAccountKey.json` として保存する（`.gitignore` 対象。移行スクリプト専用で、絶対にコミットしない）
3. 旧サーバーの `data/notes.json`・`data/templates.json`・`data/media/*` を、このリポジトリの `data/` 以下の同名パスに**コピー**する（コピー元は削除しない）
4. 依存関係をインストールして実行する

```bash
pip install -r requirements.txt
python scripts/migrate_to_firestore.py --uid <uid> --dry-run
python scripts/migrate_to_firestore.py --uid <uid>
```

`--dry-run` ではノート・テンプレートの件数とメディアファイルの解決状況のみ表示し、書き込みは行いません。元の `data/notes.json`・`data/templates.json`・`data/media/*` は移行後も削除されません。

## GitHubに上げる前の注意

`.env`、`.venv/`、`uploads/`、`data/*.json`、`data/media/*`、`serviceAccountKey.json` は `.gitignore` で除外しています。
