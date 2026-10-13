const assert = require("node:assert/strict");
const {
  buildSyncedMindMap,
  findSyncedMapsRemovedByNoteIds,
  planSyncedNotes,
} = require("../static/js/note-mindmap-sync.js");

function ids(prefix = "new") {
  let value = 0;
  return () => `${prefix}-${++value}`;
}

function plain(value) {
  return String(value || "").replace(/<[^>]+>/g, "").trim();
}

const notes = [
  { id: "note-root", parent_id: null, title: "更新したルート", content: "<b>本文</b>", order: 1000 },
  { id: "note-b", parent_id: "note-root", title: "B", content: "B本文", order: 1000 },
  { id: "note-a", parent_id: "note-root", title: "A", content: "A本文", order: 2000 },
];
const existingMap = {
  id: "map-1",
  title: "旧タイトル",
  source_note_id: "note-root",
  source_node_id: "node-root",
  nodes: [
    { id: "node-root", parent_id: null, title: "旧", source_note_id: "note-root", fill_color: "#fff" },
    { id: "node-a", parent_id: "node-root", title: "A", source_note_id: "note-a", x: 40 },
    { id: "removed", parent_id: "node-root", title: "削除対象", source_note_id: "missing" },
  ],
  extra_links: [{ from_id: "node-a", to_id: "removed" }],
};

const built = buildSyncedMindMap({
  notes,
  rootNoteId: "note-root",
  map: existingMap,
  createId: ids("node"),
  toPlainText: plain,
  now: "2026-06-22T00:00:00",
});

assert.equal(built.map.title, "更新したルート");
assert.equal(built.map.sync_enabled, true);
assert.equal(built.map.nodes.find(node => node.source_note_id === "note-a").id, "node-a");
assert.equal(built.map.nodes.find(node => node.id === "node-a").x, 40);
assert.equal(built.map.nodes.some(node => node.id === "removed"), false);
assert.deepEqual(
  built.map.nodes.filter(node => node.parent_id === "node-root").map(node => node.title),
  ["B", "A"],
);
assert.deepEqual(built.map.extra_links, []);

const currentNotes = [
  {
    id: "note-root",
    parent_id: null,
    title: "更新したルート",
    content: "<b>本文</b>",
    order: 1000,
    updated_at: "old",
    linked_mindmap_id: "map-1",
    linked_mindmap_node_id: "node-root",
  },
  {
    id: "stale",
    parent_id: "note-root",
    title: "古いメモ",
    content: "",
    order: 3000,
    linked_mindmap_id: "map-1",
    linked_mindmap_node_id: "removed",
  },
];
const mapWithNewChild = {
  id: "map-1",
  title: "更新したルート",
  notes_synced_at: "2026-06-21T00:00:00",
  source_note_id: "note-root",
  source_node_id: "node-root",
  nodes: [
    { id: "node-root", parent_id: null, title: "更新したルート", memo: "本文", source_note_id: "note-root", order: 1000 },
    { id: "node-new", parent_id: "node-root", title: "新しい子", memo: "子の本文", order: 1000 },
  ],
};
const planned = planSyncedNotes({
  notes: currentNotes,
  map: mapWithNewChild,
  createId: ids("note"),
  toPlainText: plain,
  now: "2026-06-22T00:00:01",
});

assert.equal(planned.desiredNotes[0].content, "<b>本文</b>");
assert.equal(planned.desiredNotes[1].title, "新しい子");
assert.equal(planned.desiredNotes[1].parent_id, "note-root");
assert.deepEqual(planned.deleteIds, ["stale"]);
assert.equal(planned.map.nodes[1].source_note_id, planned.desiredNotes[1].id);

const changedMemo = {
  ...mapWithNewChild,
  nodes: mapWithNewChild.nodes.map(node => (
    node.id === "node-root" ? { ...node, memo: "変更後" } : node
  )),
};
const changedPlan = planSyncedNotes({
  notes: currentNotes,
  map: changedMemo,
  createId: ids("note"),
  toPlainText: plain,
  now: "2026-06-22T00:00:02",
});
assert.equal(changedPlan.desiredNotes[0].content, "変更後");

const mapsRemovedWithParentNote = findSyncedMapsRemovedByNoteIds([
  { id: "map-parent", sync_enabled: true, source_note_id: "note-root" },
  { id: "map-child", sync_enabled: true, source_note_id: "note-child" },
  { id: "map-kept", sync_enabled: true, source_note_id: "other-note" },
  { id: "map-disabled", sync_enabled: false, source_note_id: "note-child" },
], new Set(["note-root", "note-child"]));
assert.deepEqual(mapsRemovedWithParentNote.map(map => map.id), ["map-parent", "map-child"]);

const embedded = buildSyncedMindMap({
  notes: [{ id: "sub-note", parent_id: null, title: "同期タイトル", content: "", order: 1000 }],
  rootNoteId: "sub-note",
  map: {
    id: "map-embedded",
    title: "マップ名は維持",
    source_note_id: "sub-note",
    source_node_id: "sub-node",
    nodes: [
      { id: "outer", parent_id: null, title: "外側" },
      { id: "sub-node", parent_id: "outer", title: "同期前", source_note_id: "sub-note" },
    ],
  },
  createId: ids("node"),
  toPlainText: plain,
  now: "2026-06-22T00:00:03",
});
assert.equal(embedded.map.title, "マップ名は維持");
assert.equal(embedded.map.nodes.find(node => node.id === "sub-node").parent_id, "outer");

// 親がいるメモをマップと同期しても、そのメモがルートへ飛び出さないこと。
// （同期元メモの parent_id を null に固定していたため、自分が親になってしまっていた）
const childNotes = [
  { id: "parent-note", parent_id: null, title: "親メモ", content: "", order: 1000 },
  {
    id: "child-note",
    parent_id: "parent-note",
    title: "子メモ",
    content: "",
    order: 2000,
    linked_mindmap_id: "map-child",
    linked_mindmap_node_id: "cnode-root",
  },
];
const childMap = {
  id: "map-child",
  title: "子メモ",
  source_note_id: "child-note",
  source_node_id: "cnode-root",
  nodes: [
    { id: "cnode-root", parent_id: null, title: "子メモ", source_note_id: "child-note" },
    { id: "cnode-a", parent_id: "cnode-root", title: "追加ノード", memo: "" },
  ],
};
const childPlan = planSyncedNotes({
  notes: childNotes,
  map: childMap,
  createId: ids("cnote"),
  toPlainText: plain,
  now: "2026-09-08T00:00:00",
});
const syncedRoot = childPlan.desiredNotes.find(note => note.id === "child-note");
assert.equal(syncedRoot.parent_id, "parent-note");
assert.equal(syncedRoot.order, 2000);
assert.equal(childPlan.desiredNotes.find(note => note.parent_id === "child-note").title, "追加ノード");

// メモからマップを作ったときは、メモを受け取った時刻を残すこと。
assert.equal(built.map.notes_synced_at, "2026-06-22T00:00:00");

// ---- 古いマップで同期しても、マップが知らないメモの変更を消さない（2026-09-08の事故） ----
// マップがメモを最後に受け取ったのは 10/12 15:00（端末の時刻）。
// そのあと MCP（UTC表記）で「本文」を書き直し、「考え」を足した。古いマップの端末が同期をかける。
const staleMap = {
  id: "map-s",
  title: "原稿",
  source_note_id: "s-root",
  source_node_id: "sn-root",
  notes_synced_at: "2026-10-12T15:00:00",
  nodes: [
    { id: "sn-root", parent_id: null, title: "原稿", memo: "", source_note_id: "s-root" },
    { id: "sn-body", parent_id: "sn-root", title: "古い題", memo: "古い本文", source_note_id: "s-body" },
    { id: "sn-new", parent_id: "sn-root", title: "マップで足した", memo: "" },
  ],
};
const staleNotes = [
  { id: "s-root", parent_id: null, title: "原稿", content: "", order: 1000,
    updated_at: "2026-10-12T14:00:00", linked_mindmap_id: "map-s", linked_mindmap_node_id: "sn-root" },
  { id: "s-body", parent_id: "s-root", title: "新しい題", content: "MCPで書き直した本文", order: 1000,
    updated_at: "2026-10-13T15:00:00+00:00", linked_mindmap_id: "map-s", linked_mindmap_node_id: "sn-body" },
  { id: "s-idea", parent_id: "s-root", title: "④自分の考え", content: "消えてはいけない", order: 3000,
    updated_at: "2026-10-13T16:00:00+00:00", linked_mindmap_id: "map-s", linked_mindmap_node_id: "sn-gone" },
  { id: "s-old", parent_id: "s-root", title: "マップで消したメモ", content: "", order: 4000,
    updated_at: "2026-10-12T10:00:00", linked_mindmap_id: "map-s", linked_mindmap_node_id: "sn-removed" },
];
const stalePlan = planSyncedNotes({
  notes: staleNotes, map: staleMap, createId: ids("snote"), toPlainText: plain, now: "2026-10-14T09:00:00",
});
const keptBody = stalePlan.desiredNotes.find(note => note.id === "s-body");
assert.equal(keptBody.title, "新しい題", "あとから書き直した題名を古いマップで上書きしない");
assert.equal(keptBody.content, "MCPで書き直した本文", "あとから書き直した本文を古いマップで上書きしない");
assert.equal(stalePlan.writes.some(note => note.id === "s-body"), false);
assert.equal(stalePlan.map.nodes.find(node => node.id === "sn-body").title, "新しい題", "マップ側をメモに合わせる");
assert.equal(stalePlan.map.nodes.find(node => node.id === "sn-body").memo, "MCPで書き直した本文");
assert.deepEqual(stalePlan.deleteIds, ["s-old"], "マップが知っている古いメモだけを消し、あとから足したメモは消さない");
assert.equal(stalePlan.desiredNotes.find(note => note.parent_id === "s-root" && note.title === "マップで足した").title, "マップで足した");
assert.equal(stalePlan.map.notes_synced_at, "2026-10-14T09:00:00");

// マップの時刻より前のメモは、これまで通りマップの内容で書き換える。
const freshPlan = planSyncedNotes({
  notes: staleNotes.map(note => note.id === "s-body" ? { ...note, updated_at: "2026-10-12T09:00:00" } : note),
  map: staleMap, createId: ids("fnote"), toPlainText: plain, now: "2026-10-14T09:00:00",
});
assert.equal(freshPlan.desiredNotes.find(note => note.id === "s-body").title, "古い題");
assert.equal(freshPlan.desiredNotes.find(note => note.id === "s-body").content, "古い本文");

// notes_synced_at を持たない（この修正より前に保存された）マップでは、何も消さない。
const legacyPlan = planSyncedNotes({
  notes: staleNotes, map: { ...staleMap, notes_synced_at: undefined, updated_at: "2026-10-12T15:00:00" },
  createId: ids("lnote"), toPlainText: plain, now: "2026-10-14T09:00:00",
});
assert.deepEqual(legacyPlan.deleteIds, []);
assert.equal(legacyPlan.desiredNotes.find(note => note.id === "s-body").content, "MCPで書き直した本文");

// 消す予定のメモの下に、マップを通さずに足されたメモがあれば、親も消さない。
const orphanPlan = planSyncedNotes({
  notes: [
    ...staleNotes,
    { id: "s-child", parent_id: "s-old", title: "MCPで足した子", content: "", order: 1000,
      updated_at: "2026-10-12T11:00:00" },
  ],
  map: staleMap, createId: ids("onote"), toPlainText: plain, now: "2026-10-14T09:00:00",
});
assert.deepEqual(orphanPlan.deleteIds, []);

console.log("note-mindmap-sync tests: OK");
