#!/bin/sh
# note-mindmap-sync のテストを走らせる。
#
#   sh tests/run_js.sh
#
# テスト本体（note-mindmap-sync.test.js）はnode向けに書いてあるが、
# この環境にはnodeが入っていない。macOS内蔵のJavaScriptCoreで動かせるよう、
# require と assert だけをここで最小限用意して読み込む。
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc

if [ -x "$JSC" ]; then
  WORK=$(mktemp -d /tmp/matome_test.XXXXXX)
  trap 'rm -rf "$WORK"' EXIT
  cat > "$WORK/run.js" <<JS
function deepEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
var assertShim = {
  equal: function (actual, expected, msg) {
    if (actual !== expected) throw new Error("equal 失敗: " + JSON.stringify(actual) + " ≠ " + JSON.stringify(expected) + (msg ? " / " + msg : ""));
  },
  deepEqual: function (actual, expected, msg) {
    if (!deepEqual(actual, expected)) throw new Error("deepEqual 失敗: " + JSON.stringify(actual) + " ≠ " + JSON.stringify(expected) + (msg ? " / " + msg : ""));
  },
};
var module = { exports: {} };
load("$ROOT/static/js/note-mindmap-sync.js");
var api = module.exports;
function require(name) { return name.indexOf("assert") >= 0 ? assertShim : api; }
var console = { log: function (m) { print(m); } };
load("$ROOT/tests/note-mindmap-sync.test.js");
JS
  "$JSC" "$WORK/run.js"
elif command -v node >/dev/null 2>&1; then
  node "$ROOT/tests/note-mindmap-sync.test.js"
else
  echo "JavaScriptCore も node も見つかりません" >&2
  exit 1
fi
