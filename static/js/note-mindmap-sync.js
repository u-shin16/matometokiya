(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.NoteMindMapSync = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function byOrderThenTitle(a, b) {
    return (a.order ?? 0) - (b.order ?? 0) || String(a.title || "").localeCompare(String(b.title || ""));
  }

  function childrenOf(items, parentId) {
    return items
      .filter(item => (item.parent_id ?? null) === (parentId ?? null))
      .sort(byOrderThenTitle);
  }

  function collectSubtreeIds(nodes, rootId) {
    const ids = new Set(rootId ? [rootId] : []);
    let changed = true;
    while (changed) {
      changed = false;
      for (const node of nodes) {
        if (ids.has(node.parent_id) && !ids.has(node.id)) {
          ids.add(node.id);
          changed = true;
        }
      }
    }
    return ids;
  }

  function findSourceNode(map) {
    const nodes = Array.isArray(map?.nodes) ? map.nodes : [];
    return nodes.find(node => node.id === map?.source_node_id)
      || nodes.find(node => node.source_note_id === map?.source_note_id)
      || nodes.find(node => node.parent_id === null)
      || nodes[0]
      || null;
  }

  function findSyncedMapsRemovedByNoteIds(maps, noteIds) {
    const removed = noteIds instanceof Set ? noteIds : new Set(noteIds || []);
    return (maps || []).filter(map => (
      Boolean(map?.sync_enabled)
      && Boolean(map?.source_note_id)
      && removed.has(map.source_note_id)
    ));
  }

  function buildSyncedMindMap({ notes, rootNoteId, map, createId, toPlainText, now }) {
    const rootNote = notes.find(note => note.id === rootNoteId);
    if (!rootNote) throw new Error("同期元のメモが見つかりません。");

    const oldNodes = Array.isArray(map?.nodes) ? map.nodes : [];
    const sourceNode = findSourceNode({ ...map, source_note_id: rootNoteId });
    const existingByNoteId = new Map(
      oldNodes.filter(node => node.source_note_id).map(node => [node.source_note_id, node]),
    );
    const usedNodeIds = new Set();
    const builtNodes = [];
    const links = [];

    function buildNode(note, parentNodeId, order, fallbackNode = null) {
      let existing = existingByNoteId.get(note.id) || null;
      if (existing && usedNodeIds.has(existing.id)) existing = null;
      if (!existing && fallbackNode && !usedNodeIds.has(fallbackNode.id)) existing = fallbackNode;

      const id = existing?.id || createId();
      usedNodeIds.add(id);
      const node = {
        ...(existing || {}),
        id,
        parent_id: parentNodeId,
        title: String(note.title || "トピック").slice(0, 80),
        order,
        x: Number.isFinite(existing?.x) ? existing.x : null,
        y: Number.isFinite(existing?.y) ? existing.y : null,
        collapsed: Boolean(existing?.collapsed),
        fill_color: existing?.fill_color ?? null,
        border_color: existing?.border_color ?? null,
        link_color: existing?.link_color ?? null,
        memo: toPlainText(note.content),
        source_note_id: note.id,
      };
      builtNodes.push(node);
      links.push({ noteId: note.id, nodeId: id });

      const noteChildren = childrenOf(notes, note.id);
      const fallbackChildren = existing ? childrenOf(oldNodes, existing.id) : [];
      noteChildren.forEach((child, index) => {
        const mapped = existingByNoteId.get(child.id);
        const fallback = mapped || fallbackChildren.find(item => (
          !usedNodeIds.has(item.id) && (!item.source_note_id || item.source_note_id === child.id)
        )) || null;
        buildNode(child, id, (index + 1) * 1000, fallback);
      });
      return node;
    }

    const rootParentId = sourceNode?.parent_id ?? null;
    const rootOrder = sourceNode?.order ?? 1000;
    const builtRoot = buildNode(rootNote, rootParentId, rootOrder, sourceNode);
    const replacedIds = sourceNode ? collectSubtreeIds(oldNodes, sourceNode.id) : new Set();
    const preservedNodes = oldNodes.filter(node => !replacedIds.has(node.id));
    const nodes = [...preservedNodes, ...builtNodes];
    const validNodeIds = new Set(nodes.map(node => node.id));
    const syncsMapTitle = builtRoot.parent_id === null;

    return {
      map: {
        ...map,
        title: syncsMapTitle ? String(rootNote.title || "新しいマインドマップ").slice(0, 80) : map.title,
        updated_at: now,
        source_note_id: rootNote.id,
        source_note_title: String(rootNote.title || "無題").slice(0, 120),
        source_node_id: builtRoot.id,
        sync_enabled: true,
        nodes,
        extra_links: (map.extra_links || []).filter(link => (
          validNodeIds.has(link.from_id) && validNodeIds.has(link.to_id)
        )),
      },
      links,
    };
  }

  function synchronizedFieldsChanged(existing, desired, toPlainText) {
    if (!existing) return true;
    return existing.title !== desired.title
      || toPlainText(existing.content) !== toPlainText(desired.content)
      || (existing.parent_id ?? null) !== (desired.parent_id ?? null)
      || (existing.order ?? 0) !== (desired.order ?? 0)
      || existing.linked_mindmap_id !== desired.linked_mindmap_id
      || existing.linked_mindmap_node_id !== desired.linked_mindmap_node_id;
  }

  function planSyncedNotes({ notes, map, createId, toPlainText, now }) {
    const sourceNode = findSourceNode(map);
    if (!sourceNode) throw new Error("同期元のノードが見つかりません。");

    const nodes = Array.isArray(map.nodes) ? map.nodes : [];
    const existingById = new Map(notes.map(note => [note.id, note]));
    const existingByNodeId = new Map(
      notes
        .filter(note => note.linked_mindmap_id === map.id && note.linked_mindmap_node_id)
        .map(note => [note.linked_mindmap_node_id, note]),
    );
    const usedNoteIds = new Set();
    const desiredNotes = [];
    const writes = [];
    const nodeNoteIds = new Map();

    function buildNote(node, parentNoteId, order, fallbackNote = null, forcedId = null) {
      const candidates = [
        forcedId ? existingById.get(forcedId) : null,
        node.source_note_id ? existingById.get(node.source_note_id) : null,
        existingByNodeId.get(node.id),
        fallbackNote,
      ];
      let existing = candidates.find(candidate => candidate && !usedNoteIds.has(candidate.id)) || null;
      const id = existing?.id || forcedId || node.source_note_id || createId();
      if (usedNoteIds.has(id)) throw new Error("メモとノードの対応関係が重複しています。");
      usedNoteIds.add(id);

      const memo = String(node.memo || "");
      const existingContent = existing?.content ?? "";
      const content = existing && toPlainText(existingContent) === memo ? existingContent : memo;
      const base = existing || {
        id,
        created_at: now,
        source_file: null,
        media: [],
        pinned: false,
        checked: false,
        checked_at: null,
        locked: false,
      };
      const desired = {
        ...base,
        id,
        parent_id: parentNoteId,
        title: String(node.title || "新しいメモ").slice(0, 120),
        content,
        order,
        linked_mindmap_id: map.id,
        linked_mindmap_node_id: node.id,
      };
      const changed = synchronizedFieldsChanged(existing, desired, toPlainText);
      desired.updated_at = changed ? now : (existing?.updated_at || now);
      desiredNotes.push(desired);
      if (changed) writes.push(desired);
      nodeNoteIds.set(node.id, id);

      const nodeChildren = childrenOf(nodes, node.id);
      const fallbackChildren = existing ? childrenOf(notes, existing.id) : [];
      nodeChildren.forEach((child, index) => {
        const mapped = child.source_note_id ? existingById.get(child.source_note_id) : null;
        const byNode = existingByNodeId.get(child.id);
        const fallback = mapped || byNode || fallbackChildren.find(item => (
          !usedNoteIds.has(item.id)
          && (!item.linked_mindmap_node_id || item.linked_mindmap_node_id === child.id)
        )) || null;
        buildNote(child, id, (index + 1) * 1000, fallback);
      });
      return desired;
    }

    const forcedRootId = map.source_note_id || sourceNode.source_note_id || createId();
    // 同期元のメモに親がいる場合は、その親と並び順をそのまま保つ。
    // ここで親を null に固定していたため、親の下にあるメモをマップと同期すると
    // そのメモがルートへ飛び出して、自分が親になってしまっていた。
    // 同期元のメモがまだ無い（マップだけがある）場合はこれまで通りルートに作る。
    const existingRoot = notes.find(note => note.id === forcedRootId) || null;
    const rootParentId = existingRoot ? (existingRoot.parent_id ?? null) : null;
    const rootOrder = existingRoot ? (existingRoot.order ?? 1000) : 1000;
    const desiredRoot = buildNote(sourceNode, rootParentId, rootOrder, null, forcedRootId);
    const deleteIds = notes
      .filter(note => note.linked_mindmap_id === map.id && !usedNoteIds.has(note.id))
      .map(note => note.id);
    const mappedNodes = nodes.map(node => ({
      ...node,
      source_note_id: nodeNoteIds.get(node.id) || node.source_note_id || null,
    }));
    const syncsMapTitle = sourceNode.parent_id === null;

    return {
      map: {
        ...map,
        title: syncsMapTitle ? String(desiredRoot.title || "新しいマインドマップ").slice(0, 80) : map.title,
        source_note_id: desiredRoot.id,
        source_note_title: String(desiredRoot.title || "無題").slice(0, 120),
        source_node_id: sourceNode.id,
        sync_enabled: true,
        nodes: mappedNodes,
      },
      desiredNotes,
      writes,
      deleteIds,
    };
  }

  return {
    buildSyncedMindMap,
    collectSubtreeIds,
    findSourceNode,
    findSyncedMapsRemovedByNoteIds,
    planSyncedNotes,
  };
});
