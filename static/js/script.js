// ── State ─────────────────────────────────────────────────────────────────────

const MEMO_DEFAULT_TEXT_COLOR = "#111827";
const MEMO_NO_HIGHLIGHT = "";
const MEMO_HIGHLIGHT_COLOR_PALETTE = [
  { label: "黄色", value: "#fef08a" },
  { label: "緑", value: "#bbf7d0" },
  { label: "青", value: "#bfdbfe" },
  { label: "赤", value: "#fecaca" },
  { label: "紫", value: "#e9d5ff" },
  { label: "ピンク", value: "#fbcfe8" },
  { label: "オレンジ", value: "#fed7aa" },
  { label: "白", value: "#ffffff" },
];
const MEMO_URL_RE = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const MEMO_URL_TRAILING_CHARS = ".,!?;:、。！？；：";
const MEMO_URL_TRAILING_PAIRS = {
  ")": "(", "]": "[", "}": "{",
  "）": "（", "］": "［", "｝": "｛",
};

const state = {
  uid:             null,
  data:            null,
  templates:          [],
  templatePreviewId:  null,
  mindMapTemplates:   [],
  todos:              [],
  mindMap:         null,
  mindMapList:     [],
  mindMapLoaded:   false,
  mindMapSelectedId: null,
  mindMapContextNodeId: null,
  mindMapContextLinkNodeId: null,
  mindMapContextExtraLink: null,
  mindMapListContextMapId: null,
  mindMapUndoStack: [],
  mindMapEditSnapshot: null,
  mindMapInlineEditNodeId: null,
  isApplyingMindMapUndo: false,
  mindMapSaveTimer: null,
  mindMapZoom:     1,
  mindMapPanX:     0,
  mindMapPanY:     0,
  mindMapCentered: false,
  mindMapPanning:  null,
  mindMapNodeDrag: null,
  mindMapLinkDrag: null,
  mindMapCanvasContextPos: null,
  mindMapMemoPreviewEnabled: true,
  mindMapPresentationMode: false,
  collabRoomId:    null,
  collabRoomLabel: "",
  collabRoomRole:  null,
  collabJoinRole:  "host",
  collabGuestsReadOnly: false,
  notesUnsubscribe: null,
  mindMapsUnsubscribe: null,
  presenceUnsubscribe: null,
  roomUnsubscribe: null,
  selfMemberUnsubscribe: null,
  presenceHeartbeatTimer: null,
  presenceWriteTimer: null,
  collabPresence: [],
  collabPresenceDraft: null,
  currentPresenceArea: "viewing",
  selectedId:      null,
  unlockedNoteIds: new Set(),
  expanded:        new Set(),
  saveTimer:       null,
  contextNoteId:   null,
  isDraggingNote:  false,
  suppressTreeClickUntil: 0,
  mediaCmFigure:   null,
  pendingMediaCaretFigure: null,
  memoFormatRange: null,
  memoTextColor:   MEMO_DEFAULT_TEXT_COLOR,
  memoHighlightColor: MEMO_NO_HIGHLIGHT,
  memoStrikeActive: false,
  memoHeadingLevel: "normal",
  isApplyingMemoFormat: false,
  undoStack:       [],
  isApplyingUndo:  false,
};

const MAX_UNDO = 50;
const NO_SELECTION_MESSAGE = "メモを選択するか作成してください";

let _isComposing = false;
let _isMindMapNodeTitleComposing = false;
let _lastMemoLinkOpen = { href: "", at: 0 };

// ── DOM refs ──────────────────────────────────────────────────────────────────

const els = {
  sidebar:          document.getElementById("sidebar"),
  mobileMenuBtn:      document.getElementById("mobileMenuBtn"),
  mobileMenuCloseBtn: document.getElementById("mobileMenuCloseBtn"),
  noteListBtn:        document.getElementById("noteListBtn"),
  noteGridOverlay:    document.getElementById("noteGridOverlay"),
  noteGridItems:      document.getElementById("noteGridItems"),
  noteGridClose:      document.getElementById("noteGridClose"),
  noteChildrenPopover:      document.getElementById("noteChildrenPopover"),
  noteChildrenPopoverTitle: document.getElementById("noteChildrenPopoverTitle"),
  noteChildrenPopoverItems: document.getElementById("noteChildrenPopoverItems"),
  noteHistoryBtn:     document.getElementById("noteHistoryBtn"),
  noteHistoryOverlay: document.getElementById("noteHistoryOverlay"),
  noteHistoryItems:   document.getElementById("noteHistoryItems"),
  noteHistoryClose:   document.getElementById("noteHistoryClose"),
  noteHistoryClearBtn: document.getElementById("noteHistoryClearBtn"),
  noteTodoBtn:        document.getElementById("noteTodoBtn"),
  noteTodoPanel:      document.getElementById("noteTodoPanel"),
  noteTodoClose:      document.getElementById("noteTodoClose"),
  noteTodoItems:      document.getElementById("noteTodoItems"),
  noteTodoCount:      document.getElementById("noteTodoCount"),
  collabStatusBtn:        document.getElementById("collabStatusBtn"),
  collabStatusCount:      document.getElementById("collabStatusCount"),
  mindMapCollabStatusBtn:   document.getElementById("mindMapCollabStatusBtn"),
  mindMapCollabStatusCount: document.getElementById("mindMapCollabStatusCount"),
  collabStatusPanel:      document.getElementById("collabStatusPanel"),
  collabStatusClose:      document.getElementById("collabStatusClose"),
  collabStatusRoomLabel:  document.getElementById("collabStatusRoomLabel"),
  collabStatusMembers:    document.getElementById("collabStatusMembers"),
  collabStatusHostSection: document.getElementById("collabStatusHostSection"),
  collabStatusHostMenuBtn: document.getElementById("collabStatusHostMenuBtn"),
  collabStatusHostMenu:    document.getElementById("collabStatusHostMenu"),
  collabStatusReadOnlyBtn: document.getElementById("collabStatusReadOnlyBtn"),
  collabStatusRegenerateBtn: document.getElementById("collabStatusRegenerateBtn"),
  collabStatusEndRoomBtn: document.getElementById("collabStatusEndRoomBtn"),
  collabStatusSettingsBtn: document.getElementById("collabStatusSettingsBtn"),
  collabStatusLeaveBtn:   document.getElementById("collabStatusLeaveBtn"),
  mobileMenuBackdrop: document.getElementById("mobileMenuBackdrop"),
  noteHead:           document.querySelector(".note-head"),
  tree:             document.getElementById("tree"),
  noteCount:        document.getElementById("noteCount"),
  titleInput:       document.getElementById("titleInput"),
  contentInput:     document.getElementById("contentInput"),
  breadcrumb:       document.getElementById("breadcrumb"),
  selectedInfo:     document.getElementById("selectedInfo"),
  saveStatus:       document.getElementById("saveStatus"),
  searchInput:      document.getElementById("searchInput"),
  newRootBtn:       document.getElementById("newRootBtn"),
  mindMapBtn:       document.getElementById("mindMapBtn"),
  mindMapOverlay:   document.getElementById("mindMapOverlay"),
  mindMapClose:     document.getElementById("mindMapClose"),
  mindMapListBtn:   document.getElementById("mindMapListBtn"),
  mindMapGridOverlay: document.getElementById("mindMapGridOverlay"),
  mindMapGridItems: document.getElementById("mindMapGridItems"),
  mindMapGridClose: document.getElementById("mindMapGridClose"),
  mindMapSettingsBtn: document.getElementById("mindMapSettingsBtn"),
  mindMapSettingsPanel: document.getElementById("mindMapSettingsPanel"),
  mindMapSettingsClose: document.getElementById("mindMapSettingsClose"),
  mindMapManageBtn: document.getElementById("mindMapManageBtn"),
  mindMapPresentationToggle: document.getElementById("mindMapPresentationToggle"),
  mindMapNodeSettingsBtn: document.getElementById("mindMapNodeSettingsBtn"),
  mindMapNodeSettingsPanel: document.getElementById("mindMapNodeSettingsPanel"),
  mindMapNodeSettingsClose: document.getElementById("mindMapNodeSettingsClose"),
  mindMapMemoPreviewToggle: document.getElementById("mindMapMemoPreviewToggle"),
  mindMapCanvasContextMenu: document.getElementById("mindMapCanvasContextMenu"),
  mindMapListContextMenu: document.getElementById("mindMapListContextMenu"),
  mindMapContextMenu: document.getElementById("mindMapContextMenu"),
  mindMapLinkContextMenu: document.getElementById("mindMapLinkContextMenu"),
  mindMapExtraLinkContextMenu: document.getElementById("mindMapExtraLinkContextMenu"),
  mindMapLinkContextPalette: document.getElementById("mindMapLinkContextPalette"),
  mindMapTitleInput: document.getElementById("mindMapTitleInput"),
  mindMapUndoBtn:    document.getElementById("mindMapUndoBtn"),
  mindMapToNoteBtn:  document.getElementById("mindMapToNoteBtn"),
  mindMapDeleteBtn:      document.getElementById("mindMapDeleteBtn"),
  downloadMapPngBtn:     document.getElementById("downloadMapPngBtn"),
  downloadMapSvgBtn:     document.getElementById("downloadMapSvgBtn"),
  downloadMapPdfBtn:     document.getElementById("downloadMapPdfBtn"),
  mindMapTemplateBtn:       document.getElementById("mindMapTemplateBtn"),
  mindMapTemplatesPanel:    document.getElementById("mindMapTemplatesPanel"),
  mindMapTemplatesClose:    document.getElementById("mindMapTemplatesClose"),
  mindMapTemplatesList:     document.getElementById("mindMapTemplatesList"),
  mindMapTemplateNameInput: document.getElementById("mindMapTemplateNameInput"),
  mindMapTemplateSaveBtn:   document.getElementById("mindMapTemplateSaveBtn"),
  mindMapNewBtn:    document.getElementById("mindMapNewBtn"),
  mindMapLargeBtn:  document.getElementById("mindMapLargeBtn"),
  mindMapSideNewBtn: document.getElementById("mindMapSideNewBtn"),
  mindMapAccountBtn: document.getElementById("mindMapAccountBtn"),
  mindMapAiBtn:          document.getElementById("mindMapAiBtn"),
  mindMapAiPanel:        document.getElementById("mindMapAiPanel"),
  mindMapAiClose:        document.getElementById("mindMapAiClose"),
  mindMapAiMapName:      document.getElementById("mindMapAiMapName"),
  mindMapAiPrompt:       document.getElementById("mindMapAiPrompt"),
  mindMapAiFile:         document.getElementById("mindMapAiFile"),
  mindMapAiGenerateBtn:  document.getElementById("mindMapAiGenerateBtn"),
  mindMapAiError:        document.getElementById("mindMapAiError"),
  mindMapAddChildBtn: document.getElementById("mindMapAddChildBtn"),
  mindMapAlignChildrenBtn: document.getElementById("mindMapAlignChildrenBtn"),
  mindMapDeleteNodeBtn: document.getElementById("mindMapDeleteNodeBtn"),
  mindMapCenterBtn: document.getElementById("mindMapCenterBtn"),
  mindMapNodeTitleInput: document.getElementById("mindMapNodeTitleInput"),
  mindMapNodeMemoInput:  document.getElementById("mindMapNodeMemoInput"),
  mindMapMemoLargeBtn:   document.getElementById("mindMapMemoLargeBtn"),
  mindMapMemoTooltip:    document.getElementById("mindMapMemoTooltip"),
  mindMapNodeFillColorButton: document.getElementById("mindMapNodeFillColorButton"),
  mindMapNodeFillPalette: document.getElementById("mindMapNodeFillPalette"),
  mindMapNodeFillColorInput: document.getElementById("mindMapNodeFillColorInput"),
  mindMapNodeBorderColorButton: document.getElementById("mindMapNodeBorderColorButton"),
  mindMapNodeBorderPalette: document.getElementById("mindMapNodeBorderPalette"),
  mindMapNodeBorderColorInput: document.getElementById("mindMapNodeBorderColorInput"),
  mindMapLinkColorButton: document.getElementById("mindMapLinkColorButton"),
  mindMapLinkPalette: document.getElementById("mindMapLinkPalette"),
  mindMapLinkColorInput: document.getElementById("mindMapLinkColorInput"),
  mindMapZoomOutBtn: document.getElementById("mindMapZoomOutBtn"),
  mindMapZoomInBtn: document.getElementById("mindMapZoomInBtn"),
  mindMapZoomLabel: document.getElementById("mindMapZoomLabel"),
  mindMapStatus:    document.getElementById("mindMapStatus"),
  mindMapPresencePanel: document.getElementById("mindMapPresencePanel"),
  mindMapCanvas:    document.getElementById("mindMapCanvas"),
  mindMapScene:     document.getElementById("mindMapScene"),
  mindMapLinks:     document.getElementById("mindMapLinks"),
  mindMapNodes:     document.getElementById("mindMapNodes"),
  templatesBtn:     document.getElementById("templatesBtn"),
  templatesOverlay: document.getElementById("templatesOverlay"),
  templatesClose:   document.getElementById("templatesClose"),
  templatesList:    document.getElementById("templatesList"),
  templateNameInput: document.getElementById("templateNameInput"),
  templateSaveBtn:  document.getElementById("templateSaveBtn"),
  undoBtn:          document.getElementById("undoBtn"),
  noteAiBtn:        document.getElementById("noteAiBtn"),
  noteAiPanel:      document.getElementById("noteAiPanel"),
  noteAiClose:      document.getElementById("noteAiClose"),
  noteAiTitle:      document.getElementById("noteAiTitle"),
  noteAiPrompt:     document.getElementById("noteAiPrompt"),
  noteAiFile:       document.getElementById("noteAiFile"),
  noteAiGenerateBtn: document.getElementById("noteAiGenerateBtn"),
  noteAiError:      document.getElementById("noteAiError"),
  checkBtn:         document.getElementById("checkBtn"),
  memoTodoBtn:      document.getElementById("memoTodoBtn"),
  memoSettingsBtn:  document.getElementById("memoSettingsBtn"),
  memoSettingsPanel: document.getElementById("memoSettingsPanel"),
  memoSettingsClose: document.getElementById("memoSettingsClose"),
  memoCollabBtn:    document.getElementById("memoCollabBtn"),
  appManageBtn:      document.getElementById("appManageBtn"),
  appManagementOverlay: document.getElementById("appManagementOverlay"),
  appManagementDialog: document.getElementById("appManagementDialog"),
  appManagementClose: document.getElementById("appManagementClose"),
  appHowToBtn:       document.getElementById("appHowToBtn"),
  appHowToDialog:    document.getElementById("appHowToDialog"),
  appHowToBack:      document.getElementById("appHowToBack"),
  appHowToClose:     document.getElementById("appHowToClose"),
  appCollabBtn:      document.getElementById("appCollabBtn"),
  appCollabDialog:   document.getElementById("appCollabDialog"),
  appCollabBack:     document.getElementById("appCollabBack"),
  appCollabClose:    document.getElementById("appCollabClose"),
  appCollabMode:     document.getElementById("appCollabMode"),
  appCollabDetail:   document.getElementById("appCollabDetail"),
  appCollabForm:     document.getElementById("appCollabForm"),
  appCollabHostBtn:  document.getElementById("appCollabHostBtn"),
  appCollabGuestBtn: document.getElementById("appCollabGuestBtn"),
  appCollabPassphraseLabel: document.getElementById("appCollabPassphraseLabel"),
  appCollabPassphrase: document.getElementById("appCollabPassphrase"),
  appCollabRegenerateBtn: document.getElementById("appCollabRegenerateBtn"),
  appCollabShowPassphrase: document.getElementById("appCollabShowPassphrase"),
  appCollabJoinBtn:  document.getElementById("appCollabJoinBtn"),
  appCollabLeaveBtn: document.getElementById("appCollabLeaveBtn"),
  appCollabError:    document.getElementById("appCollabError"),
  appNoteHowToTab:   document.getElementById("appNoteHowToTab"),
  appMindMapHowToTab: document.getElementById("appMindMapHowToTab"),
  appNoteHowToPanel: document.getElementById("appNoteHowToPanel"),
  appMindMapHowToPanel: document.getElementById("appMindMapHowToPanel"),
  appDataInfoBtn:    document.getElementById("appDataInfoBtn"),
  appAccountBtn:     document.getElementById("appAccountBtn"),
  appAccountDialog:  document.getElementById("appAccountDialog"),
  appAccountBack:    document.getElementById("appAccountBack"),
  appAccountClose:   document.getElementById("appAccountClose"),
  appAccountName:    document.getElementById("appAccountName"),
  appAccountEmail:   document.getElementById("appAccountEmail"),
  appAccountStatus:  document.getElementById("appAccountStatus"),
  appAccountNameEditRow: document.getElementById("appAccountNameEditRow"),
  appAccountDisplayNameInput: document.getElementById("appAccountDisplayNameInput"),
  appAccountDisplayNameSaveBtn: document.getElementById("appAccountDisplayNameSaveBtn"),
  appAccountDisplayNameCancelBtn: document.getElementById("appAccountDisplayNameCancelBtn"),
  appAccountEditDisplayNameBtn: document.getElementById("appAccountEditDisplayNameBtn"),
  appAccountResendVerificationBtn: document.getElementById("appAccountResendVerificationBtn"),
  appAccountRefreshStatusBtn: document.getElementById("appAccountRefreshStatusBtn"),
  appAccountLogoutBtn: document.getElementById("appAccountLogoutBtn"),
  appAccountDeleteBtn: document.getElementById("appAccountDeleteBtn"),
  claudeConnectStatus:   document.getElementById("claudeConnectStatus"),
  claudeConnectCodeBox:  document.getElementById("claudeConnectCodeBox"),
  claudeConnectMessage:  document.getElementById("claudeConnectMessage"),
  claudeConnectCopyBtn:  document.getElementById("claudeConnectCopyBtn"),
  claudeConnectStartBtn: document.getElementById("claudeConnectStartBtn"),
  claudeConnectRevokeBtn: document.getElementById("claudeConnectRevokeBtn"),
  appCreatorInfoBtn: document.getElementById("appCreatorInfoBtn"),
  appContactBtn:     document.getElementById("appContactBtn"),
  appInfoDialog:     document.getElementById("appInfoDialog"),
  appInfoTitle:      document.getElementById("appInfoTitle"),
  appInfoBack:       document.getElementById("appInfoBack"),
  appInfoClose:      document.getElementById("appInfoClose"),
  appDataInfoPanel:  document.getElementById("appDataInfoPanel"),
  appCreatorInfoPanel: document.getElementById("appCreatorInfoPanel"),
  appContactPanel:   document.getElementById("appContactPanel"),
  memoFormatToggleBtn: document.getElementById("memoFormatToggleBtn"),
  noteToMindMapBtn:      document.getElementById("noteToMindMapBtn"),
  downloadNotesPdfBtn:   document.getElementById("downloadNotesPdfBtn"),
  downloadNotesTxtBtn:   document.getElementById("downloadNotesTxtBtn"),
  downloadNotesMdBtn:    document.getElementById("downloadNotesMdBtn"),
  memoFormatBar:    document.getElementById("memoFormatBar"),
  memoTextColorBtn: document.getElementById("memoTextColorBtn"),
  memoTextColorLabel: document.getElementById("memoTextColorLabel"),
  memoTextColorPalette: document.getElementById("memoTextColorPalette"),
  memoHighlightBtn: document.getElementById("memoHighlightBtn"),
  memoHighlightLabel: document.getElementById("memoHighlightLabel"),
  memoHighlightPalette: document.getElementById("memoHighlightPalette"),
  memoStrikeBtn:    document.getElementById("memoStrikeBtn"),
  memoSubheadingBtn: document.getElementById("memoSubheadingBtn"),
  memoHeadingBtn:   document.getElementById("memoHeadingBtn"),
  mediaBtn:         document.getElementById("mediaBtn"),
  mediaInput:       document.getElementById("mediaInput"),
  deleteBtn:        document.getElementById("deleteBtn"),
  largeEditorBtn:   document.getElementById("largeEditorBtn"),
  editorArea:       document.getElementById("editorArea"),
  toast:            document.getElementById("toast"),
  confirmOverlay:   document.getElementById("confirmOverlay"),
  noteLockOverlay:  document.getElementById("noteLockOverlay"),
  noteLockForm:     document.getElementById("noteLockForm"),
  noteLockTitle:    document.getElementById("noteLockTitle"),
  noteLockMessage:  document.getElementById("noteLockMessage"),
  noteLockPassword: document.getElementById("noteLockPassword"),
  noteLockShowPassword: document.getElementById("noteLockShowPassword"),
  noteLockError:    document.getElementById("noteLockError"),
  noteLockCancel:   document.getElementById("noteLockCancel"),
  noteLockSubmit:   document.getElementById("noteLockSubmit"),
  googleLinkOverlay: document.getElementById("googleLinkOverlay"),
  googleLinkForm:    document.getElementById("googleLinkForm"),
  googleLinkMessage: document.getElementById("googleLinkMessage"),
  googleLinkPassword: document.getElementById("googleLinkPassword"),
  googleLinkShowPassword: document.getElementById("googleLinkShowPassword"),
  googleLinkError:   document.getElementById("googleLinkError"),
  googleLinkCancel:  document.getElementById("googleLinkCancel"),
  googleLinkSubmit:  document.getElementById("googleLinkSubmit"),
  hostTransferOverlay: document.getElementById("hostTransferOverlay"),
  hostTransferList:    document.getElementById("hostTransferList"),
  hostTransferSkipBtn: document.getElementById("hostTransferSkipBtn"),
  hostTransferCancelBtn: document.getElementById("hostTransferCancelBtn"),
  contextMenu:      document.getElementById("contextMenu"),
  mediaContextMenu: document.getElementById("mediaContextMenu"),
  mediaSizeSection: document.getElementById("mediaSizeSection"),
  mediaTrimBtn:     document.getElementById("mediaTrimBtn"),
  // Lightbox
  lightboxOverlay:  document.getElementById("lightboxOverlay"),
  lightboxImg:      document.getElementById("lightboxImg"),
  lightboxClose:    document.getElementById("lightboxClose"),
  // Crop
  cropOverlay:      document.getElementById("cropOverlay"),
  cropTitle:        document.getElementById("cropTitle"),
  cropHint:         document.getElementById("cropHint"),
  cropCanvas:       document.getElementById("cropCanvas"),
  cropOk:           document.getElementById("cropOk"),
  cropCancel:       document.getElementById("cropCancel"),
  imageEditPenBtn:  document.getElementById("imageEditPenBtn"),
  imageEditEraserBtn: document.getElementById("imageEditEraserBtn"),
  imageEditCropBtn: document.getElementById("imageEditCropBtn"),
  imageEditUndoBtn: document.getElementById("imageEditUndoBtn"),
  imageEditRotateLeftBtn: document.getElementById("imageEditRotateLeftBtn"),
  imageEditRotateRightBtn: document.getElementById("imageEditRotateRightBtn"),
  imageEditFlipHBtn: document.getElementById("imageEditFlipHBtn"),
  imageEditFlipVBtn: document.getElementById("imageEditFlipVBtn"),
  imageEditRestoreBtn: document.getElementById("imageEditRestoreBtn"),
  imageEditPenSize: document.getElementById("imageEditPenSize"),
  imageEditPenColorWrap: document.getElementById("imageEditPenColorWrap"),
  imageEditEraserTypeWrap: document.getElementById("imageEditEraserTypeWrap"),
  imageEditPenSizeWrap: document.getElementById("imageEditPenSizeWrap"),
  // Auth
  appShell:           document.querySelector(".app-shell"),
  authOverlay:        document.getElementById("authOverlay"),
  authDialog:         document.getElementById("authDialog"),
  authNotConfigured:  document.getElementById("authNotConfigured"),
  authFormWrap:       document.getElementById("authFormWrap"),
  authForm:           document.getElementById("authForm"),
  authGoogleBtn:      document.getElementById("authGoogleBtn"),
  authTitle:          document.getElementById("authTitle"),
  authTabs:           document.querySelectorAll(".auth-tab"),
  authEmail:          document.getElementById("authEmail"),
  authPassword:       document.getElementById("authPassword"),
  authPasswordField:  document.getElementById("authPasswordField"),
  authShowPassword:   document.getElementById("authShowPassword"),
  authShowPasswordField: document.getElementById("authShowPasswordField"),
  authRemember:       document.getElementById("authRemember"),
  authRememberField:  document.getElementById("authRememberField"),
  authError:          document.getElementById("authError"),
  authInfo:           document.getElementById("authInfo"),
  authSubmitBtn:      document.getElementById("authSubmitBtn"),
  authForgotLink:     document.getElementById("authForgotLink"),
  authBackToLoginLink: document.getElementById("authBackToLoginLink"),
  authVerifyPanel:    document.getElementById("authVerifyPanel"),
  authVerifyEmail:    document.getElementById("authVerifyEmail"),
  authVerifyStatus:   document.getElementById("authVerifyStatus"),
  authVerifyResendBtn: document.getElementById("authVerifyResendBtn"),
  authVerifyRefreshBtn: document.getElementById("authVerifyRefreshBtn"),
  authVerifyLogoutBtn: document.getElementById("authVerifyLogoutBtn"),
  authVerifyDeleteBtn: document.getElementById("authVerifyDeleteBtn"),
  // Account menu
  accountBtn:            document.getElementById("accountBtn"),
  accountMenu:           document.getElementById("accountMenu"),
  accountMenuName:       document.getElementById("accountMenuName"),
  accountMenuEmail:      document.getElementById("accountMenuEmail"),
  accountMenuStatus:     document.getElementById("accountMenuStatus"),
  editDisplayNameBtn:    document.getElementById("editDisplayNameBtn"),
  displayNameEditRow:    document.getElementById("displayNameEditRow"),
  displayNameInput:      document.getElementById("displayNameInput"),
  displayNameSaveBtn:    document.getElementById("displayNameSaveBtn"),
  displayNameCancelBtn:  document.getElementById("displayNameCancelBtn"),
  resendVerificationBtn: document.getElementById("resendVerificationBtn"),
  refreshStatusBtn:      document.getElementById("refreshStatusBtn"),
  logoutBtn:             document.getElementById("logoutBtn"),
  deleteAccountBtn:      document.getElementById("deleteAccountBtn"),
};

// ── Firebase Auth ─────────────────────────────────────────────────────────────

const auth    = (window.FIREBASE_READY && typeof firebase !== "undefined") ? firebase.auth() : null;
const db      = (window.FIREBASE_READY && typeof firebase !== "undefined") ? firebase.firestore() : null;
const storage = (window.FIREBASE_READY && typeof firebase !== "undefined") ? firebase.storage() : null;
if (auth) auth.languageCode = "ja";

const STORAGE_ENABLED = Boolean(storage && window.firebaseConfig?.storageBucket);
if (!STORAGE_ENABLED) {
  els.mediaBtn.hidden = true;
}

const COLLAB_STORAGE_KEY_PREFIX = "matometokiya:collab-room:v1:";
const COLLAB_HASH_PREFIX = "matometokiya-collab-v1:";
const COLLAB_PRESENCE_STALE_MS = 2 * 60 * 1000;
const COLLAB_PRESENCE_WRITE_DELAY_MS = 700;
const COLLAB_PRESENCE_HEARTBEAT_MS = 15000;

// ── Toast ─────────────────────────────────────────────────────────────────────

// ── ダウンロードユーティリティ ──────────────────────────────

function safeFilename(name) {
  return (name || "untitled").replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtmlAttr(value) {
  return escapeHtml(value)
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ページ遷移せずに印刷ダイアログを開くための共通ヘルパー（非表示iframeを使用）
function waitForPrintImages(win, timeoutMs = 7000) {
  const images = [...win.document.images].filter(img => img.src);
  if (images.length === 0) return Promise.resolve();
  const waiters = images.map(img => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise(resolve => {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    });
  });
  return Promise.race([
    Promise.all(waiters),
    new Promise(resolve => setTimeout(resolve, timeoutMs)),
  ]);
}

function printHtmlInPage(html, { toastMessage } = {}) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    iframe.remove();
  };

  const win = iframe.contentWindow;
  win.document.open();
  win.document.write(html);
  win.document.close();

  const doPrint = () => {
    waitForPrintImages(win).then(() => {
      win.focus();
      win.print();
      if (toastMessage) showToast(toastMessage);
      win.addEventListener("afterprint", cleanup, { once: true });
      setTimeout(cleanup, 60000);
    });
  };
  if (win.document.readyState === "complete") doPrint();
  else win.addEventListener("load", doPrint, { once: true });
}

// エクスポート対象のメモ一覧を取得（編集中の下書きを反映した上で親子関係を返す）
function prepareNotesForExport() {
  const notes = getNotes();
  const selectedDraft = notes.find(n => n.id === state.selectedId);
  if (selectedDraft && !isNoteAccessLocked(selectedDraft.id)) {
    selectedDraft.title = els.titleInput.value;
    selectedDraft.content = getContentHtml();
  }
  const childrenOf = (pid) =>
    notes.filter(n => (n.parent_id ?? null) === (pid ?? null))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return { notes, childrenOf };
}

// メモ → PDF（印刷ダイアログ経由・同一ページ内で完結）
function downloadNotesAsPdf() {
  if (!state.selectedId) { showToast("メモを選択してください。"); return; }
  const { notes, childrenOf } = prepareNotesForExport();

  // 画像を保持しつつスクリプト等を除去
  function sanitizeForPrint(rawHtml) {
    const div = document.createElement("div");
    div.innerHTML = rawHtml || "";
    // スクリプト・iframeを除去
    div.querySelectorAll("script,iframe,object,embed").forEach(el => el.remove());
    // onXxx 属性を除去
    div.querySelectorAll("*").forEach(el => {
      for (const attr of [...el.attributes]) {
        if (attr.name.startsWith("on")) el.removeAttribute(attr.name);
      }
    });
    // 編集用の透明アンカーはPDFでは不要なので消す
    div.querySelectorAll(".media-caret-anchor").forEach(el => {
      if (!el.querySelector("img,video")) el.remove();
    });
    // 画像を印刷サイズに収める
    div.querySelectorAll("figure.inline-media-figure").forEach(figure => {
      figure.removeAttribute("contenteditable");
      figure.removeAttribute("draggable");
      figure.style.display = "block";
      figure.style.width = "100%";
      figure.style.maxWidth = "100%";
      figure.style.margin = "10px 0 14px";
      figure.style.padding = "0";
      figure.style.breakInside = "avoid";
      figure.style.pageBreakInside = "avoid";
      figure.style.lineHeight = "0";
      figure.style.overflow = "visible";
      figure.querySelectorAll("video").forEach(video => {
        const label = document.createElement("div");
        label.textContent = `動画: ${video.getAttribute("src") || ""}`;
        label.style.fontSize = "11px";
        label.style.color = "#6b7280";
        label.style.lineHeight = "1.5";
        label.style.padding = "8px 0";
        video.replaceWith(label);
      });
    });
    div.querySelectorAll("img").forEach(img => {
      img.removeAttribute("draggable");
      img.style.maxWidth = "100%";
      img.style.maxHeight = "220mm";
      img.style.width = "auto";
      img.style.height = "auto";
      img.style.display = "block";
      img.style.margin = "8px 0";
      img.style.objectFit = "contain";
      img.style.borderRadius = "8px";
      img.style.breakInside = "avoid";
      img.style.pageBreakInside = "avoid";
    });
    return div.innerHTML;
  }

  function isPrintableImageItem(item) {
    const type = item?.mime_type || "";
    const filename = item?.filename || item?.original_name || "";
    return Boolean(item?.downloadURL) &&
      (type.startsWith("image/") || /\.(png|jpe?g|webp|gif|heic|heif)$/i.test(filename));
  }

  function mediaItemToPrintHtml(item) {
    const src = escapeHtmlAttr(item.downloadURL);
    const alt = escapeHtmlAttr(item.original_name || item.filename || "添付画像");
    return `<figure class="inline-media-figure"><img src="${src}" alt="${alt}" class="inline-media"></figure>`;
  }

  function htmlIncludesMediaUrl(html, url) {
    return Boolean(url) && (html.includes(url) || html.includes(escapeHtmlAttr(url)));
  }

  function getPrintableContent(note) {
    let html = contentToHtml(note.content ?? "");
    for (const item of (note.media ?? [])) {
      if (!isPrintableImageItem(item)) continue;
      if (htmlIncludesMediaUrl(html, item.downloadURL)) continue;
      html += mediaItemToPrintHtml(item);
    }
    return sanitizeForPrint(html).trim();
  }

  function buildHtml(noteId, numPath) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return "";
    const depth = numPath.length - 1;
    const indent = depth * 28;
    const numLabel = numPath.join("-");
    const check = note.checked ? " <span style='color:#16a34a'>✓</span>" : "";
    const pin = note.pinned ? " <span style='color:#dc2626'>📌</span>" : "";
    const title = escapeHtml(note.title || "無題");
    const content = getPrintableContent(note);
    const fontSize = Math.max(13, 20 - depth * 2);
    const numColor = depth === 0 ? "#2563eb" : "#6b7280";
    let html = `<div style="margin-left:${indent}px;margin-bottom:16px">
      <div style="font-size:${fontSize}px;font-weight:${depth === 0 ? "bold" : "600"};color:#1f2937;display:flex;align-items:baseline;gap:8px">
        <span style="font-size:${Math.max(11, fontSize - 2)}px;color:${numColor};font-weight:bold;white-space:nowrap;min-width:2em">${numLabel}</span>
        <span>${title}${check}${pin}</span>
      </div>
      ${content ? `<div style="font-size:13px;color:#4b5563;margin-top:6px;margin-left:${Math.max(11, fontSize - 2) * 1.2 + 8}px;line-height:1.7">${content}</div>` : ""}
    </div>`;
    childrenOf(note.id).forEach((child, i) => {
      html += buildHtml(child.id, [...numPath, i + 1]);
    });
    return html;
  }

  const body = buildHtml(state.selectedId, [1]);
  const selectedNote = notes.find(n => n.id === state.selectedId);
  const pageTitle = selectedNote?.title || "メモ";

  const escaped = escapeHtml(pageTitle);
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日`;
  const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8">
    <title>${escaped}</title>
    <style>
      @page { margin: 0; size: A4; }
      body {
        font-family: system-ui, -apple-system, sans-serif;
        margin: 0;
        padding: 24mm 20mm 20mm;
        color: #1f2937;
        background: #fff;
        box-sizing: border-box;
      }
      .doc-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 2px solid #e5e7eb;
      }
      img {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    </style>
  </head><body>
    <div class="doc-header">
      <span style="font-size:11px;color:#6b7280">${dateStr}</span>
      <span style="font-size:20px;font-weight:bold">${escaped}</span>
      <span style="width:80px"></span>
    </div>
    ${body}
  </body></html>`;

  printHtmlInPage(html, { toastMessage: "印刷ダイアログで「PDFに保存」を選択してください。" });
}

function buildNotesExportLabel(note) {
  const marks = [];
  if (note.pinned) marks.push("📌");
  if (note.checked) marks.push("✅");
  const title = note.title || "無題";
  return marks.length ? `${title} ${marks.join(" ")}` : title;
}

// メモ階層 → Markdown文字列
function buildNotesMarkdown(rootId) {
  const { notes, childrenOf } = prepareNotesForExport();
  const HEADING_MAX = 6;

  function walk(noteId, depth) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return "";
    const level = Math.min(depth + 1, HEADING_MAX);
    let out = `${"#".repeat(level)} ${buildNotesExportLabel(note)}\n`;
    const body = contentToMarkdown(note.content ?? "");
    if (body) out += `\n${body}\n`;
    childrenOf(note.id).forEach(child => { out += `\n${walk(child.id, depth + 1)}`; });
    return out;
  }

  return `${walk(rootId, 0).trim()}\n`;
}

// メモ階層 → プレーンテキスト文字列
function buildNotesPlainText(rootId) {
  const { notes, childrenOf } = prepareNotesForExport();

  function walk(noteId, depth) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return "";
    const indent = "  ".repeat(depth);
    let out = `${indent}■ ${buildNotesExportLabel(note)}\n`;
    const body = contentToPlainText(note.content ?? "");
    if (body) out += `${body.split("\n").map(line => `${indent}  ${line}`).join("\n")}\n`;
    childrenOf(note.id).forEach(child => { out += `\n${walk(child.id, depth + 1)}`; });
    return out;
  }

  return `${walk(rootId, 0).trim()}\n`;
}

// メモ → テキストファイル（同一ページ内でダウンロード）
function downloadNotesAsTxt() {
  if (!state.selectedId) { showToast("メモを選択してください。"); return; }
  const note = getNotes().find(n => n.id === state.selectedId);
  const text = buildNotesPlainText(state.selectedId);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  triggerBlobDownload(blob, `${safeFilename(note?.title)}.txt`);
  showToast("テキストをダウンロードしました。");
}

// メモ → Markdownファイル（同一ページ内でダウンロード）
function downloadNotesAsMarkdown() {
  if (!state.selectedId) { showToast("メモを選択してください。"); return; }
  const note = getNotes().find(n => n.id === state.selectedId);
  const text = buildNotesMarkdown(state.selectedId);
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  triggerBlobDownload(blob, `${safeFilename(note?.title)}.md`);
  showToast("Markdownをダウンロードしました。");
}

// マインドマップのレイアウト情報をエクスポート用の座標系にまとめる
function computeMindMapExportGeometry() {
  const nodes = getMindMapNodes();
  const layout = calculateMindMapLayout();
  if (layout.size === 0) return null;

  const NW = 180, NH = 52, R = 14, PAD = 72;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [, p] of layout) {
    minX = Math.min(minX, p.x - NW / 2);
    minY = Math.min(minY, p.y - NH / 2);
    maxX = Math.max(maxX, p.x + NW / 2);
    maxY = Math.max(maxY, p.y + NH / 2);
  }
  const ox = -minX + PAD, oy = -minY + PAD;
  const cw = maxX - minX + PAD * 2;
  const ch = maxY - minY + PAD * 2;
  return { nodes, layout, NW, NH, R, PAD, ox, oy, cw, ch };
}

// ノードタイトルをmaxW(px)に収まるよう省略
function truncateMindMapTitle(ctx, title, maxW) {
  let txt = title || "";
  if (ctx.measureText(txt).width <= maxW) return txt;
  while (ctx.measureText(txt + "…").width > maxW && txt.length > 0) txt = txt.slice(0, -1);
  return `${txt}…`;
}

// マインドマップ → Canvas描画
function renderMindMapToCanvas(geometry, dpr = 2) {
  const { nodes, layout, NW, NH, R, ox, oy, cw, ch } = geometry;
  const canvas = document.createElement("canvas");
  canvas.width = cw * dpr;
  canvas.height = ch * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  // 背景
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, cw, ch);

  // 角丸矩形ユーティリティ
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // リンク線（ベジェ）
  for (const node of nodes) {
    if (!node.parent_id) continue;
    const p = layout.get(node.parent_id);
    const c = layout.get(node.id);
    if (!p || !c) continue;
    const lc = node.link_color || null;
    ctx.strokeStyle = lc || "#94a3b8";
    ctx.lineWidth = 2;
    const x1 = p.x + ox + NW / 2, y1 = p.y + oy;
    const x2 = c.x + ox - NW / 2, y2 = c.y + oy;
    const mx = (x1 + x2) / 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(mx, y1, mx, y2, x2, y2);
    ctx.stroke();
  }

  // ノード
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const node of nodes) {
    const p = layout.get(node.id);
    if (!p) continue;
    const nx = p.x + ox - NW / 2, ny = p.y + oy - NH / 2;
    const isRoot = node.parent_id === null;
    const fill = node.fill_color || (isRoot ? "#2563eb" : "#ffffff");
    const border = node.border_color || (isRoot ? "#2563eb" : "#e2e8f0");

    // 影
    ctx.save();
    ctx.shadowColor = "rgba(15,23,42,0.10)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    roundRect(nx, ny, NW, NH, R);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();

    // 枠線
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = border;
    roundRect(nx, ny, NW, NH, R);
    ctx.stroke();

    // テキスト
    const textColor = node.fill_color
      ? "#1f2937"
      : (isRoot ? "#ffffff" : "#1f2937");
    ctx.fillStyle = textColor;
    ctx.font = `${isRoot ? "bold " : ""}14px system-ui,sans-serif`;
    const txt = truncateMindMapTitle(ctx, node.title || "", NW - 24);
    ctx.fillText(txt, p.x + ox, p.y + oy);
  }

  return canvas;
}

// マインドマップ → PNG（Canvas描画・同一ページ内でダウンロード）
function downloadMindMapAsPng() {
  if (!state.mindMap) return;
  const geometry = computeMindMapExportGeometry();
  if (!geometry) return;
  const canvas = renderMindMapToCanvas(geometry);

  canvas.toBlob(blob => {
    if (!blob) { showToast("PNG生成に失敗しました。"); return; }
    const name = safeFilename(state.mindMap?.title);
    triggerBlobDownload(blob, `${name}.png`);
    showToast("PNGをダウンロードしました。");
  }, "image/png");
}

// マインドマップ → SVG文字列
function buildMindMapSvg(geometry) {
  const { nodes, layout, NW, NH, R, ox, oy, cw, ch } = geometry;
  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");

  let linksSvg = "";
  for (const node of nodes) {
    if (!node.parent_id) continue;
    const p = layout.get(node.parent_id);
    const c = layout.get(node.id);
    if (!p || !c) continue;
    const stroke = node.link_color || "#94a3b8";
    const x1 = p.x + ox + NW / 2, y1 = p.y + oy;
    const x2 = c.x + ox - NW / 2, y2 = c.y + oy;
    const mx = (x1 + x2) / 2;
    linksSvg += `<path d="M ${x1} ${y1} C ${mx} ${y1} ${mx} ${y2} ${x2} ${y2}" stroke="${escapeHtmlAttr(stroke)}" stroke-width="2" fill="none"/>\n`;
  }

  let nodesSvg = "";
  for (const node of nodes) {
    const p = layout.get(node.id);
    if (!p) continue;
    const nx = p.x + ox - NW / 2, ny = p.y + oy - NH / 2;
    const isRoot = node.parent_id === null;
    const fill = node.fill_color || (isRoot ? "#2563eb" : "#ffffff");
    const border = node.border_color || (isRoot ? "#2563eb" : "#e2e8f0");
    const textColor = node.fill_color ? "#1f2937" : (isRoot ? "#ffffff" : "#1f2937");
    measureCtx.font = `${isRoot ? "bold " : ""}14px system-ui,sans-serif`;
    const txt = truncateMindMapTitle(measureCtx, node.title || "", NW - 24);
    nodesSvg += `<g>
      <rect x="${nx}" y="${ny}" width="${NW}" height="${NH}" rx="${R}" ry="${R}" fill="${escapeHtmlAttr(fill)}" stroke="${escapeHtmlAttr(border)}" stroke-width="1.5"/>
      <text x="${p.x + ox}" y="${p.y + oy}" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="${isRoot ? "bold" : "normal"}" fill="${escapeHtmlAttr(textColor)}">${escapeHtml(txt)}</text>
    </g>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}" viewBox="0 0 ${cw} ${ch}">\n` +
    `<rect x="0" y="0" width="${cw}" height="${ch}" fill="#f8fafc"/>\n${linksSvg}${nodesSvg}</svg>`;
}

// マインドマップ → SVG（同一ページ内でダウンロード）
function downloadMindMapAsSvg() {
  if (!state.mindMap) return;
  const geometry = computeMindMapExportGeometry();
  if (!geometry) return;
  const svg = buildMindMapSvg(geometry);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const name = safeFilename(state.mindMap?.title);
  triggerBlobDownload(blob, `${name}.svg`);
  showToast("SVGをダウンロードしました。");
}

// マインドマップ → PDF（SVGを印刷ダイアログ経由で保存・同一ページ内で完結）
function downloadMindMapAsPdf() {
  if (!state.mindMap) return;
  const geometry = computeMindMapExportGeometry();
  if (!geometry) return;
  const svg = buildMindMapSvg(geometry);
  const pageTitle = state.mindMap?.title || "マインドマップ";
  const escaped = escapeHtml(pageTitle);
  const landscape = geometry.cw >= geometry.ch;

  const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8">
    <title>${escaped}</title>
    <style>
      @page { margin: 10mm; size: A4 ${landscape ? "landscape" : "portrait"}; }
      body { margin: 0; padding: 0; }
      svg { width: 100%; height: auto; display: block; }
    </style>
  </head><body>${svg}</body></html>`;

  printHtmlInPage(html, { toastMessage: "印刷ダイアログで「PDFに保存」を選択してください。" });
}

// ── /ダウンロードユーティリティ ────────────────────────────

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  setTimeout(() => els.toast.classList.remove("show"), 2600);
}

const mobileMenuMql = window.matchMedia("(max-width: 860px)");

function isMobileMenuLayout() {
  return mobileMenuMql.matches;
}

function updateNoteListButton(open) {
  const isOpen = Boolean(open);
  els.noteListBtn?.setAttribute("aria-expanded", String(isOpen));
  els.noteListBtn?.setAttribute("aria-label", isOpen ? "親メモ一覧を閉じる" : "親メモ一覧を開く");
  if (els.noteListBtn) els.noteListBtn.title = isOpen ? "親メモ一覧を閉じる" : "親メモ一覧を開く";
}

function setMobileMenuOpen(open) {
  const shouldOpen = Boolean(open) && isMobileMenuLayout();
  if (shouldOpen) {
    closeNoteGridOverlay();
    closeNoteTodoPanel();
    closeMemoFormatPanel();
    closeMemoSettingsPanel();
  }
  els.appShell.classList.toggle("mobile-menu-open", shouldOpen);
  els.mobileMenuBackdrop.hidden = !shouldOpen;
  document.body.classList.toggle("has-mobile-menu-open", shouldOpen);
  els.mobileMenuBtn.setAttribute("aria-expanded", String(shouldOpen));
  els.mobileMenuBtn.setAttribute(
    "aria-label",
    shouldOpen ? "サイドメニューを閉じる" : "サイドメニューを開く"
  );
  els.mobileMenuBtn.title = shouldOpen ? "サイドメニューを閉じる" : "サイドメニューを開く";
  if (isMobileMenuLayout()) {
    els.sidebar?.setAttribute("aria-hidden", String(!shouldOpen));
  } else {
    els.sidebar?.removeAttribute("aria-hidden");
  }

  const icon = els.mobileMenuBtn.querySelector(".mobile-menu-icon");
  if (icon) icon.textContent = shouldOpen ? "×" : "☰";
  if (shouldOpen) requestAnimationFrame(() => els.mobileMenuCloseBtn?.focus());
}

function toggleMobileMenu() {
  setMobileMenuOpen(!els.appShell.classList.contains("mobile-menu-open"));
}

function closeMobileMenu() {
  setMobileMenuOpen(false);
}

function syncNoteHeadHeight() {
  if (!els.noteHead || !els.appShell) return;
  const height = els.noteHead.getBoundingClientRect().height;
  if (height > 0) els.appShell.style.setProperty("--note-head-height", `${height}px`);
}

function setLargeEditorOpen(open) {
  const shouldOpen = Boolean(open) && Boolean(getSelectedNote());
  if (shouldOpen) syncNoteHeadHeight();
  els.editorArea.classList.toggle("is-large-editor", shouldOpen);
  document.body.classList.toggle("has-large-editor-open", shouldOpen);
  els.largeEditorBtn.setAttribute("aria-pressed", String(shouldOpen));
  els.largeEditorBtn.setAttribute(
    "aria-label",
    shouldOpen ? "大画面編集を終了" : "大画面でメモを編集"
  );
  els.largeEditorBtn.title = shouldOpen
    ? "大画面編集を終了（Esc）"
    : "大画面でメモを編集";
  setButtonContent(els.largeEditorBtn, shouldOpen ? "×" : "⛶", shouldOpen ? "元に戻す" : "大画面");
  if (shouldOpen) closeMobileMenu();
}

function toggleLargeEditor() {
  if (!getSelectedNote()) {
    showToast("先にメモを選択してください。");
    return;
  }
  setLargeEditorOpen(!els.editorArea.classList.contains("is-large-editor"));
}

let managementReturnFocus = null;
let managementHowToMode = "memo";
let collabStatusAnchorBtn = null;

function showAppHowToView(mode, shouldFocus = false) {
  const showMindMap = mode === "mindmap";
  managementHowToMode = showMindMap ? "mindmap" : "memo";
  if (els.appNoteHowToPanel) els.appNoteHowToPanel.hidden = showMindMap;
  if (els.appMindMapHowToPanel) els.appMindMapHowToPanel.hidden = !showMindMap;
  els.appNoteHowToTab?.setAttribute("aria-selected", String(!showMindMap));
  els.appMindMapHowToTab?.setAttribute("aria-selected", String(showMindMap));
  if (els.appNoteHowToTab) els.appNoteHowToTab.tabIndex = showMindMap ? -1 : 0;
  if (els.appMindMapHowToTab) els.appMindMapHowToTab.tabIndex = showMindMap ? 0 : -1;
  if (shouldFocus) {
    const activeTab = showMindMap ? els.appMindMapHowToTab : els.appNoteHowToTab;
    requestAnimationFrame(() => activeTab?.focus());
  }
}

function showAppManagementHome(shouldFocus = false) {
  if (els.appManagementDialog) els.appManagementDialog.hidden = false;
  if (els.appHowToDialog) els.appHowToDialog.hidden = true;
  if (els.appInfoDialog) els.appInfoDialog.hidden = true;
  if (els.appCollabDialog) els.appCollabDialog.hidden = true;
  if (els.appAccountDialog) els.appAccountDialog.hidden = true;
  els.appHowToBtn?.setAttribute("aria-expanded", "false");
  els.appDataInfoBtn?.setAttribute("aria-expanded", "false");
  els.appCollabBtn?.setAttribute("aria-expanded", "false");
  els.appAccountBtn?.setAttribute("aria-expanded", "false");
  els.appCreatorInfoBtn?.setAttribute("aria-expanded", "false");
  els.appContactBtn?.setAttribute("aria-expanded", "false");
  els.memoCollabBtn?.setAttribute("aria-expanded", "false");
  els.accountBtn?.setAttribute("aria-expanded", "false");
  els.mindMapAccountBtn?.setAttribute("aria-expanded", "false");
  if (shouldFocus) requestAnimationFrame(() => els.appHowToBtn?.focus());
}

function openAppHowTo() {
  if (!els.appManagementDialog || !els.appHowToDialog) return;
  showAppHowToView(managementHowToMode);
  els.appManagementDialog.hidden = true;
  els.appHowToDialog.hidden = false;
  els.appHowToBtn?.setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => els.appHowToBack?.focus());
}

function openAppInfo(section) {
  if (!els.appManagementDialog || !els.appInfoDialog) return;
  const info = {
    data: { title: "データについて", panel: els.appDataInfoPanel, button: els.appDataInfoBtn },
    creator: { title: "制作者情報", panel: els.appCreatorInfoPanel, button: els.appCreatorInfoBtn },
    contact: { title: "お問い合わせ", panel: els.appContactPanel, button: els.appContactBtn },
  }[section];
  if (!info) return;

  [els.appDataInfoPanel, els.appCreatorInfoPanel, els.appContactPanel].forEach(panel => {
    if (panel) panel.hidden = panel !== info.panel;
  });
  [els.appDataInfoBtn, els.appCreatorInfoBtn, els.appContactBtn].forEach(button => {
    button?.setAttribute("aria-expanded", String(button === info.button));
  });
  if (els.appInfoTitle) els.appInfoTitle.textContent = info.title;
  els.appManagementDialog.hidden = true;
  els.appInfoDialog.hidden = false;
  requestAnimationFrame(() => els.appInfoBack?.focus());
}

function hideAppAccountNameEditor() {
  if (els.appAccountNameEditRow) els.appAccountNameEditRow.hidden = true;
  if (els.appAccountEditDisplayNameBtn) els.appAccountEditDisplayNameBtn.hidden = false;
}

function showAppAccountNameEditor() {
  if (!auth?.currentUser) return;
  els.appAccountDisplayNameInput.value = auth.currentUser.displayName || "";
  els.appAccountNameEditRow.hidden = false;
  els.appAccountEditDisplayNameBtn.hidden = true;
  els.appAccountDisplayNameInput.focus();
}

function openAppAccount() {
  if (!els.appManagementDialog || !els.appAccountDialog) return;
  updateAccountUI(auth?.currentUser);
  hideAppAccountNameEditor();
  els.appManagementDialog.hidden = true;
  els.appAccountDialog.hidden = false;
  els.appAccountBtn?.setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => els.appAccountBack?.focus());
  void refreshClaudeConnectStatus();
}

function buildClaudeConnectMessage(code) {
  return `まとめときやと連携して、コードは${code}`;
}

function applyClaudeConnectState(connected) {
  if (!els.claudeConnectStatus) return;
  els.claudeConnectStatus.textContent = connected ? "連携済みです。" : "まだ連携していません。";
  if (els.claudeConnectStartBtn) els.claudeConnectStartBtn.hidden = connected;
  if (els.claudeConnectRevokeBtn) els.claudeConnectRevokeBtn.hidden = !connected;
}

function setClaudeConnectConnected(connected) {
  applyClaudeConnectState(connected);
  if (els.claudeConnectCodeBox) els.claudeConnectCodeBox.hidden = true;
}

async function refreshClaudeConnectStatus() {
  const user = auth?.currentUser;
  if (!user || !els.claudeConnectStatus) return;
  els.claudeConnectStatus.textContent = "確認中…";
  try {
    const idToken = await user.getIdToken();
    const res = await fetch("/api/v1/claude-connect/status", {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "状況の取得に失敗しました。");
    setClaudeConnectConnected(Boolean(data.connected));
  } catch (e) {
    els.claudeConnectStatus.textContent = "状況を確認できませんでした。";
    console.error("[claudeConnect] status error", e);
  }
}

async function handleClaudeConnectStart() {
  const user = auth?.currentUser;
  if (!user || !els.claudeConnectStartBtn) return;
  els.claudeConnectStartBtn.disabled = true;
  try {
    const idToken = await user.getIdToken();
    const res = await fetch("/api/v1/claude-connect/start", {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "連携の開始に失敗しました。");
    els.claudeConnectMessage.textContent = buildClaudeConnectMessage(data.code);
    els.claudeConnectCodeBox.hidden = false;
    els.claudeConnectStatus.textContent = "コードを発行しました。10分以内にClaude Codeへ貼り付けてください。";
    applyClaudeConnectState(true);
  } catch (e) {
    showToast(e.message || "連携の開始に失敗しました。");
  } finally {
    els.claudeConnectStartBtn.disabled = false;
  }
}

async function handleClaudeConnectCopy() {
  const message = els.claudeConnectMessage?.textContent || "";
  if (!message) return;
  try {
    await navigator.clipboard.writeText(message);
    showToast("コピーしました。Claude Codeに貼り付けてください。");
  } catch (e) {
    showToast("コピーできませんでした。手動で選択してコピーしてください。");
  }
}

async function handleClaudeConnectRevoke() {
  const user = auth?.currentUser;
  if (!user || !els.claudeConnectRevokeBtn) return;
  const ok = await showConfirm(
    "Claude連携を解除しますか？発行済みのトークンは使えなくなります。",
    "解除する"
  );
  if (!ok) return;
  els.claudeConnectRevokeBtn.disabled = true;
  try {
    const idToken = await user.getIdToken();
    const res = await fetch("/api/v1/claude-connect/revoke", {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "連携の解除に失敗しました。");
    setClaudeConnectConnected(false);
    showToast("連携を解除しました。");
  } catch (e) {
    showToast(e.message || "連携の解除に失敗しました。");
  } finally {
    els.claudeConnectRevokeBtn.disabled = false;
  }
}

function openAppAccountFromAnchor(anchor) {
  openAppManagement(anchor);
  openAppAccount();
}

async function handleSaveAppAccountDisplayName() {
  const user = auth?.currentUser;
  if (!user) return;
  const name = els.appAccountDisplayNameInput.value.trim();
  els.appAccountDisplayNameSaveBtn.disabled = true;
  els.appAccountDisplayNameCancelBtn.disabled = true;
  try {
    await user.updateProfile({ displayName: name || null });
    updateAccountUI(user);
    hideAppAccountNameEditor();
    showToast("表示名を変更しました。");
  } catch (err) {
    showToast(translateAuthError(err));
  } finally {
    els.appAccountDisplayNameSaveBtn.disabled = false;
    els.appAccountDisplayNameCancelBtn.disabled = false;
  }
}

function collabStorageKey(uid = state.uid) {
  return uid ? `${COLLAB_STORAGE_KEY_PREFIX}${uid}` : "";
}

function normalizeCollabPassphrase(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function shortCollabId(roomId = state.collabRoomId) {
  return roomId ? `${roomId.slice(0, 6)}...${roomId.slice(-4)}` : "";
}

function normalizeCollabRole(role) {
  return role === "host" ? "host" : "guest";
}

function collabRoleLabel(role = state.collabRoomRole) {
  return normalizeCollabRole(role) === "host" ? "ホスト" : "ゲスト";
}

async function sha256Hex(value) {
  if (!crypto?.subtle || typeof TextEncoder === "undefined") {
    throw new Error("このブラウザでは合言葉ルームを作成できません。");
  }
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function generateRandomRoomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
}

// 合言葉のハッシュから、対応する共同ルームIDを引く。
// ルームIDは合言葉から直接は計算せず、passphraseIndex を経由することで、
// 「合言葉を作り直す」際に中身は同じルームのまま新しい合言葉だけを
// 追加・古い合言葉だけを無効化できるようにしている。
async function collabRoomIdFromPassphrase(passphrase) {
  const normalized = normalizeCollabPassphrase(passphrase);
  if (normalized.length < 4) throw new Error("合言葉（4桁の数字）を入力してください。");
  const hash = await sha256Hex(`${COLLAB_HASH_PREFIX}${normalized}`);
  const indexSnap = await db.collection("passphraseIndex").doc(hash).get();
  return {
    hash,
    roomId: indexSnap.exists ? (indexSnap.data()?.room_id || null) : null,
  };
}

function getSavedCollabRoom(uid = state.uid) {
  const key = collabStorageKey(uid);
  if (!key) return null;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    if (!saved?.roomId || !/^[a-f0-9]{64}$/.test(saved.roomId)) return null;
    return {
      roomId: saved.roomId,
      label: String(saved.label || "共同ルーム").slice(0, 80),
      role: normalizeCollabRole(saved.role),
    };
  } catch {
    return null;
  }
}

function saveCollabRoom(roomId, label, role = state.collabRoomRole) {
  const key = collabStorageKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify({
    roomId,
    label: String(label || "共同ルーム").slice(0, 80),
    role: normalizeCollabRole(role),
  }));
}

function clearSavedCollabRoom(uid = state.uid) {
  const key = collabStorageKey(uid);
  if (key) localStorage.removeItem(key);
}

function resetCollabRoomState() {
  state.collabRoomId = null;
  state.collabRoomLabel = "";
  state.collabRoomRole = null;
}

async function shouldDropRestoredCollabRoom(uid, roomId) {
  if (!uid || !roomId) return false;
  const userRef = db.collection("users").doc(uid);
  const roomRef = db.collection("collabRooms").doc(roomId);

  try {
    const [roomSnap, memberSnap] = await Promise.all([
      roomRef.get(),
      roomRef.collection("members").doc(uid).get(),
    ]);
    if (!roomSnap.exists || !memberSnap.exists) return true;

    const [personalNotesSnap, roomNotesSnap, roomMapsSnap] = await Promise.all([
      userRef.collection("notes").limit(1).get(),
      roomRef.collection("notes").limit(1).get(),
      roomRef.collection("mindmaps").limit(1).get(),
    ]);
    return !personalNotesSnap.empty && roomNotesSnap.empty && roomMapsSnap.empty;
  } catch (err) {
    console.warn("[collab] 保存済み共同ルームを復元できないため個人メモへ戻します", err);
    return true;
  }
}

async function restorePersonalWorkspaceIfSavedCollabIsStale(uid) {
  if (!state.collabRoomId) return false;
  const stale = await shouldDropRestoredCollabRoom(uid, state.collabRoomId);
  if (!stale) return false;
  clearSavedCollabRoom(uid);
  resetCollabRoomState();
  showToast("個人メモを開きました。");
  return true;
}

function setCollabError(message = "") {
  if (!els.appCollabError) return;
  els.appCollabError.textContent = message;
  els.appCollabError.hidden = !message;
}

function isPermissionDeniedError(err) {
  return err?.code === "permission-denied"
    || /Missing or insufficient permissions/i.test(err?.message || "");
}

function translateCollabError(err, fallback = "共同ルームに参加できませんでした。") {
  if (isPermissionDeniedError(err)) {
    return "共同編集用のFirestoreルールがまだ反映されていない可能性があります。Firebase ConsoleのFirestore Database > ルールで、このリポジトリのfirestore.rulesをPublishしてください。";
  }
  return err?.message || fallback;
}

function collabPresenceCollection(roomId = state.collabRoomId) {
  if (!roomId) return null;
  return db.collection("collabRooms").doc(roomId).collection("presence");
}

function collabPresenceDocRef(roomId = state.collabRoomId, uid = state.uid) {
  if (!roomId || !uid) return null;
  return collabPresenceCollection(roomId)?.doc(uid) || null;
}

function currentUserDisplayName() {
  const user = auth?.currentUser;
  const displayName = String(user?.displayName || "").trim();
  if (displayName) return displayName.slice(0, 40);
  const email = String(user?.email || "").trim();
  if (email) return (email.split("@")[0] || email).slice(0, 40);
  return "ユーザー";
}

function normalizePresenceDoc(doc) {
  const data = doc.data() || {};
  return {
    uid: data.uid || doc.id,
    display_name: String(data.display_name || "ユーザー").slice(0, 40),
    email: String(data.email || "").slice(0, 120),
    role: normalizeCollabRole(data.role),
    area: String(data.area || "viewing"),
    note_id: data.note_id || null,
    note_title: String(data.note_title || "").slice(0, 120),
    map_id: data.map_id || null,
    map_title: String(data.map_title || "").slice(0, 80),
    node_id: data.node_id || null,
    node_title: String(data.node_title || "").slice(0, 80),
    caret_offset: Number.isFinite(data.caret_offset) ? data.caret_offset : null,
    updated_at: data.updated_at || "",
    updated_at_ms: Number(data.updated_at_ms || 0),
  };
}

function isFreshPresence(presence) {
  return presence?.updated_at_ms && Date.now() - presence.updated_at_ms < COLLAB_PRESENCE_STALE_MS;
}

function isEditingPresence(presence) {
  return Boolean(presence?.area) && !["idle", "viewing"].includes(presence.area);
}

function isNoteEditingPresence(presence) {
  return ["title", "content"].includes(presence?.area);
}

function isMindMapNodeEditingPresence(presence) {
  return ["mindmap-node-title", "mindmap-node-memo"].includes(presence?.area);
}

function presenceDisplayName(presence) {
  return String(presence?.display_name || "ユーザー").slice(0, 40);
}

function presenceInitials(presence) {
  const name = presenceDisplayName(presence).trim();
  return (name.slice(0, 2) || "ユ").toUpperCase();
}

// uidから固定の色相を作り、同じ参加者は常に同じ色のカーソルフラグになるようにする。
function presenceColor(uid) {
  const str = String(uid || "");
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue}, 72%, 42%)`;
}

function presenceAreaLabel(area) {
  switch (area) {
    case "title": return "タイトルを編集中";
    case "content": return "本文を編集中";
    case "mindmap-title": return "マップ名を編集中";
    case "mindmap-node-title": return "ノード名を編集中";
    case "mindmap-node-memo": return "ノードメモを編集中";
    case "mindmap": return "マインドマップを操作中";
    case "viewing": return "表示中";
    default: return "作業中";
  }
}

function presenceLocationLabel(presence) {
  if (!presence) return "";
  const action = presenceAreaLabel(presence.area);
  if (presence.area?.startsWith("mindmap")) {
    const mapTitle = presence.map_title || "マインドマップ";
    const nodeTitle = presence.node_title ? ` / ${presence.node_title}` : "";
    return `${mapTitle}${nodeTitle}・${action}`;
  }
  const noteTitle = presence.note_title || "メモ";
  return `${noteTitle}・${action}`;
}

function getPresenceForNote(noteId, { editingOnly = false } = {}) {
  if (!noteId) return [];
  return state.collabPresence.filter(presence => (
    presence.note_id === noteId &&
    (!editingOnly || isNoteEditingPresence(presence))
  ));
}

function getPresenceForMindMapNode(nodeId, { editingOnly = false } = {}) {
  if (!nodeId || !state.mindMap?.id) return [];
  return state.collabPresence.filter(presence => (
    presence.map_id === state.mindMap.id &&
    presence.node_id === nodeId &&
    (!editingOnly || isMindMapNodeEditingPresence(presence))
  ));
}

function createPresenceChip(presence) {
  const chip = document.createElement("span");
  chip.className = `collab-presence-chip${isEditingPresence(presence) ? " is-editing" : ""}`;
  chip.title = `${presenceDisplayName(presence)}: ${presenceLocationLabel(presence)}`;

  const avatar = document.createElement("span");
  avatar.className = "collab-presence-avatar";
  avatar.textContent = presenceInitials(presence);

  const text = document.createElement("span");
  text.className = "collab-presence-text";
  text.textContent = `${presenceDisplayName(presence)}・${presenceAreaLabel(presence.area)}`;

  chip.append(avatar, text);
  return chip;
}

function createTreePresenceBadge(presences) {
  const badge = document.createElement("span");
  badge.className = "tree-presence-badge";
  const names = presences.map(presenceDisplayName);
  badge.textContent = presences.length > 1
    ? `${presenceInitials(presences[0])}+${presences.length - 1}`
    : presenceInitials(presences[0]);
  badge.title = names.join("、") + " が編集中";
  return badge;
}

function createMindMapPresenceBadge(presences) {
  const badge = document.createElement("span");
  badge.className = "mindmap-node-presence";
  const names = presences.map(presenceDisplayName);
  badge.textContent = presences.length > 1
    ? `${presenceInitials(presences[0])}+${presences.length - 1}`
    : presenceInitials(presences[0]);
  badge.title = names.join("、") + " が編集中";
  return badge;
}

function renderMindMapPresencePanel() {
  const panel = els.mindMapPresencePanel;
  if (!panel) return;
  panel.innerHTML = "";
  const mapId = state.mindMap?.id;
  const presences = isCollabActive() && mapId
    ? state.collabPresence.filter(presence => presence.map_id === mapId)
    : [];
  panel.hidden = presences.length === 0;
  if (panel.hidden) return;

  presences.forEach(presence => panel.appendChild(createPresenceChip(presence)));
}

let collabCaretLayerEl = null;

function getCollabCaretLayer() {
  if (!collabCaretLayerEl) {
    collabCaretLayerEl = document.createElement("div");
    collabCaretLayerEl.className = "collab-caret-layer";
    document.body.appendChild(collabCaretLayerEl);
  }
  return collabCaretLayerEl;
}

// 共同編集者が今どこにカーソルを置いているかを、本文中に旗アイコンで表示する。
// 各参加者は presence として文字数オフセットをブロードキャストしており、
// ここでは自分側のDOMで同じオフセットの位置を逆算して旗を配置する。
function renderCollabCaretFlags() {
  const layer = getCollabCaretLayer();
  const canShow = isCollabActive() &&
    state.selectedId &&
    els.contentInput?.contentEditable === "true" &&
    Boolean(els.mindMapOverlay?.hidden);
  if (!canShow) {
    layer.innerHTML = "";
    return;
  }

  const contentRect = els.contentInput.getBoundingClientRect();
  const presences = state.collabPresence.filter(p => (
    p.note_id === state.selectedId && p.area === "content" && p.caret_offset != null
  ));

  const seenUids = new Set();
  presences.forEach(presence => {
    const range = resolveTextOffsetToRange(els.contentInput, presence.caret_offset);
    const rect = range?.getBoundingClientRect();
    const visible = rect && rect.top >= contentRect.top - 2 && rect.top <= contentRect.bottom;
    let flag = layer.querySelector(`[data-uid="${presence.uid}"]`);
    if (!visible) {
      flag?.remove();
      return;
    }
    seenUids.add(presence.uid);

    if (!flag) {
      flag = document.createElement("div");
      flag.className = "collab-caret-flag";
      flag.dataset.uid = presence.uid;
      flag.innerHTML = `<span class="collab-caret-flag-bar"></span><span class="collab-caret-flag-label"></span>`;
      layer.appendChild(flag);
    }
    flag.style.setProperty("--collab-caret-color", presenceColor(presence.uid));
    flag.style.setProperty("--collab-caret-height", `${rect.height || 22}px`);
    flag.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
    flag.querySelector(".collab-caret-flag-label").textContent = presenceDisplayName(presence);
  });

  layer.querySelectorAll("[data-uid]").forEach(el => {
    if (!seenUids.has(el.dataset.uid)) el.remove();
  });
}

function renderCollabPresenceUI() {
  updateCollabStatusUI();
  renderMindMapPresencePanel();
  renderCollabCaretFlags();
  if (state.data && !els.tree?.querySelector(".tree-rename-input")) renderTree();
  const editingMindMapField = ["mindmap-title", "mindmap-node-title", "mindmap-node-memo"].includes(detectPresenceArea());
  if (state.mindMap && !els.mindMapOverlay?.hidden && !editingMindMapField && !isMindMapRemoteRenderBlocked()) {
    renderMindMap();
  } else if (state.mindMap && !els.mindMapOverlay?.hidden) {
    refreshMindMapNodePresenceBadges();
  }
}

// コンテンツ編集領域内でのキャレット位置を「先頭からの文字数」として取得する。
// この数値は共同編集者へブロードキャストし、相手側で同じ数え方で位置を
// 逆算してカーソル位置フラグを表示するために使う。
function getCaretTextOffset(container) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!container.contains(range.startContainer)) return null;
  const preRange = document.createRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length;
}

function resolveTextOffsetToRange(container, offset) {
  if (offset == null || offset < 0) return null;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let node = walker.nextNode();
  let lastTextNode = null;
  while (node) {
    lastTextNode = node;
    const len = node.nodeValue.length;
    if (remaining <= len) {
      const range = document.createRange();
      range.setStart(node, remaining);
      range.collapse(true);
      return range;
    }
    remaining -= len;
    node = walker.nextNode();
  }
  if (lastTextNode) {
    const range = document.createRange();
    range.setStart(lastTextNode, lastTextNode.length);
    range.collapse(true);
    return range;
  }
  return null;
}

function buildCollabPresence(area = detectPresenceArea()) {
  const now = Date.now();
  const user = auth?.currentUser;
  const note = getSelectedNote();
  const map = state.mindMap;
  const node = getMindMapNode(state.mindMapSelectedId);
  const data = {
    uid: state.uid,
    room_id: state.collabRoomId,
    display_name: currentUserDisplayName(),
    email: String(user?.email || "").slice(0, 120),
    role: normalizeCollabRole(state.collabRoomRole),
    area,
    caret_offset: null,
    updated_at: new Date(now).toISOString(),
    updated_at_ms: now,
  };

  if (area === "content") {
    data.caret_offset = getCaretTextOffset(els.contentInput);
  } else if (area === "title" && typeof els.titleInput.selectionStart === "number") {
    data.caret_offset = els.titleInput.selectionStart;
  }

  if (area.startsWith("mindmap")) {
    const includeNode = ["mindmap", "mindmap-node-title", "mindmap-node-memo"].includes(area);
    Object.assign(data, {
      map_id: map?.id || null,
      map_title: String(map?.title || "マインドマップ").slice(0, 80),
      node_id: includeNode ? (node?.id || null) : null,
      node_title: includeNode ? String(node?.title || "").slice(0, 80) : "",
      note_id: null,
      note_title: "",
    });
  } else {
    Object.assign(data, {
      note_id: note?.id || null,
      note_title: String(note?.title || "メモ").slice(0, 120),
      map_id: null,
      map_title: "",
      node_id: null,
      node_title: "",
    });
  }
  return data;
}

function detectPresenceArea() {
  const active = document.activeElement;
  if (!els.mindMapOverlay?.hidden) {
    if (active === els.mindMapTitleInput) return "mindmap-title";
    if (active === els.mindMapNodeTitleInput) return "mindmap-node-title";
    if (active === els.mindMapNodeMemoInput) return "mindmap-node-memo";
    return "mindmap";
  }
  if (active === els.titleInput) return "title";
  if (active === els.contentInput || els.contentInput?.contains(active)) return "content";
  return state.selectedId ? "viewing" : "idle";
}

async function flushCollabPresence() {
  clearTimeout(state.presenceWriteTimer);
  state.presenceWriteTimer = null;
  const draft = state.collabPresenceDraft;
  if (!draft?.room_id || !draft.uid || !isCollabActive()) return;
  state.collabPresenceDraft = null;
  try {
    await collabPresenceDocRef(draft.room_id, draft.uid)?.set(draft, { merge: true });
  } catch (err) {
    console.warn("[collab presence] write failed", err);
  }
}

function setCollabPresence(area = detectPresenceArea(), options = {}) {
  if (!isCollabActive() || !state.uid) return;
  state.currentPresenceArea = area;
  state.collabPresenceDraft = buildCollabPresence(area);
  clearTimeout(state.presenceWriteTimer);
  if (options.immediate) {
    void flushCollabPresence();
  } else {
    state.presenceWriteTimer = setTimeout(flushCollabPresence, COLLAB_PRESENCE_WRITE_DELAY_MS);
  }
}

function refreshCollabPresence(options = {}) {
  setCollabPresence(detectPresenceArea(), options);
}

function startCollabPresenceHeartbeat() {
  clearInterval(state.presenceHeartbeatTimer);
  state.presenceHeartbeatTimer = null;
  if (!isCollabActive()) return;
  refreshCollabPresence({ immediate: true });
  state.presenceHeartbeatTimer = setInterval(() => {
    refreshCollabPresence({ immediate: true });
  }, COLLAB_PRESENCE_HEARTBEAT_MS);
}

async function clearCollabPresence(roomId = state.collabRoomId, uid = state.uid) {
  clearTimeout(state.presenceWriteTimer);
  state.presenceWriteTimer = null;
  state.collabPresenceDraft = null;
  if (!roomId || !uid) return;
  try {
    await collabPresenceDocRef(roomId, uid)?.delete();
  } catch (err) {
    console.warn("[collab presence] clear failed", err);
  }
}

function applyPresenceSnapshot(snap) {
  state.collabPresence = snap.docs
    .map(normalizePresenceDoc)
    .filter(presence => presence.uid !== state.uid && isFreshPresence(presence))
    .sort((a, b) => b.updated_at_ms - a.updated_at_ms);
  renderCollabPresenceUI();
}

// ホスト譲渡を検知する。members/{uid} のroleは本人しか書けない権限設計なので、
// 「room.host_uidが自分になった」ことをこのリスナーで検知し、自分の
// memberドキュメントのroleを自分で"host"へ更新する。
function applyRoomSnapshot(doc) {
  if (!isCollabActive() || !doc.exists || doc.id !== state.collabRoomId) return;
  const data = doc.data() || {};
  const hostUid = data.host_uid || null;
  const iAmHostNow = hostUid === state.uid;
  const wasHost = state.collabRoomRole === "host";
  const readOnlyChanged = Boolean(data.guests_read_only) !== state.collabGuestsReadOnly;
  state.collabGuestsReadOnly = Boolean(data.guests_read_only);

  // ホストが合言葉を作り直したら、全員のローカルな表示・保存済み合言葉も
  // 最新のものへ揃える（ルーム自体は変わらないので、この値だけ追従させればよい）。
  const newLabel = String(data.label_hint || "").trim();
  const labelChanged = Boolean(newLabel) && newLabel !== state.collabRoomLabel;
  if (labelChanged) {
    state.collabRoomLabel = newLabel;
    saveCollabRoom(state.collabRoomId, newLabel, state.collabRoomRole);
    updateCollabUI();
    if (!wasHost) showToast("ホストが合言葉を作り直しました。");
  }

  if (readOnlyChanged && !wasHost) {
    renderEditor();
    if (state.mindMap && !els.mindMapOverlay?.hidden) renderMindMap();
    showToast(state.collabGuestsReadOnly
      ? "ホストが編集を閲覧専用にしました。"
      : "ホストが編集を許可しました。");
  }
  updateCollabStatusUI();
  if (!els.collabStatusPanel?.hidden) renderCollabStatusPanel();

  if (iAmHostNow === wasHost) return;

  state.collabRoomRole = iAmHostNow ? "host" : "guest";
  saveCollabRoom(state.collabRoomId, state.collabRoomLabel, state.collabRoomRole);
  updateCollabUI();
  updateCollabStatusUI();
  renderEditor();

  if (iAmHostNow) {
    collabPresenceCollection()?.doc(state.uid).set({ role: "host" }, { merge: true }).catch(() => {});
    db.collection("collabRooms").doc(state.collabRoomId).collection("members").doc(state.uid)
      .set({ uid: state.uid, role: "host" }, { merge: true })
      .then(() => showToast("あなたが共同ルームのホストになりました。"))
      .catch(() => {});
  } else {
    showToast("ホストが別の参加者に交代しました。");
  }
}

// 自分のmemberドキュメントが（ホストの操作で）消えたら、退出させられた
// ものとして個人メモへ戻す。ルーム終了時にも使う（合言葉の作り直しは
// 中身が同じルームのまま行われるため、参加者は退出させられない）。
let _handlingRoomRemoval = false;
async function applySelfMemberSnapshot(doc) {
  if (!isCollabActive() || doc.exists || _handlingRoomRemoval) return;
  _handlingRoomRemoval = true;
  const roomId = state.collabRoomId;
  captureCurrentCollabDraftsIntoLocalState();
  const fallbackSnapshot = localCollabWorkspaceSnapshot();
  try {
    // 退出させられた理由（キック／ルーム終了）に応じてメッセージを変える。
    // ルームドキュメント自体はメンバーでなくても読めるので、削除前に
    // ホスト側が書き込んでおいたフラグを見て判断する。
    let message = "ホストによって共同ルームから退出させられました。";
    try {
      const roomSnap = await db.collection("collabRooms").doc(roomId).get();
      const roomData = roomSnap.exists ? roomSnap.data() : null;
      if (roomData?.ended_at) {
        message = "ホストが共同ルームを終了しました。個人メモに戻りました。";
      }
    } catch {}
    await preserveCollabWorkspaceForPersonal(roomId, fallbackSnapshot)
      .catch(err => console.warn("[collab] 強制退出時の個人メモ退避に失敗しました", err));
    stopWorkspaceSnapshots();
    clearSavedCollabRoom();
    state.collabRoomId = null;
    state.collabRoomLabel = "";
    state.collabRoomRole = null;
    await reloadCurrentWorkspace();
    showToast(message);
  } finally {
    _handlingRoomRemoval = false;
  }
}

function updateCollabUI() {
  if (els.appCollabMode) {
    els.appCollabMode.textContent = isCollabActive()
      ? `共同編集中: ${state.collabRoomLabel || "共同ルーム"}`
      : "個人メモ";
  }
  if (els.appCollabDetail) {
    els.appCollabDetail.textContent = isCollabActive()
      ? `${collabRoleLabel()}・ルーム ${shortCollabId()}`
      : "このアカウント専用";
  }
  if (els.appCollabLeaveBtn) els.appCollabLeaveBtn.hidden = !isCollabActive();
  // 共同作業中はホスト/ゲスト選択と合言葉入力フォームがまぎらわしいので隠す。
  // ルームに入っていない時だけ、新規参加用のフォームを表示する。
  if (els.appCollabForm) els.appCollabForm.hidden = isCollabActive();
  if (els.newRootBtn) {
    els.newRootBtn.disabled = isCollabActive();
    els.newRootBtn.title = isCollabActive()
      ? "共同作業中は新しい親メモを追加できません"
      : "最上位メモを追加";
  }
}

function updateCollabStatusUI() {
  const active = isCollabActive();
  if (els.collabStatusBtn) els.collabStatusBtn.hidden = !active;
  if (els.mindMapCollabStatusBtn) els.mindMapCollabStatusBtn.hidden = !active;
  if (!active) {
    closeCollabStatusPanel();
    return;
  }
  const count = state.collabPresence.length + 1;
  [els.collabStatusCount, els.mindMapCollabStatusCount].forEach(el => {
    if (!el) return;
    el.textContent = String(count);
    el.hidden = false;
  });
  if (!els.collabStatusPanel?.hidden) renderCollabStatusPanel();
}

function renderCollabStatusPanel() {
  if (!isCollabActive()) return;
  if (els.collabStatusRoomLabel) {
    els.collabStatusRoomLabel.textContent =
      `${state.collabRoomLabel || "共同ルーム"}・${collabRoleLabel()}として参加中`;
  }
  if (!els.collabStatusMembers) return;
  els.collabStatusMembers.innerHTML = "";

  const self = {
    uid: state.uid,
    display_name: currentUserDisplayName(),
    role: state.collabRoomRole,
    area: state.currentPresenceArea,
    isSelf: true,
  };
  const members = [self, ...state.collabPresence];

  members.forEach(member => {
    const li = document.createElement("li");
    li.className = "collab-status-member";

    const avatar = document.createElement("span");
    avatar.className = "collab-presence-avatar";
    avatar.textContent = presenceInitials(member);

    const info = document.createElement("span");
    info.className = "collab-status-member-info";

    const name = document.createElement("span");
    name.className = "collab-status-member-name";
    name.textContent = member.isSelf
      ? `${presenceDisplayName(member)}（自分）`
      : presenceDisplayName(member);

    const meta = document.createElement("span");
    meta.className = "collab-status-member-meta";
    meta.textContent = member.isSelf
      ? collabRoleLabel(member.role) + (isGuestReadOnly() ? "・閲覧専用" : "")
      : `${collabRoleLabel(member.role)}・${presenceLocationLabel(member)}`;

    info.append(name, meta);
    li.append(avatar, info);

    if (!member.isSelf && state.collabRoomRole === "host") {
      const actions = document.createElement("div");
      actions.className = "collab-status-member-actions";

      const makeHostBtn = document.createElement("button");
      makeHostBtn.type = "button";
      makeHostBtn.className = "collab-status-member-action-btn";
      makeHostBtn.title = "ホストにする";
      makeHostBtn.setAttribute("aria-label", `${presenceDisplayName(member)}をホストにする`);
      makeHostBtn.textContent = "👑";
      makeHostBtn.addEventListener("click", () => requestTransferHostTo(member));
      actions.appendChild(makeHostBtn);

      const kickBtn = document.createElement("button");
      kickBtn.type = "button";
      kickBtn.className = "collab-status-member-action-btn danger";
      kickBtn.title = "退出させる";
      kickBtn.setAttribute("aria-label", `${presenceDisplayName(member)}を退出させる`);
      kickBtn.textContent = "✕";
      kickBtn.addEventListener("click", () => requestKickMember(member));
      actions.appendChild(kickBtn);

      li.appendChild(actions);
    }

    els.collabStatusMembers.appendChild(li);
  });

  const isHost = state.collabRoomRole === "host";
  if (els.collabStatusHostSection) els.collabStatusHostSection.hidden = !isHost;
  if (els.collabStatusReadOnlyBtn) {
    els.collabStatusReadOnlyBtn.textContent = state.collabGuestsReadOnly
      ? "ゲストの編集を許可する"
      : "ゲストを閲覧専用にする";
  }
}

function positionCollabStatusPanel() {
  if (!els.collabStatusPanel || els.collabStatusPanel.hidden) return;
  const btn = collabStatusAnchorBtn || els.collabStatusBtn;
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const edge = 8;
  const width = els.collabStatusPanel.offsetWidth;
  const left = Math.max(edge, Math.min(rect.right - width, window.innerWidth - width - edge));
  els.collabStatusPanel.style.top = `${rect.bottom + 6}px`;
  els.collabStatusPanel.style.left = `${left}px`;
  els.collabStatusPanel.style.right = "auto";
}

function openCollabStatusPanel(anchorBtn) {
  if (!els.collabStatusPanel || !isCollabActive()) return;
  closeMemoFormatPanel();
  closeMemoSettingsPanel();
  closeNoteGridOverlay();
  closeNoteTodoPanel();
  collabStatusAnchorBtn = anchorBtn || els.collabStatusBtn;
  setCollabStatusHostMenuOpen(false);
  renderCollabStatusPanel();
  els.collabStatusPanel.hidden = false;
  collabStatusAnchorBtn?.setAttribute("aria-expanded", "true");
  positionCollabStatusPanel();
}

function closeCollabStatusPanel() {
  if (!els.collabStatusPanel || els.collabStatusPanel.hidden) return;
  els.collabStatusPanel.hidden = true;
  els.collabStatusBtn?.setAttribute("aria-expanded", "false");
  els.mindMapCollabStatusBtn?.setAttribute("aria-expanded", "false");
  collabStatusAnchorBtn = null;
  setCollabStatusHostMenuOpen(false);
}

function setCollabStatusHostMenuOpen(open) {
  if (els.collabStatusHostMenu) els.collabStatusHostMenu.hidden = !open;
  els.collabStatusHostMenuBtn?.setAttribute("aria-expanded", String(open));
}

function toggleCollabStatusPanel(anchorBtn) {
  if (els.collabStatusPanel?.hidden) openCollabStatusPanel(anchorBtn);
  else closeCollabStatusPanel();
}

// 4桁の数字をランダムに作る（例: 0483, 9217）。ホスト側の合言葉は
// これを自動生成し、ゲストはそれを聞いて入力するだけにする。
function generateCollabCode() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

function showCollabPassphrase(show) {
  if (els.appCollabShowPassphrase) els.appCollabShowPassphrase.checked = show;
  if (els.appCollabPassphrase) els.appCollabPassphrase.type = show ? "text" : "password";
}

function setCollabJoinRole(role) {
  state.collabJoinRole = normalizeCollabRole(role);
  const isHost = state.collabJoinRole === "host";
  els.appCollabHostBtn?.setAttribute("aria-pressed", String(isHost));
  els.appCollabGuestBtn?.setAttribute("aria-pressed", String(!isHost));
  if (els.appCollabJoinBtn) {
    els.appCollabJoinBtn.textContent = isHost ? "ホストとして開始" : "ゲストとして参加";
  }
  if (els.appCollabPassphraseLabel) {
    els.appCollabPassphraseLabel.textContent = isHost ? "合言葉（自動生成）" : "合言葉";
  }
  if (els.appCollabRegenerateBtn) els.appCollabRegenerateBtn.hidden = !isHost;
  if (els.appCollabPassphrase) {
    if (isHost) {
      els.appCollabPassphrase.value = generateCollabCode();
      showCollabPassphrase(true);
    } else {
      els.appCollabPassphrase.value = "";
      showCollabPassphrase(false);
    }
  }
}

function openAppCollab() {
  if (!els.appManagementDialog || !els.appCollabDialog) return;
  updateCollabUI();
  setCollabJoinRole(state.collabRoomRole || state.collabJoinRole || "host");
  setCollabError("");
  els.appManagementDialog.hidden = true;
  els.appCollabDialog.hidden = false;
  els.appCollabBtn?.setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => els.appCollabPassphrase?.focus());
}

function openAppCollabFromAnchor(anchor) {
  openAppManagement(anchor);
  openAppCollab();
}

function setCollabBusy(busy) {
  if (els.appCollabJoinBtn) els.appCollabJoinBtn.disabled = busy;
  if (els.appCollabLeaveBtn) els.appCollabLeaveBtn.disabled = busy;
  if (els.appCollabHostBtn) els.appCollabHostBtn.disabled = busy;
  if (els.appCollabGuestBtn) els.appCollabGuestBtn.disabled = busy;
  if (els.appCollabPassphrase) els.appCollabPassphrase.disabled = busy;
}

function stopWorkspaceSnapshots() {
  if (typeof state.notesUnsubscribe === "function") state.notesUnsubscribe();
  if (typeof state.mindMapsUnsubscribe === "function") state.mindMapsUnsubscribe();
  if (typeof state.presenceUnsubscribe === "function") state.presenceUnsubscribe();
  if (typeof state.roomUnsubscribe === "function") state.roomUnsubscribe();
  if (typeof state.selfMemberUnsubscribe === "function") state.selfMemberUnsubscribe();
  clearInterval(state.presenceHeartbeatTimer);
  clearTimeout(state.presenceWriteTimer);
  state.notesUnsubscribe = null;
  state.mindMapsUnsubscribe = null;
  state.presenceUnsubscribe = null;
  state.roomUnsubscribe = null;
  state.selfMemberUnsubscribe = null;
  state.presenceHeartbeatTimer = null;
  state.presenceWriteTimer = null;
  state.collabPresenceDraft = null;
  state.collabPresence = [];
  state.collabGuestsReadOnly = false;
  renderMindMapPresencePanel();
}

function isMemoEditorActive() {
  const active = document.activeElement;
  return active === els.titleInput || active === els.contentInput || els.contentInput?.contains(active);
}

function normalizeNoteDoc(doc) {
  const data = doc.data() || {};
  return { ...data, id: doc.id, locked: Boolean(data.locked) };
}

function selectFirstAvailableNote() {
  const roots = orderTreeChildren(null, getNotes().filter(n => n.parent_id === null));
  state.selectedId = roots.find(note => !isNoteAccessLocked(note.id))?.id ?? null;
}

// 相手がタイピング中でも、画像のサイズ変更・トリミングだけは
// data-media-id で対応づけて即座に反映する（本文テキストやキャレットは触らない）。
function mergeRemoteMediaIntoEditor(remoteContent) {
  const holder = document.createElement("div");
  holder.innerHTML = contentToHtml(remoteContent);
  const remoteFigures = holder.querySelectorAll(".inline-media-figure[data-media-id]");
  if (remoteFigures.length === 0) return false;

  const localFigures = new Map();
  els.contentInput.querySelectorAll(".inline-media-figure[data-media-id]").forEach(figure => {
    localFigures.set(figure.dataset.mediaId, figure);
  });
  if (localFigures.size === 0) return false;

  let changed = false;
  remoteFigures.forEach(remoteFigure => {
    const localFigure = localFigures.get(remoteFigure.dataset.mediaId);
    if (!localFigure) return;

    const remoteSize = remoteFigure.dataset.size || "";
    if ((localFigure.dataset.size || "") !== remoteSize) {
      if (remoteSize) localFigure.dataset.size = remoteSize;
      else delete localFigure.dataset.size;
      changed = true;
    }

    const remoteMedia = remoteFigure.querySelector(".inline-media");
    const localMedia = localFigure.querySelector(".inline-media");
    if (remoteMedia && localMedia && remoteMedia.tagName === localMedia.tagName) {
      const remoteSrc = remoteMedia.getAttribute("src") || "";
      if (remoteSrc && localMedia.getAttribute("src") !== remoteSrc) {
        localMedia.setAttribute("src", remoteSrc);
        changed = true;
      }
    }
  });
  return changed;
}

function captureMemoEditorCaret(noteId = state.selectedId) {
  if (!noteId || !isMemoEditorActive()) return null;
  if (document.activeElement === els.titleInput) {
    return {
      noteId,
      area: "title",
      start: els.titleInput.selectionStart ?? 0,
      end: els.titleInput.selectionEnd ?? els.titleInput.selectionStart ?? 0,
      direction: els.titleInput.selectionDirection || "none",
    };
  }
  if (els.contentInput.contains(document.activeElement)) {
    return {
      noteId,
      area: "content",
      offset: getCaretTextOffset(els.contentInput),
      scrollTop: els.contentInput.scrollTop,
      windowX: window.scrollX,
      windowY: window.scrollY,
    };
  }
  return null;
}

function restoreMemoEditorCaret(caret) {
  if (!caret || caret.noteId !== state.selectedId || !getSelectedNote()) return;

  if (caret.area === "title" && !els.titleInput.readOnly) {
    els.titleInput.focus({ preventScroll: true });
    const len = els.titleInput.value.length;
    const start = Math.max(0, Math.min(caret.start ?? 0, len));
    const end = Math.max(start, Math.min(caret.end ?? start, len));
    els.titleInput.setSelectionRange(start, end, caret.direction || "none");
    return;
  }

  if (caret.area !== "content" || els.contentInput.contentEditable === "false") return;
  els.contentInput.focus({ preventScroll: true });
  let range = resolveTextOffsetToRange(els.contentInput, caret.offset);
  if (!range) {
    range = document.createRange();
    range.selectNodeContents(els.contentInput);
    range.collapse(false);
  }
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  els.contentInput.scrollTop = caret.scrollTop ?? els.contentInput.scrollTop;
  if (Number.isFinite(caret.windowX) && Number.isFinite(caret.windowY)) {
    window.scrollTo(caret.windowX, caret.windowY);
  }
  updateMemoFormatUiFromSelection();
  updateActiveMediaCaretFromSelection();
  renderCollabCaretFlags();
}

function applyNotesSnapshot(snap) {
  if (!isCollabActive()) return;
  const previousSelectedId = state.selectedId;
  const editorCaret = captureMemoEditorCaret(previousSelectedId);
  const preserveEditor = Boolean(
    previousSelectedId &&
    isMemoEditorActive() &&
    hasUnsavedEditorChange()
  );

  state.data = { notes: snap.docs.map(normalizeNoteDoc) };
  if (!state.selectedId || !getSelectedNote() || isNoteAccessLocked(state.selectedId)) {
    selectFirstAvailableNote();
    if (previousSelectedId !== state.selectedId) setLargeEditorOpen(false);
  }

  renderTree();
  if (preserveEditor && previousSelectedId === state.selectedId && getSelectedNote()) {
    mergeRemoteMediaIntoEditor(getSelectedNote().content);
    els.saveStatus.textContent = "共同編集中...";
    updateUndoButton();
    return;
  }
  renderEditor();
  restoreMemoEditorCaret(editorCaret);
  updateUndoButton();
}

function isMindMapRemoteRenderBlocked() {
  return Boolean(
    state.mindMapEditSnapshot ||
    state.mindMapNodeDrag ||
    state.mindMapPanning ||
    state.isApplyingMindMapUndo ||
    isMindMapInlineNodeEditing()
  );
}

function applyMindMapsSnapshot(snap) {
  if (!isCollabActive()) return;
  const docs = snap.docs
    .map(doc => ({ id: doc.id, data: doc.data() }))
    .sort((a, b) => String(b.data.updated_at ?? "").localeCompare(String(a.data.updated_at ?? "")));
  state.mindMapList = docs.map(({ id, data }) => mapListEntryFromMindMap({ ...data, id }));

  if (!isMindMapRemoteRenderBlocked()) {
    const activeDoc = docs.find(doc => doc.id === state.mindMap?.id) ?? docs[0] ?? null;
    if (activeDoc) {
      state.mindMap = normalizeMindMap(activeDoc.data, activeDoc.id);
      state.mindMapSelectedId = state.mindMap.selected_node_id;
      state.mindMapLoaded = true;
      if (!els.mindMapOverlay.hidden) {
        renderMindMap();
        els.mindMapStatus.textContent = mindMapSavedStatus(state.mindMap);
      }
    } else if (state.mindMap) {
      state.mindMap = null;
      state.mindMapSelectedId = null;
      state.mindMapLoaded = false;
      clearMindMapUndoStack();
    }
  }

  if (!els.mindMapGridOverlay?.hidden) renderMindMapList();
}

function startWorkspaceSnapshots() {
  stopWorkspaceSnapshots();
  if (!isCollabActive()) return;
  state.notesUnsubscribe = notesCollection().onSnapshot(
    applyNotesSnapshot,
    err => showToast(translateCollabError(err, "共同メモの更新を受信できませんでした。")),
  );
  state.mindMapsUnsubscribe = mindMapsCollection().onSnapshot(
    applyMindMapsSnapshot,
    err => showToast(translateCollabError(err, "共同マップの更新を受信できませんでした。")),
  );
  state.presenceUnsubscribe = collabPresenceCollection()?.onSnapshot(
    applyPresenceSnapshot,
    err => showToast(translateCollabError(err, "共同編集メンバーの状態を受信できませんでした。")),
  ) || null;
  state.roomUnsubscribe = db.collection("collabRooms").doc(state.collabRoomId).onSnapshot(
    applyRoomSnapshot,
    () => {},
  );
  state.selfMemberUnsubscribe = db.collection("collabRooms").doc(state.collabRoomId)
    .collection("members").doc(state.uid)
    .onSnapshot(applySelfMemberSnapshot, () => {});
  startCollabPresenceHeartbeat();
}

async function readCurrentWorkspaceSeed(standaloneMindMapId = null) {
  // メモと同期していないマインドマップ単体を共有する場合は、そのマップだけを渡す。
  if (standaloneMindMapId) {
    const mapDoc = await mindMapsCollection().doc(standaloneMindMapId).get();
    const mindMaps = mapDoc.exists ? [{ id: mapDoc.id, ...cloneData(mapDoc.data()) }] : [];
    return { notes: [], mindMaps };
  }

  // 共同ルームには現在開いている親メモ（とその配下）だけを共有する。
  // 他の個人メモを参加者に見せないため、全メモは渡さない。
  const treeNotes = collectNoteSubtree(getSelectedRootNoteId());
  const notes = cloneData(treeNotes);
  const treeNoteIds = new Set(treeNotes.map(note => note.id));
  const mapsSnap = await mindMapsCollection().get();
  const mindMaps = mapsSnap.docs
    .map(doc => ({ id: doc.id, ...cloneData(doc.data()) }))
    .filter(map => map.source_note_id && treeNoteIds.has(map.source_note_id));
  return { notes, mindMaps };
}

async function writeSeedCollection(collectionRef, items) {
  const CHUNK = 450;
  for (let i = 0; i < items.length; i += CHUNK) {
    const batch = db.batch();
    items.slice(i, i + CHUNK).forEach(item => batch.set(collectionRef.doc(item.id), item));
    await batch.commit();
  }
}

async function seedCollabRoom(roomRef, seed) {
  if (seed.notes.length > 0) {
    await writeSeedCollection(roomRef.collection("notes"), seed.notes);
  }
  if (seed.mindMaps.length > 0) {
    await writeSeedCollection(roomRef.collection("mindmaps"), seed.mindMaps);
  }
}

// 共同作業から外れる時、共有していたメモとマインドマップ（同期状態を含む）を
// 個人メモ側へ書き戻す。キック後は共有ルームを読めないため、手元の状態も退避に使う。
function commitActiveMindMapInlineEdit() {
  const inlineMindMapEdit = els.mindMapNodes?.querySelector(".mindmap-node-edit");
  if (inlineMindMapEdit && document.activeElement === inlineMindMapEdit) {
    inlineMindMapEdit.blur();
  }
}

function captureCurrentCollabDraftsIntoLocalState() {
  if (!isCollabActive()) return;

  clearTimeout(state.saveTimer);
  state.saveTimer = null;
  const note = getSelectedNote();
  if (note && !_isComposing && !state.isApplyingUndo) {
    const next = snapshotFromEditor(note.id);
    if (!snapshotsEqual(snapshotFromNote(note), next)) {
      const content = String(next.content ?? "");
      note.title = (String(next.title ?? "").slice(0, 120) || "無題");
      note.content = content;
      note.media = pruneOrphanedMedia(note, content);
      note.updated_at = nowIso();
    }
  }

  commitActiveMindMapInlineEdit();
  clearTimeout(state.mindMapSaveTimer);
  state.mindMapSaveTimer = null;
  if (state.mindMap) {
    state.mindMap.updated_at = nowIso();
    state.mindMap.selected_node_id = state.mindMapSelectedId;
  }
}

function localCollabWorkspaceSnapshot() {
  const notes = cloneData(getNotes());
  const mindMapsById = new Map();
  if (state.mindMap?.id) {
    const serialized = serializeMindMap();
    if (serialized?.id) mindMapsById.set(serialized.id, cloneData(serialized));
  }
  return {
    notes,
    mindMaps: [...mindMapsById.values()],
  };
}

function mergeWorkspaceSnapshots(primary, fallback, preferFallbackIds = {}) {
  const notesById = new Map();
  const mindMapsById = new Map();
  const preferredNoteIds = new Set(preferFallbackIds.noteIds || []);
  const preferredMindMapIds = new Set(preferFallbackIds.mindMapIds || []);

  (primary?.notes || []).forEach(note => {
    if (note?.id) notesById.set(note.id, note);
  });
  (primary?.mindMaps || []).forEach(map => {
    if (map?.id) mindMapsById.set(map.id, map);
  });

  (fallback?.notes || []).forEach(note => {
    if (!note?.id) return;
    if (!notesById.has(note.id) || preferredNoteIds.has(note.id)) {
      notesById.set(note.id, note);
    }
  });
  (fallback?.mindMaps || []).forEach(map => {
    if (!map?.id) return;
    if (!mindMapsById.has(map.id) || preferredMindMapIds.has(map.id)) {
      mindMapsById.set(map.id, map);
    }
  });

  return {
    notes: [...notesById.values()],
    mindMaps: [...mindMapsById.values()],
  };
}

async function readCollabWorkspaceSnapshot(roomId) {
  if (!roomId) return { notes: [], mindMaps: [] };
  const roomRef = db.collection("collabRooms").doc(roomId);
  const [notesSnap, mapsSnap] = await Promise.all([
    roomRef.collection("notes").get(),
    roomRef.collection("mindmaps").get(),
  ]);
  return {
    notes: notesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    mindMaps: mapsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
  };
}

async function writeWorkspaceSnapshotToPersonal(snapshot) {
  if (!state.uid || !snapshot) return;
  const personalRoot = db.collection("users").doc(state.uid);
  const notes = Array.isArray(snapshot.notes) ? snapshot.notes.filter(item => item?.id) : [];
  const mindMaps = Array.isArray(snapshot.mindMaps) ? snapshot.mindMaps.filter(item => item?.id) : [];
  if (notes.length > 0) await writeSeedCollection(personalRoot.collection("notes"), notes);
  if (mindMaps.length > 0) await writeSeedCollection(personalRoot.collection("mindmaps"), mindMaps);
}

async function preserveCollabWorkspaceForPersonal(roomId, fallbackSnapshot = null, options = {}) {
  if (!roomId || !state.uid) return;
  let snapshot = null;
  try {
    snapshot = await readCollabWorkspaceSnapshot(roomId);
  } catch (err) {
    console.warn("[collab] 共有内容の読み取りに失敗したためローカル内容を退避します", err);
    snapshot = fallbackSnapshot;
  }
  const merged = snapshot && fallbackSnapshot
    ? mergeWorkspaceSnapshots(snapshot, fallbackSnapshot, options.preferFallbackIds)
    : (snapshot || fallbackSnapshot);
  await writeWorkspaceSnapshotToPersonal(merged);
}

function resetWorkspaceViewState() {
  clearTimeout(state.saveTimer);
  clearTimeout(state.mindMapSaveTimer);
  state.selectedId = null;
  state.expanded.clear();
  state.unlockedNoteIds.clear();
  state.undoStack = [];
  state.data = { notes: [] };
  setLargeEditorOpen(false);
  resetMindMapState();
  updateUndoButton();
}

async function reloadCurrentWorkspace() {
  resetWorkspaceViewState();
  await loadNotes();
  startWorkspaceSnapshots();
  updateCollabUI();
  updateCollabStatusUI();
  renderCollabCaretFlags();
}

async function joinCollabRoom(passphrase, requestedRole = state.collabJoinRole) {
  const normalized = normalizeCollabPassphrase(passphrase);
  const { hash, roomId: existingRoomId } = await collabRoomIdFromPassphrase(normalized);
  const role = normalizeCollabRole(requestedRole);
  if (existingRoomId && state.collabRoomId === existingRoomId) {
    showToast("この合言葉の共同ルームに参加中です。");
    return;
  }

  // マインドマップ単体（メモと同期していないもの）を開いている時にホストとして
  // 開始した場合は、そのマインドマップ自体を共有対象にする。閉じる前に判定する。
  const standaloneMindMapId = (!els.mindMapOverlay.hidden && state.mindMap
    && !(state.mindMap.sync_enabled && state.mindMap.source_note_id))
    ? state.mindMap.id
    : null;

  await saveCurrentEditorNow();
  if (!els.mindMapOverlay.hidden) await closeMindMapPanel();
  else if (state.mindMap) await saveMindMapNow();

  const isNewRoom = !existingRoomId;
  if (role === "guest" && isNewRoom) {
    throw new Error("この合言葉の共同ルームはまだありません。ホストに作成してもらってください。");
  }
  if (role === "host" && isNewRoom && !state.selectedId && !standaloneMindMapId) {
    throw new Error("共有したい親メモかマインドマップを開いてから、共同編集を開始してください。");
  }

  const seed = role === "host" ? await readCurrentWorkspaceSeed(standaloneMindMapId) : null;
  const roomId = existingRoomId || generateRandomRoomId();
  const roomRef = db.collection("collabRooms").doc(roomId);
  const roomSnap = isNewRoom ? null : await roomRef.get();
  const ts = nowIso();

  const roomData = roomSnap?.exists ? (roomSnap.data() || {}) : {};
  const currentHostUid = roomData.host_uid || roomData.created_by || null;
  if (role === "host" && currentHostUid && currentHostUid !== state.uid) {
    throw new Error("この合言葉は別のホストが使用中です。ゲストとして参加してください。");
  }

  if (role === "host") {
    const roomUpdates = {
      updated_at: ts,
      host_uid: state.uid,
      host_display_name: auth.currentUser?.displayName || "",
    };
    if (isNewRoom) Object.assign(roomUpdates, {
      created_at: ts,
      created_by: state.uid,
      label_hint: normalized.slice(0, 40),
    });
    await roomRef.set(roomUpdates, { merge: true });
    if (isNewRoom) {
      await db.collection("passphraseIndex").doc(hash).set({
        room_id: roomId,
        created_at: ts,
      });
    }
  }

  const memberRef = roomRef.collection("members").doc(state.uid);
  const existingMemberSnap = await memberRef.get();
  // joined_at は「最初に参加した時刻」として、再参加時も上書きしない
  // （退出時に先着順でホストを譲る判定に使うため）。
  const joinedAt = existingMemberSnap.exists ? (existingMemberSnap.data()?.joined_at ?? ts) : ts;

  await memberRef.set({
    uid: state.uid,
    role,
    display_name: auth.currentUser?.displayName || "",
    email: auth.currentUser?.email || "",
    joined_at: joinedAt,
    last_seen_at: ts,
  }, { merge: true });
  if (role === "host" && isNewRoom && seed) await seedCollabRoom(roomRef, seed);

  stopWorkspaceSnapshots();
  state.collabRoomId = roomId;
  state.collabRoomLabel = normalized;
  state.collabRoomRole = role;
  saveCollabRoom(roomId, normalized, role);
  await reloadCurrentWorkspace();
  showToast(role === "host"
    ? (isNewRoom ? "ホストとして共同ルームを作成しました。" : "ホストとして共同ルームに戻りました。")
    : "ゲストとして共同ルームに参加しました。");

  // 親メモが無い（マインドマップ単体を共有している）ルームでは、
  // 空のメモ画面ではなくそのマインドマップを直接開く。
  if (getNotes().length === 0) {
    if (standaloneMindMapId) {
      await openMindMapPanel();
    } else {
      const mapsSnap = await mindMapsCollection().get();
      if (!mapsSnap.empty) await openMindMapPanel();
    }
  }
}

async function transferCollabHost(newHostUid) {
  if (!state.collabRoomId || !newHostUid) return;
  await db.collection("collabRooms").doc(state.collabRoomId).set({
    host_uid: newHostUid,
    updated_at: nowIso(),
  }, { merge: true });
}

async function clearCollabHost() {
  if (!state.collabRoomId) return;
  await db.collection("collabRooms").doc(state.collabRoomId).set({
    host_uid: null,
    updated_at: nowIso(),
  }, { merge: true });
}

// 「指定せずに退出」時、今オンラインの参加者の中で一番先にこのルームへ
// 参加した人を次のホストにする。member.joined_at（初回参加時刻・再参加でも
// 上書きされない）で比較する。
async function pickEarliestJoinedCandidate() {
  const candidateUids = [...new Set(state.collabPresence.map(p => p.uid))];
  if (candidateUids.length === 0) return null;
  if (candidateUids.length === 1) return candidateUids[0];

  try {
    const membersRef = db.collection("collabRooms").doc(state.collabRoomId).collection("members");
    const snaps = await Promise.all(candidateUids.map(uid => membersRef.doc(uid).get()));
    let earliestUid = null;
    let earliestMs = Infinity;
    snaps.forEach(snap => {
      if (!snap.exists) return;
      const ms = Date.parse(snap.data()?.joined_at || "");
      if (Number.isFinite(ms) && ms < earliestMs) {
        earliestMs = ms;
        earliestUid = snap.id;
      }
    });
    return earliestUid || candidateUids[0];
  } catch {
    return candidateUids[0];
  }
}

// ── ホスト限定操作：退出せずにホストを譲る・ゲストを退出させる・
//    ルームを終了する・合言葉を作り直す ──────────────────────────────

async function requestTransferHostTo(member) {
  if (state.collabRoomRole !== "host" || !member?.uid || member.uid === state.uid) return;
  const name = presenceDisplayName(member);
  const ok = await showConfirm(
    `${name}さんをホストにしますか？あなたはゲストになります。`,
    "ホストにする",
  );
  if (!ok) return;
  try {
    await transferCollabHost(member.uid);
    showToast(`${name}さんをホストにしました。`);
  } catch (err) {
    showToast(translateCollabError(err, "ホストの引き継ぎに失敗しました。"));
  }
}

async function requestKickMember(member) {
  if (state.collabRoomRole !== "host" || !member?.uid || member.uid === state.uid) return;
  const name = presenceDisplayName(member);
  const ok = await showConfirm(`${name}さんを共同ルームから退出させますか？`, "退出させる");
  if (!ok) return;
  try {
    const roomRef = db.collection("collabRooms").doc(state.collabRoomId);
    await roomRef.collection("members").doc(member.uid).delete();
    await roomRef.collection("presence").doc(member.uid).delete().catch(() => {});
    showToast(`${name}さんを退出させました。`);
  } catch (err) {
    showToast(translateCollabError(err, "退出させる操作に失敗しました。"));
  }
}

async function requestEndCollabRoom() {
  if (state.collabRoomRole !== "host" || !state.collabRoomId) return;
  const ok = await showConfirm(
    "共同ルームを終了しますか？参加者全員が個人メモに戻ります。",
    "終了する",
  );
  if (!ok) return;
  try {
    const roomRef = db.collection("collabRooms").doc(state.collabRoomId);
    await roomRef.set({ ended_at: nowIso() }, { merge: true });
    const membersSnap = await roomRef.collection("members").get();
    const batch = db.batch();
    membersSnap.docs.forEach(doc => {
      if (doc.id !== state.uid) batch.delete(doc.ref);
    });
    await batch.commit();
    await leaveCollabRoom(null);
  } catch (err) {
    showToast(translateCollabError(err, "共同ルームの終了に失敗しました。"));
  }
}

async function requestRegenerateCollabPassphrase() {
  if (state.collabRoomRole !== "host" || !state.collabRoomId) return;
  const ok = await showConfirm(
    "合言葉を作り直しますか？今の参加者はそのまま残ります。古い合言葉では新しく参加できなくなります。",
    "作り直す",
  );
  if (!ok) return;
  try {
    const roomId = state.collabRoomId;
    const oldHash = await sha256Hex(`${COLLAB_HASH_PREFIX}${normalizeCollabPassphrase(state.collabRoomLabel)}`);

    // 4桁は最大10000通りしかないため、既に使われているコードと衝突しないか確認する
    let newCode = null;
    let newHash = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidateCode = generateCollabCode();
      const candidateHash = await sha256Hex(`${COLLAB_HASH_PREFIX}${candidateCode}`);
      const candidateSnap = await db.collection("passphraseIndex").doc(candidateHash).get();
      if (!candidateSnap.exists) {
        newCode = candidateCode;
        newHash = candidateHash;
        break;
      }
    }
    if (!newCode) {
      showToast("新しい合言葉の作成に失敗しました。もう一度お試しください。");
      return;
    }

    // 中身（メモ・マインドマップ・参加者）は同じルームのまま、
    // 合言葉のポインタだけを新しく作って古い方を消す。
    await db.collection("passphraseIndex").doc(newHash).set({
      room_id: roomId,
      created_at: nowIso(),
    });
    await db.collection("passphraseIndex").doc(oldHash).delete().catch(() => {});
    await db.collection("collabRooms").doc(roomId).set({
      label_hint: newCode,
      updated_at: nowIso(),
    }, { merge: true });

    state.collabRoomLabel = newCode;
    saveCollabRoom(roomId, newCode, "host");
    updateCollabUI();
    renderCollabStatusPanel();
    showToast(`合言葉を作り直しました。新しい合言葉: ${newCode}`);
  } catch (err) {
    showToast(translateCollabError(err, "合言葉の作り直しに失敗しました。"));
  }
}

async function requestToggleGuestsReadOnly() {
  if (state.collabRoomRole !== "host" || !state.collabRoomId) return;
  const next = !state.collabGuestsReadOnly;
  try {
    await db.collection("collabRooms").doc(state.collabRoomId).set({
      guests_read_only: next,
      updated_at: nowIso(),
    }, { merge: true });
    state.collabGuestsReadOnly = next;
    showToast(next ? "ゲストを閲覧専用にしました。" : "ゲストの編集を許可しました。");
    renderCollabStatusPanel();
    renderEditor();
    if (state.mindMap && !els.mindMapOverlay?.hidden) renderMindMap();
  } catch (err) {
    showToast(translateCollabError(err, "設定の変更に失敗しました。"));
  }
}

async function leaveCollabRoom(newHostUid = null) {
  if (!isCollabActive()) return;
  const roomId = state.collabRoomId;
  const uid = state.uid;
  commitActiveMindMapInlineEdit();
  await saveCurrentEditorNow();
  if (!els.mindMapOverlay.hidden) await closeMindMapPanel();
  else if (state.mindMap) await saveMindMapNow();
  const fallbackSnapshot = localCollabWorkspaceSnapshot();
  await preserveCollabWorkspaceForPersonal(roomId, fallbackSnapshot, {
    preferFallbackIds: {
      noteIds: state.selectedId ? [state.selectedId] : [],
      mindMapIds: state.mindMap?.id ? [state.mindMap.id] : [],
    },
  });
  if (state.collabRoomRole === "host") {
    if (newHostUid) await transferCollabHost(newHostUid);
    else await clearCollabHost();
  }
  await clearCollabPresence(roomId, uid);
  stopWorkspaceSnapshots();
  await db.collection("collabRooms").doc(roomId).collection("members").doc(uid)
    .delete()
    .catch(err => console.warn("[collab] member削除に失敗しました", err));
  clearSavedCollabRoom();
  state.collabRoomId = null;
  state.collabRoomLabel = "";
  state.collabRoomRole = null;
  await reloadCurrentWorkspace();
  showToast("個人メモへ戻りました。");
}

function openHostTransferDialog() {
  if (!els.hostTransferOverlay || !els.hostTransferList) return;
  els.hostTransferList.innerHTML = "";
  state.collabPresence.forEach(presence => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "host-transfer-candidate";

    const avatar = document.createElement("span");
    avatar.className = "collab-presence-avatar";
    avatar.textContent = presenceInitials(presence);

    const info = document.createElement("span");
    info.className = "host-transfer-candidate-info";
    const name = document.createElement("span");
    name.className = "host-transfer-candidate-name";
    name.textContent = presenceDisplayName(presence);
    const meta = document.createElement("span");
    meta.className = "host-transfer-candidate-meta";
    meta.textContent = collabRoleLabel(presence.role);
    info.append(name, meta);

    btn.append(avatar, info);
    btn.addEventListener("click", () => {
      closeHostTransferDialog();
      leaveCollabRoomFlow(presence.uid);
    });
    li.appendChild(btn);
    els.hostTransferList.appendChild(li);
  });
  els.hostTransferOverlay.hidden = false;
}

function closeHostTransferDialog() {
  if (els.hostTransferOverlay) els.hostTransferOverlay.hidden = true;
}

async function leaveCollabRoomFlow(newHostUid = null) {
  try {
    await leaveCollabRoom(newHostUid);
  } catch (err) {
    showToast(translateCollabError(err, "個人メモへ戻れませんでした。"));
  }
}

// ホストが退出する時、他に参加者がいれば先に引き継ぎ先を選んでもらう。
function confirmLeaveCollabRoom() {
  if (state.collabRoomRole === "host" && state.collabPresence.length > 0) {
    openHostTransferDialog();
    return;
  }
  return leaveCollabRoomFlow(null);
}

async function restoreSavedCollabRoom(uid) {
  const saved = getSavedCollabRoom(uid);
  if (!saved) return false;
  state.collabRoomId = saved.roomId;
  state.collabRoomLabel = saved.label || "共同ルーム";
  state.collabRoomRole = saved.role || "guest";
  return true;
}

async function loadSignedInWorkspace(user) {
  const changedUser = state.uid !== user.uid;
  if (changedUser) {
    void clearCollabPresence();
    stopWorkspaceSnapshots();
    state.unlockedNoteIds.clear();
    state.collabRoomId = null;
    state.collabRoomLabel = "";
    state.collabRoomRole = null;
    state.todos = [];
    resetMindMapState();
  }
  state.uid = user.uid;
  await restoreSavedCollabRoom(user.uid);
  await restorePersonalWorkspaceIfSavedCollabIsStale(user.uid);
  [state.templates, state.mindMapTemplates, state.todos] = await Promise.all([
    ensureOfficialTemplates(user.uid),
    ensureOfficialMindMapTemplates(user.uid),
    loadTodos(),
  ]);
  updateTodoButton();
  await reloadCurrentWorkspace();
}

function openAppManagement(anchor) {
  closeMemoSettingsPanel();
  closeMemoFormatPanel();
  closeNoteGridOverlay();
  closeNoteTodoPanel();
  closeMindMapSettingsPanel();
  closeMindMapNodeSettingsPanel();
  closeMindMapListPanel();
  closeMobileMenu();
  hideCtxMenu();
  hideMediaCtxMenu();
  hideMindMapCtxMenu();
  if (els.accountMenu) els.accountMenu.hidden = true;

  managementReturnFocus = anchor || null;
  managementHowToMode = [els.mindMapManageBtn, els.mindMapAccountBtn].includes(anchor)
    ? "mindmap"
    : "memo";
  showAppManagementHome();
  els.appManagementOverlay.hidden = false;
  document.body.classList.add("has-management-open");
  els.appManageBtn?.setAttribute("aria-expanded", String(anchor === els.appManageBtn));
  els.memoCollabBtn?.setAttribute("aria-expanded", String(anchor === els.memoCollabBtn));
  els.mindMapManageBtn?.setAttribute("aria-expanded", String(anchor === els.mindMapManageBtn));
  els.accountBtn?.setAttribute("aria-expanded", String(anchor === els.accountBtn));
  els.mindMapAccountBtn?.setAttribute("aria-expanded", String(anchor === els.mindMapAccountBtn));
  requestAnimationFrame(() => els.appManagementClose?.focus());
}

function closeAppManagement() {
  if (!els.appManagementOverlay || els.appManagementOverlay.hidden) return;
  els.appManagementOverlay.hidden = true;
  showAppManagementHome();
  document.body.classList.remove("has-management-open");
  els.appManageBtn?.setAttribute("aria-expanded", "false");
  els.memoCollabBtn?.setAttribute("aria-expanded", "false");
  els.mindMapManageBtn?.setAttribute("aria-expanded", "false");
  els.accountBtn?.setAttribute("aria-expanded", "false");
  els.mindMapAccountBtn?.setAttribute("aria-expanded", "false");
  const returnFocus = managementReturnFocus;
  managementReturnFocus = null;
  returnFocus?.focus();
}

els.appManageBtn?.addEventListener("click", () => openAppManagement(els.appManageBtn));
els.mindMapManageBtn?.addEventListener("click", () => openAppManagement(els.mindMapManageBtn));
els.appManagementClose?.addEventListener("click", closeAppManagement);
els.appHowToBtn?.addEventListener("click", openAppHowTo);
els.appHowToBack?.addEventListener("click", () => showAppManagementHome(true));
els.appHowToClose?.addEventListener("click", closeAppManagement);
els.appNoteHowToTab?.addEventListener("click", () => showAppHowToView("memo", true));
els.appMindMapHowToTab?.addEventListener("click", () => showAppHowToView("mindmap", true));
els.appDataInfoBtn?.addEventListener("click", () => openAppInfo("data"));
els.memoCollabBtn?.addEventListener("click", () => openAppCollabFromAnchor(els.memoCollabBtn));
els.appCollabBtn?.addEventListener("click", openAppCollab);
els.appCollabBack?.addEventListener("click", () => showAppManagementHome(true));
els.appCollabClose?.addEventListener("click", closeAppManagement);
els.appCollabHostBtn?.addEventListener("click", () => setCollabJoinRole("host"));
els.appCollabGuestBtn?.addEventListener("click", () => setCollabJoinRole("guest"));
els.appCollabRegenerateBtn?.addEventListener("click", () => {
  if (!els.appCollabPassphrase) return;
  els.appCollabPassphrase.value = generateCollabCode();
  showCollabPassphrase(true);
  els.appCollabPassphrase.focus();
});
els.appCollabShowPassphrase?.addEventListener("change", () => {
  if (els.appCollabPassphrase) {
    els.appCollabPassphrase.type = els.appCollabShowPassphrase.checked ? "text" : "password";
  }
});
els.appCollabForm?.addEventListener("submit", async e => {
  e.preventDefault();
  setCollabError("");
  setCollabBusy(true);
  try {
    await joinCollabRoom(els.appCollabPassphrase?.value || "", state.collabJoinRole);
    updateCollabUI();
    if (els.appCollabPassphrase) els.appCollabPassphrase.value = "";
  } catch (err) {
    setCollabError(translateCollabError(err));
  } finally {
    setCollabBusy(false);
  }
});
els.appCollabLeaveBtn?.addEventListener("click", async () => {
  setCollabError("");
  setCollabBusy(true);
  try {
    await confirmLeaveCollabRoom();
    updateCollabUI();
  } catch (err) {
    setCollabError(translateCollabError(err, "個人メモへ戻れませんでした。"));
  } finally {
    setCollabBusy(false);
  }
});
els.collabStatusBtn?.addEventListener("click", () => toggleCollabStatusPanel(els.collabStatusBtn));
els.mindMapCollabStatusBtn?.addEventListener("click", () => toggleCollabStatusPanel(els.mindMapCollabStatusBtn));
els.collabStatusClose?.addEventListener("click", closeCollabStatusPanel);
els.collabStatusSettingsBtn?.addEventListener("click", () => {
  const inMindMap = !els.mindMapOverlay?.hidden;
  closeCollabStatusPanel();
  openAppCollabFromAnchor(inMindMap ? els.mindMapManageBtn : els.appManageBtn);
});
els.collabStatusLeaveBtn?.addEventListener("click", async () => {
  els.collabStatusLeaveBtn.disabled = true;
  try {
    closeCollabStatusPanel();
    await confirmLeaveCollabRoom();
  } catch (err) {
    showToast(translateCollabError(err, "個人メモへ戻れませんでした。"));
  } finally {
    if (els.collabStatusLeaveBtn) els.collabStatusLeaveBtn.disabled = false;
  }
});
els.collabStatusHostMenuBtn?.addEventListener("click", () => {
  setCollabStatusHostMenuOpen(Boolean(els.collabStatusHostMenu?.hidden));
});
els.collabStatusReadOnlyBtn?.addEventListener("click", requestToggleGuestsReadOnly);
els.collabStatusRegenerateBtn?.addEventListener("click", () => {
  closeCollabStatusPanel();
  requestRegenerateCollabPassphrase();
});
els.collabStatusEndRoomBtn?.addEventListener("click", () => {
  closeCollabStatusPanel();
  requestEndCollabRoom();
});
els.hostTransferSkipBtn?.addEventListener("click", async () => {
  closeHostTransferDialog();
  const nextHostUid = await pickEarliestJoinedCandidate();
  leaveCollabRoomFlow(nextHostUid);
});
els.hostTransferCancelBtn?.addEventListener("click", closeHostTransferDialog);
els.hostTransferOverlay?.addEventListener("click", e => {
  if (e.target === els.hostTransferOverlay) closeHostTransferDialog();
});

els.appAccountBtn?.addEventListener("click", openAppAccount);
els.appAccountBack?.addEventListener("click", () => showAppManagementHome(true));
els.appAccountClose?.addEventListener("click", closeAppManagement);
els.appCreatorInfoBtn?.addEventListener("click", () => openAppInfo("creator"));
els.appContactBtn?.addEventListener("click", () => openAppInfo("contact"));
els.appInfoBack?.addEventListener("click", () => showAppManagementHome(true));
els.appInfoClose?.addEventListener("click", closeAppManagement);
els.appManagementOverlay?.addEventListener("click", e => {
  if (e.target === els.appManagementOverlay) closeAppManagement();
});

function suppressTreeClickAfterDrag() {
  state.suppressTreeClickUntil = Date.now() + 700;
}

function shouldSuppressTreeClick() {
  return Date.now() < state.suppressTreeClickUntil;
}

function isTreeToggleClick(e, row, toggle, hasKids) {
  if (!hasKids) return false;
  if (e.target === toggle || toggle.contains(e.target)) return true;
  if (!isMobileMenuLayout()) return false;

  const rowRect = row.getBoundingClientRect();
  const toggleRect = toggle.getBoundingClientRect();
  const hitRight = Math.max(toggleRect.right, rowRect.left + 56);
  return e.clientX >= rowRect.left && e.clientX <= hitRight;
}

function setButtonContent(button, icon, label = "") {
  if (!button) return;
  button.innerHTML = `<span class="btn-icon" aria-hidden="true">${icon}</span>` +
                     (label ? `<span class="btn-label">${label}</span>` : "");
}

const SYNC_PAIR_STYLES = [
  { color: "#2563eb", soft: "#dbeafe" },
  { color: "#7c3aed", soft: "#ede9fe" },
  { color: "#0f766e", soft: "#ccfbf1" },
  { color: "#c2410c", soft: "#ffedd5" },
  { color: "#be185d", soft: "#fce7f3" },
  { color: "#0369a1", soft: "#e0f2fe" },
  { color: "#4338ca", soft: "#e0e7ff" },
  { color: "#4d7c0f", soft: "#ecfccb" },
  { color: "#a21caf", soft: "#fae8ff" },
  { color: "#92400e", soft: "#fef3c7" },
];

function getSyncPairStyle(mapId) {
  const value = String(mapId || "");
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = ((hash * 31) + value.charCodeAt(i)) | 0;
  const index = Math.abs(hash) % SYNC_PAIR_STYLES.length;
  return { ...SYNC_PAIR_STYLES[index], label: `同期` };
}

function applySyncPairStyle(element, mapId, enabled = true) {
  if (!element) return;
  element.classList.toggle("is-synced", Boolean(enabled && mapId));
  if (!enabled || !mapId) {
    element.style.removeProperty("--sync-pair-color");
    element.style.removeProperty("--sync-pair-soft");
    return;
  }
  const style = getSyncPairStyle(mapId);
  element.style.setProperty("--sync-pair-color", style.color);
  element.style.setProperty("--sync-pair-soft", style.soft);
}

function createSyncPairBadge(mapId, title = "") {
  const style = getSyncPairStyle(mapId);
  const badge = document.createElement("span");
  badge.className = "sync-pair-badge";
  badge.textContent = style.label;
  badge.title = title || `${style.label}の同期ペア`;
  badge.setAttribute("aria-label", badge.title);
  applySyncPairStyle(badge, mapId);
  return badge;
}

function getSyncSourceNoteIdForMap(mapId) {
  if (!mapId) return null;
  if (state.mindMap?.id === mapId && state.mindMap.sync_enabled) {
    return state.mindMap.source_note_id || null;
  }
  const entry = state.mindMapList?.find(map => map.id === mapId);
  return entry?.sync_enabled ? (entry.source_note_id || null) : null;
}

function isNoteSyncDisplayRoot(note) {
  if (!note?.linked_mindmap_id) return false;
  const sourceNoteId = getSyncSourceNoteIdForMap(note.linked_mindmap_id);
  if (sourceNoteId) return note.id === sourceNoteId;
  return note.parent_id === null;
}

function getNoteSyncDisplayMapId(note) {
  return isNoteSyncDisplayRoot(note) ? note.linked_mindmap_id : null;
}

function isImeComposing(e, localFlag = false) {
  return Boolean(localFlag || e?.isComposing || e?.keyCode === 229);
}

// ── Confirm modal ─────────────────────────────────────────────────────────────

let _confirmResolve = null;
let _confirmExtraResult = "add";

function showConfirm(message, okLabel = "削除") {
  document.getElementById("confirmMsg").textContent = message;
  document.getElementById("confirmOk").textContent  = okLabel;
  document.getElementById("confirmExtra").hidden = true;
  _confirmExtraResult = "add";
  els.confirmOverlay.classList.add("open");
  requestAnimationFrame(() => document.getElementById("confirmOk").focus());
  return new Promise(r => { _confirmResolve = r; });
}

function showReplaceMindMapConfirm(message) {
  document.getElementById("confirmMsg").textContent = message;
  document.getElementById("confirmOk").textContent = "置き換え";
  const extra = document.getElementById("confirmExtra");
  extra.textContent = "無視して追加";
  extra.hidden = false;
  _confirmExtraResult = "add";
  els.confirmOverlay.classList.add("open");
  requestAnimationFrame(() => document.getElementById("confirmOk").focus());
  return new Promise(r => { _confirmResolve = r; });
}

function showSyncedDeleteConfirm(message, currentOnlyLabel) {
  document.getElementById("confirmMsg").textContent = message;
  document.getElementById("confirmOk").textContent = "同期先も削除";
  const extra = document.getElementById("confirmExtra");
  extra.textContent = currentOnlyLabel;
  extra.hidden = false;
  _confirmExtraResult = "current-only";
  els.confirmOverlay.classList.add("open");
  requestAnimationFrame(() => document.getElementById("confirmOk").focus());
  return new Promise(r => { _confirmResolve = r; });
}

function resolveConfirm(result) {
  els.confirmOverlay.classList.remove("open");
  document.getElementById("confirmExtra").hidden = true;
  if (_confirmResolve) { const r = _confirmResolve; _confirmResolve = null; r(result); }
}

(function initConfirmModal() {
  document.getElementById("confirmOk")    .addEventListener("click", () => resolveConfirm(true));
  document.getElementById("confirmExtra") .addEventListener("click", () => resolveConfirm(_confirmExtraResult));
  document.getElementById("confirmCancel").addEventListener("click", () => resolveConfirm(false));
  els.confirmOverlay.addEventListener("click", e => {
    if (e.target === els.confirmOverlay) resolveConfirm(false);
  });
})();

// ── 鍵付きメモのパスワード確認 ────────────────────────────────────────────────

let _noteLockResolve = null;
let _noteLockBusy = false;

function noteLockAuthError(err) {
  if (["auth/wrong-password", "auth/invalid-credential"].includes(err?.code)) {
    return "パスワードが正しくありません。";
  }
  return translateAuthError(err);
}

async function verifyCurrentAccountPassword(password) {
  const user = auth?.currentUser;
  if (!user?.email) throw new Error("ログイン中のアカウントを確認できません。");
  const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
  await user.reauthenticateWithCredential(credential);
}

function closeNoteLockPrompt(result = false) {
  if (_noteLockBusy && !result) return;
  els.noteLockOverlay.hidden = true;
  els.noteLockPassword.value = "";
  els.noteLockPassword.type = "password";
  els.noteLockShowPassword.checked = false;
  els.noteLockError.hidden = true;
  els.noteLockSubmit.disabled = false;
  els.noteLockCancel.disabled = false;
  _noteLockBusy = false;
  if (_noteLockResolve) {
    const resolve = _noteLockResolve;
    _noteLockResolve = null;
    resolve(Boolean(result));
  }
}

function requestAccountPassword({ title, message, submitLabel }) {
  if (_noteLockResolve) closeNoteLockPrompt(false);
  els.noteLockTitle.textContent = title;
  els.noteLockMessage.textContent = message;
  els.noteLockSubmit.textContent = submitLabel;
  els.noteLockError.hidden = true;
  els.noteLockOverlay.hidden = false;
  requestAnimationFrame(() => els.noteLockPassword.focus());
  return new Promise(resolve => { _noteLockResolve = resolve; });
}

els.noteLockForm.addEventListener("submit", async e => {
  e.preventDefault();
  if (_noteLockBusy) return;
  let password = els.noteLockPassword.value;
  if (!password) {
    els.noteLockError.textContent = "パスワードを入力してください。";
    els.noteLockError.hidden = false;
    return;
  }

  _noteLockBusy = true;
  els.noteLockSubmit.disabled = true;
  els.noteLockCancel.disabled = true;
  els.noteLockError.hidden = true;
  try {
    await verifyCurrentAccountPassword(password);
    closeNoteLockPrompt(true);
  } catch (err) {
    els.noteLockError.textContent = noteLockAuthError(err);
    els.noteLockError.hidden = false;
    els.noteLockPassword.select();
  } finally {
    password = "";
    if (!els.noteLockOverlay.hidden) {
      _noteLockBusy = false;
      els.noteLockSubmit.disabled = false;
      els.noteLockCancel.disabled = false;
    }
  }
});

els.noteLockCancel.addEventListener("click", () => closeNoteLockPrompt(false));
els.noteLockShowPassword.addEventListener("change", () => {
  els.noteLockPassword.type = els.noteLockShowPassword.checked ? "text" : "password";
});
els.noteLockOverlay.addEventListener("click", e => {
  if (e.target === els.noteLockOverlay) closeNoteLockPrompt(false);
});

// ── Googleログインと既存のメール/パスワード登録の連携 ──────────────────────
// 同じメールアドレスで既にパスワード登録済みの場合、Firestoreは既存のuidと
// 紐づいているため、Googleで新規サインインさせるとメモが全く別（空）の
// アカウントに見えてしまう。そこで既存パスワードで一度サインインしてから
// Google認証情報を連携し、同じuid・同じデータのまま今後どちらでも
// ログインできるようにする。
let _googleLinkPendingCred = null;
let _googleLinkEmail = null;
let _googleLinkBusy = false;

function getGoogleCredentialFromAuthError(err) {
  return err?.credential
    || firebase.auth.GoogleAuthProvider.credentialFromError?.(err)
    || null;
}

function createGoogleAuthProvider() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

function handleGoogleSignInError(err) {
  if (err?.code === "auth/account-exists-with-different-credential") {
    // 同じメールで既にパスワード登録済み。新規の別アカウントにはせず、
    // 既存アカウントへGoogleを連携できるよう促す（データを保持するため）。
    const email = err.email || err.customData?.email || null;
    const pendingCred = getGoogleCredentialFromAuthError(err);
    if (email && pendingCred) {
      requestGoogleAccountLink(email, pendingCred);
    } else {
      showAuthError(translateAuthError(err));
    }
    return;
  }

  if (err?.code !== "auth/popup-closed-by-user" && err?.code !== "auth/cancelled-popup-request") {
    showAuthError(translateAuthError(err));
  }
}

async function handleGoogleRedirectResult() {
  try {
    await auth.getRedirectResult();
  } catch (err) {
    handleGoogleSignInError(err);
  }
}

async function continueAfterGoogleLink(user) {
  if (!user) return;
  await user.reload();
  updateAccountUI(user);
  if (!user.emailVerified) {
    showVerificationScreen(user);
    return;
  }
  showApp();
  if (state.uid !== user.uid || !state.data) {
    try {
      await loadSignedInWorkspace(user);
    } catch (e) { showToast(e.message); }
  }
}

function requestGoogleAccountLink(email, pendingCred) {
  _googleLinkEmail = email;
  _googleLinkPendingCred = pendingCred;
  els.googleLinkMessage.textContent =
    `${email} は既にパスワードで登録されています。パスワードを入力すると、今のメモを引き継いだまま、次回からGoogleでもログインできるようになります。`;
  els.googleLinkPassword.value = "";
  els.googleLinkError.hidden = true;
  els.googleLinkOverlay.hidden = false;
  requestAnimationFrame(() => els.googleLinkPassword.focus());
}

function closeGoogleLinkPrompt() {
  if (_googleLinkBusy) return;
  els.googleLinkOverlay.hidden = true;
  els.googleLinkPassword.value = "";
  _googleLinkPendingCred = null;
  _googleLinkEmail = null;
}

els.googleLinkForm.addEventListener("submit", async e => {
  e.preventDefault();
  if (_googleLinkBusy) return;
  const password = els.googleLinkPassword.value;
  if (!password) {
    els.googleLinkError.textContent = "パスワードを入力してください。";
    els.googleLinkError.hidden = false;
    return;
  }
  _googleLinkBusy = true;
  els.googleLinkSubmit.disabled = true;
  els.googleLinkCancel.disabled = true;
  els.googleLinkError.hidden = true;
  try {
    const cred = await auth.signInWithEmailAndPassword(_googleLinkEmail, password);
    const linkedCred = await cred.user.linkWithCredential(_googleLinkPendingCred);
    const linkedUser = linkedCred?.user || cred.user;
    const linkedEmail = _googleLinkEmail;
    els.googleLinkOverlay.hidden = true;
    els.googleLinkPassword.value = "";
    _googleLinkPendingCred = null;
    _googleLinkEmail = null;
    showToast(`${linkedEmail} にGoogleアカウントを連携しました。`);
    await continueAfterGoogleLink(linkedUser);
  } catch (err) {
    els.googleLinkError.textContent = translateAuthError(err);
    els.googleLinkError.hidden = false;
    els.googleLinkPassword.select();
  } finally {
    _googleLinkBusy = false;
    els.googleLinkSubmit.disabled = false;
    els.googleLinkCancel.disabled = false;
  }
});
els.googleLinkCancel.addEventListener("click", closeGoogleLinkPrompt);
els.googleLinkShowPassword?.addEventListener("change", () => {
  els.googleLinkPassword.type = els.googleLinkShowPassword.checked ? "text" : "password";
});
els.googleLinkOverlay.addEventListener("click", e => {
  if (e.target === els.googleLinkOverlay) closeGoogleLinkPrompt();
});

// ── ローカルヘルパー（ID・日時・コレクション参照）──────────────────────────────────

function makeId() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
}

function nowIso(d = new Date()) {
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
         `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function nowSortableIso() {
  return new Date().toISOString();
}

function isCollabActive() {
  return Boolean(state.collabRoomId);
}

// 共同ルームは親メモ1件だけを共有する設計のため、共同作業中は新しい
// 親メモを追加できないようにする。ブロックした場合はtrueを返す。
function blockNewRootMemoInCollab() {
  if (!isCollabActive()) return false;
  showToast("共同作業中は新しい親メモを追加できません。");
  return true;
}

// 共同ルームは1つのマインドマップ（共有中の親メモと同期したもの）だけを
// 扱う設計のため、共同作業中は無関係な新規マインドマップを追加できないようにする。
function blockNewMindMapInCollab() {
  if (!isCollabActive()) return false;
  showToast("共同作業中は新しいマインドマップを追加できません。");
  return true;
}

// 親メモ（共有ルート）の名前はホストだけが変更できる。子メモは誰でも変更できる。
function canEditNoteTitle(note) {
  if (!isCollabActive() || !note) return true;
  if (note.parent_id !== null) return true;
  return state.collabRoomRole === "host";
}

// マインドマップ自体の名前は、親メモの名前と同様に共同作業中はホストだけが変更できる。
// ノードのタイトル・メモは誰でも編集できる（子メモと同じ扱い）。
function canEditMindMapTitle() {
  if (!isCollabActive()) return true;
  return state.collabRoomRole === "host";
}

function blockRootRenameForGuest(note) {
  if (canEditNoteTitle(note)) return false;
  showToast("共同作業中、親メモの名前を変更できるのはホストだけです。");
  return true;
}

// マインドマップとの同期（どちらの方向でも）は共同作業中はホストだけができる。
function blockMindMapSyncForGuest() {
  if (!isCollabActive() || state.collabRoomRole === "host") return false;
  showToast("共同作業中、マインドマップとの同期はホストだけができます。");
  return true;
}

// ホストが「ゲストを閲覧専用」にしている間、ゲスト側の編集操作を止める。
function isGuestReadOnly() {
  return isCollabActive() && state.collabRoomRole === "guest" && state.collabGuestsReadOnly;
}

function blockIfGuestReadOnly() {
  if (!isGuestReadOnly()) return false;
  showToast("ホストが閲覧専用に設定しているため編集できません。");
  return true;
}

function currentWorkspaceRootRef() {
  if (isCollabActive()) {
    return db.collection("collabRooms").doc(state.collabRoomId);
  }
  return db.collection("users").doc(state.uid);
}

function notesCollection() {
  return currentWorkspaceRootRef().collection("notes");
}

function templatesCollection() {
  return db.collection("users").doc(state.uid).collection("templates");
}

function mindMapTemplatesCollection() {
  return db.collection("users").doc(state.uid).collection("mindMapTemplates");
}

function todosCollection() {
  return db.collection("users").doc(state.uid).collection("todos");
}

async function loadTodos() {
  const snap = await todosCollection().get();
  return snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
}

function mindMapsCollection() {
  return currentWorkspaceRootRef().collection("mindmaps");
}

function mediaStoragePrefix() {
  if (isCollabActive()) return `collabRooms/${state.collabRoomId}/media`;
  return `users/${state.uid}/media`;
}

// ── 階層・並び順ヘルパー ─────────────────────────────────────────────────────────

function wouldCreateCycle(notes, noteId, newParentId) {
  if (newParentId === null) return false;
  let current = newParentId;
  while (current !== null) {
    if (current === noteId) return true;
    const parent = notes.find(n => n.id === current);
    current = parent ? parent.parent_id : null;
  }
  return false;
}

const ORDER_EPSILON = 1e-9;

function siblingsOf(parentId, excludeId = null) {
  return getChildren(parentId).filter(n => n.id !== excludeId);
}

function nextOrderForNewNote(parentId) {
  const siblings = siblingsOf(parentId);
  return siblings.length > 0 ? (siblings[siblings.length - 1].order ?? 0) + 1000 : 1000;
}

async function renumberSiblings(parentId) {
  const siblings = siblingsOf(parentId);
  const batch = db.batch();
  const ref   = notesCollection();
  siblings.forEach((n, i) => {
    const order = (i + 1) * 1000;
    n.order = order;
    batch.set(ref.doc(n.id), { order }, { merge: true });
  });
  await batch.commit();
}

async function orderForReorder(noteId, beforeId, parentId) {
  const siblings = siblingsOf(parentId, noteId);
  let order;

  if (!beforeId) {
    order = siblings.length > 0 ? (siblings[siblings.length - 1].order ?? 0) + 1000 : 1000;
  } else {
    const idx = siblings.findIndex(n => n.id === beforeId);
    if (idx === -1) {
      order = siblings.length > 0 ? (siblings[siblings.length - 1].order ?? 0) + 1000 : 1000;
    } else if (idx === 0) {
      order = (siblings[0].order ?? 1000) / 2;
    } else {
      order = ((siblings[idx - 1].order ?? 0) + (siblings[idx].order ?? 0)) / 2;
    }
  }

  const collides = siblings.some(n => Math.abs((n.order ?? 0) - order) < ORDER_EPSILON);
  if (collides) {
    await renumberSiblings(parentId);
    return orderForReorder(noteId, beforeId, parentId);
  }
  return order;
}

// ── テンプレートヘルパー ─────────────────────────────────────────────────────────

const OFFICIAL_TEMPLATE_TIMESTAMP    = "2026-06-10T00:00:00";
const RETIRED_OFFICIAL_TEMPLATE_IDS  = new Set(["official-todo", "official-diary"]);

const OFFICIAL_TEMPLATES = [
  {
    id:         "official-dev-note",
    name:       "開発メモ",
    official:   true,
    created_at: OFFICIAL_TEMPLATE_TIMESTAMP,
    updated_at: OFFICIAL_TEMPLATE_TIMESTAMP,
    tree: {
      title:    "開発メモ",
      content:  "開発中のアイデア、実装、改善案をまとめるテンプレートです。",
      children: [
        { title: "アイデア",     content: "今後実装したいものや、思いついたことを書き留めます。", children: [] },
        { title: "改善案",       content: "使いにくい点や、直したい挙動を書き留めます。", children: [] },
        { title: "リリースメモ", content: "公開前に確認することや、変更点をまとめます。", children: [] },
      ],
    },
  },
];

// ── マインドマップ テンプレート定数 ───────────────────────────────────────────────

const OFFICIAL_MM_TEMPLATE_TIMESTAMP   = "2026-06-16T00:00:00";
const RETIRED_OFFICIAL_MM_TEMPLATE_IDS = new Set([]);

const OFFICIAL_MM_TEMPLATES = [
  {
    id:         "official-mm-idea",
    name:       "アイデア",
    official:   true,
    created_at: OFFICIAL_MM_TEMPLATE_TIMESTAMP,
    updated_at: OFFICIAL_MM_TEMPLATE_TIMESTAMP,
    tree: {
      title:    "アイデア",
      children: [
        { title: "背景・課題",     children: [] },
        { title: "解決策",         children: [
          { title: "案①", children: [] },
          { title: "案②", children: [] },
        ]},
        { title: "期待する効果",   children: [] },
        { title: "懸念点・リスク", children: [] },
        { title: "次のアクション", children: [] },
      ],
    },
  },
];

async function ensureOfficialMindMapTemplates(uid) {
  const ref   = db.collection("users").doc(uid).collection("mindMapTemplates");
  const snap  = await ref.get();
  const byId  = new Map();
  const batch = db.batch();
  let hasWrites = false;

  snap.docs.forEach(doc => {
    if (RETIRED_OFFICIAL_MM_TEMPLATE_IDS.has(doc.id)) {
      batch.delete(doc.ref);
      hasWrites = true;
      return;
    }
    byId.set(doc.id, { id: doc.id, ...doc.data() });
  });

  for (const official of OFFICIAL_MM_TEMPLATES) {
    const current = byId.get(official.id);
    if (!current) {
      batch.set(ref.doc(official.id), official);
      byId.set(official.id, { ...official });
      hasWrites = true;
      continue;
    }
    const updates = {};
    for (const key of ["name", "official", "tree"]) {
      if (JSON.stringify(current[key]) !== JSON.stringify(official[key])) {
        updates[key] = official[key];
      }
    }
    if (current.created_at === undefined) updates.created_at = official.created_at;
    if (current.updated_at !== official.updated_at) updates.updated_at = official.updated_at;
    if (Object.keys(updates).length > 0) {
      batch.update(ref.doc(official.id), updates);
      Object.assign(current, updates);
      hasWrites = true;
    }
  }

  if (hasWrites) await batch.commit();
  return [...byId.values()];
}

function countTemplateNodes(node) {
  return 1 + (node.children ?? []).reduce((sum, c) => sum + countTemplateNodes(c), 0);
}

function buildTemplateTree(notes, noteId) {
  const note     = notes.find(n => n.id === noteId);
  const children = notes
    .filter(n => n.parent_id === noteId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return {
    title:    note.title,
    content:  note.content,
    children: children.map(c => buildTemplateTree(notes, c.id)),
  };
}

function createNotesFromTemplate(node, parentId, order) {
  const id = makeId();
  const ts = nowIso();
  const note = {
    id,
    parent_id:   parentId,
    title:       String(node.title || "新しいメモ").slice(0, 120),
    content:     String(node.content || ""),
    created_at:  ts,
    updated_at:  ts,
    source_file: null,
    media:       [],
    pinned:      false,
    checked:     false,
    checked_at:  null,
    locked:      false,
    order,
  };
  const created = [note];
  (node.children ?? []).forEach((child, i) => {
    created.push(...createNotesFromTemplate(child, id, (i + 1) * 1000));
  });
  return created;
}

function buildMindMapFromNote(noteId, existingMap = null, syncEnabled = true) {
  const source = getNotes().find(n => n.id === noteId);
  if (!source) throw new Error("変換するメモが見つかりません。");

  const ts = nowIso();
  const baseMap = {
    id: existingMap?.id || makeId(),
    title: String(source.title || "新しいマインドマップ").slice(0, 80),
    created_at: existingMap?.created_at || ts,
    updated_at: ts,
    selected_node_id: null,
    source_note_id: syncEnabled ? source.id : null,
    source_note_title: syncEnabled ? String(source.title || "無題").slice(0, 120) : "",
    source_node_id: existingMap?.source_node_id || null,
    sync_enabled: syncEnabled,
    nodes: Array.isArray(existingMap?.nodes) ? existingMap.nodes : [],
    extra_links: Array.isArray(existingMap?.extra_links) ? existingMap.extra_links : [],
  };

  const result = NoteMindMapSync.buildSyncedMindMap({
    notes: getNotes(),
    rootNoteId: source.id,
    map: baseMap,
    createId: makeId,
    toPlainText: contentToPlainText,
    now: ts,
  });
  result.map.selected_node_id = result.map.source_node_id;

  if (syncEnabled) return result.map;
  return {
    ...result.map,
    source_note_id: null,
    source_note_title: "",
    source_node_id: null,
    sync_enabled: false,
    nodes: result.map.nodes.map(node => ({ ...node, source_note_id: null })),
  };
}

function getMindMapRootTitleFromData(map) {
  const nodes = Array.isArray(map?.nodes) ? map.nodes : [];
  const root = nodes.find(node => node.parent_id === null) ?? nodes[0];
  return String(root?.title || "").trim();
}

function isMindMapFromNote(map, note) {
  if (!map || !note) return false;
  if (map.source_note_id && map.source_note_id === note.id) return true;

  const noteTitle = String(note.title || "無題").trim();
  const mapTitle = String(map.title || "").trim();
  return Boolean(noteTitle) && mapTitle === noteTitle && getMindMapRootTitleFromData(map) === noteTitle;
}

async function findExistingMindMapForNote(note) {
  const snap = await mindMapsCollection().get();
  const matches = snap.docs
    .map(doc => ({ id: doc.id, data: doc.data() }))
    .filter(({ data }) => isMindMapFromNote(data, note))
    .sort((a, b) => String(b.data.updated_at ?? "").localeCompare(String(a.data.updated_at ?? "")));
  return matches[0] ?? null;
}

function buildNoteTreeFromMindMapNode(node) {
  return {
    title: String(node?.title || "新しいメモ").slice(0, 120),
    content: String(node?.memo || ""),
    children: getMindMapChildren(node.id).map(buildNoteTreeFromMindMapNode),
  };
}

async function writeNotesBatch(notes) {
  const ref = notesCollection();
  const CHUNK = 450;
  for (let i = 0; i < notes.length; i += CHUNK) {
    const batch = db.batch();
    notes.slice(i, i + CHUNK).forEach(note => batch.set(ref.doc(note.id), note));
    await batch.commit();
  }
}

function mapListEntryFromMindMap(map) {
  return {
    id: map.id,
    title: String(map.title || "新しいマインドマップ").slice(0, 80),
    updated_at: map.updated_at || "",
    sync_enabled: Boolean(map.sync_enabled && map.source_note_id),
    source_note_id: map.source_note_id || null,
    source_note_title: String(map.source_note_title || "").slice(0, 120),
  };
}

function mindMapSavedStatus(map) {
  if (!map) return "保存済み";
  return map.sync_enabled
    ? `保存済み・${getSyncPairStyle(map.id).label}でメモと同期 ${map.updated_at}`
    : `保存済み ${map.updated_at}`;
}

function getLinkedMindMapIdForNote(note) {
  if (!note) return null;
  if (note.linked_mindmap_id) return note.linked_mindmap_id;
  const chain = getNoteAncestorChain(note.id);
  return [...chain].reverse().find(item => item.linked_mindmap_id)?.linked_mindmap_id || null;
}

async function getMindMapById(mapId) {
  if (!mapId) return null;
  if (state.mindMap?.id === mapId) return normalizeMindMap(serializeMindMap(), mapId);
  const doc = await mindMapsCollection().doc(mapId).get();
  return doc.exists ? normalizeMindMap(doc.data(), doc.id) : null;
}

async function commitNoteSyncOperations(writes, deleteIds = []) {
  const operations = [
    ...writes.map(note => ({ type: "set", note })),
    ...deleteIds.map(id => ({ type: "delete", id })),
  ];
  const ref = notesCollection();
  const CHUNK = 450;
  for (let index = 0; index < operations.length; index += CHUNK) {
    const batch = db.batch();
    operations.slice(index, index + CHUNK).forEach(operation => {
      if (operation.type === "delete") batch.delete(ref.doc(operation.id));
      else batch.set(ref.doc(operation.note.id), operation.note);
    });
    await batch.commit();
  }
}

async function persistNoteLinksForMindMap(mapId, links) {
  const linkedByNoteId = new Map(links.map(link => [link.noteId, link.nodeId]));
  const writes = [];
  for (const note of getNotes()) {
    const nodeId = linkedByNoteId.get(note.id);
    if (nodeId) {
      if (note.linked_mindmap_id !== mapId || note.linked_mindmap_node_id !== nodeId) {
        Object.assign(note, { linked_mindmap_id: mapId, linked_mindmap_node_id: nodeId });
        writes.push(note);
      }
    } else if (note.linked_mindmap_id === mapId) {
      Object.assign(note, { linked_mindmap_id: null, linked_mindmap_node_id: null });
      writes.push(note);
    }
  }
  if (writes.length > 0) await commitNoteSyncOperations(writes);
}

async function syncLinkedMindMapById(mapId) {
  if (!mapId || !state.data) return null;
  let map;
  if (state.mindMap?.id === mapId) {
    map = normalizeMindMap(serializeMindMap(), mapId);
  } else {
    const doc = await mindMapsCollection().doc(mapId).get();
    if (!doc.exists) return null;
    map = normalizeMindMap(doc.data(), doc.id);
  }
  if (!map.sync_enabled || !map.source_note_id) return null;

  const result = NoteMindMapSync.buildSyncedMindMap({
    notes: getNotes(),
    rootNoteId: map.source_note_id,
    map,
    createId: makeId,
    toPlainText: contentToPlainText,
    now: nowIso(),
  });
  await mindMapsCollection().doc(mapId).set(result.map, { merge: true });
  await persistNoteLinksForMindMap(mapId, result.links);

  if (state.mindMap?.id === mapId) {
    if (!isMindMapInlineNodeEditing()) {
      state.mindMap = normalizeMindMap(result.map, mapId);
      state.mindMapSelectedId = getMindMapNode(state.mindMapSelectedId)
        ? state.mindMapSelectedId
        : state.mindMap.selected_node_id;
    }
  }
  const entry = state.mindMapList.find(item => item.id === mapId);
  if (entry) Object.assign(entry, mapListEntryFromMindMap(result.map));
  return result.map;
}

async function syncLinkedMindMapForNote(note, additionalMapIds = []) {
  const mapIds = new Set(additionalMapIds.filter(Boolean));
  const linkedId = getLinkedMindMapIdForNote(note);
  if (linkedId) mapIds.add(linkedId);
  for (const mapId of mapIds) await syncLinkedMindMapById(mapId);
}

async function syncLinkedNotesFromMindMap(map = state.mindMap) {
  if (!map?.sync_enabled || !map.source_note_id || !state.data) return map?.source_note_id || null;
  const beforeNodeLinks = JSON.stringify((map.nodes || []).map(node => [node.id, node.source_note_id || null]));
  const plan = NoteMindMapSync.planSyncedNotes({
    notes: getNotes(),
    map,
    createId: makeId,
    toPlainText: contentToPlainText,
    now: nowIso(),
  });
  await commitNoteSyncOperations(plan.writes, plan.deleteIds);

  if (plan.deleteIds.length > 0) {
    const deleted = new Set(plan.deleteIds);
    state.data.notes = state.data.notes.filter(note => !deleted.has(note.id));
    plan.deleteIds.forEach(id => state.unlockedNoteIds.delete(id));
    if (deleted.has(state.selectedId)) state.selectedId = plan.map.source_note_id;
  }
  plan.writes.forEach(note => {
    const index = state.data.notes.findIndex(item => item.id === note.id);
    if (index >= 0) state.data.notes[index] = note;
    else state.data.notes.push(note);
  });

  const afterNodeLinks = JSON.stringify((plan.map.nodes || []).map(node => [node.id, node.source_note_id || null]));
  if (beforeNodeLinks !== afterNodeLinks || map.source_node_id !== plan.map.source_node_id) {
    await mindMapsCollection().doc(map.id).set({
      source_note_id: plan.map.source_note_id,
      source_note_title: plan.map.source_note_title,
      source_node_id: plan.map.source_node_id,
      sync_enabled: true,
      nodes: plan.map.nodes,
    }, { merge: true });
  }
  if (state.mindMap?.id === map.id && !isMindMapInlineNodeEditing()) {
    state.mindMap = normalizeMindMap(plan.map, map.id);
    state.mindMapSelectedId = getMindMapNode(state.mindMapSelectedId)
      ? state.mindMapSelectedId
      : state.mindMap.selected_node_id;
  }
  const entry = state.mindMapList.find(item => item.id === map.id);
  if (entry) Object.assign(entry, mapListEntryFromMindMap(plan.map));
  return plan.map.source_note_id;
}

async function unlinkMindMap(mapId) {
  if (!mapId) return;
  let map = null;
  if (state.mindMap?.id === mapId) map = serializeMindMap();
  else {
    const doc = await mindMapsCollection().doc(mapId).get();
    if (doc.exists) map = { id: doc.id, ...doc.data() };
  }
  if (map) {
    const updates = {
      source_note_id: null,
      source_note_title: "",
      source_node_id: null,
      sync_enabled: false,
      nodes: (map.nodes || []).map(node => ({ ...node, source_note_id: null })),
      updated_at: nowIso(),
    };
    await mindMapsCollection().doc(mapId).set(updates, { merge: true });
    if (state.mindMap?.id === mapId) {
      state.mindMap = normalizeMindMap({ ...map, ...updates }, mapId);
      state.mindMapSelectedId = state.mindMap.selected_node_id;
    }
    const entry = state.mindMapList.find(item => item.id === mapId);
    if (entry) Object.assign(entry, mapListEntryFromMindMap({ ...map, ...updates, id: mapId }));
  }

  const writes = [];
  getNotes().forEach(note => {
    if (note.linked_mindmap_id !== mapId) return;
    Object.assign(note, { linked_mindmap_id: null, linked_mindmap_node_id: null });
    writes.push(note);
  });
  if (writes.length > 0) await commitNoteSyncOperations(writes);
}

async function refreshMindMapListEntries() {
  const snap = await mindMapsCollection().get();
  state.mindMapList = snap.docs
    .map(doc => mapListEntryFromMindMap({ ...doc.data(), id: doc.id }))
    .sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")));
}

async function convertSelectedNoteToMindMap(noteId = state.selectedId) {
  try {
    const targetNoteId = typeof noteId === "string" ? noteId : state.selectedId;
    if (!targetNoteId || !await ensureNoteAccess(targetNoteId)) return;
    const selected = getNotes().find(n => n.id === targetNoteId) ?? null;
    if (!selected) {
      showToast("変換するメモを選択してください。");
      return;
    }
    // 共同作業中は、共有中の親メモ（ルート）に対する同期だけ許可する。
    // 子メモを同期すると新しい独立ツリーが作られてしまうため。
    if (isCollabActive() && selected.parent_id !== null) {
      showToast("共同作業中は、共有中の親メモ以外はマインドマップと同期できません。");
      return;
    }
    if (blockMindMapSyncForGuest()) return;

    await saveCurrentEditorNow();
    if (state.mindMap) await saveMindMapNow();

    const existing = await findExistingMindMapForNote(selected);
    let replaceTarget = null;
    let syncEnabled = true;
    if (existing) {
      const decision = await showReplaceMindMapConfirm(
        `「${selected.title || "無題"}」から作成したマインドマップがあります。置き換えますか？`,
      );
      if (decision === false) return;
      if (decision === true) replaceTarget = { id: existing.id, ...existing.data };
      if (decision === "add") syncEnabled = false;
    }

    const map = buildMindMapFromNote(selected.id, replaceTarget, syncEnabled);
    await mindMapsCollection().doc(map.id).set(map);
    await refreshMindMapListEntries();

    state.mindMap = normalizeMindMap(map, map.id);
    state.mindMapSelectedId = state.mindMap.selected_node_id;
    state.mindMapLoaded = true;
    state.mindMapCentered = false;
    if (syncEnabled) await syncLinkedMindMapById(map.id);
    clearMindMapUndoStack();
    closeMobileMenu();
    closeTemplatesPanel();
    hideCtxMenu();
    hideMediaCtxMenu();
    if (els.accountMenu) els.accountMenu.hidden = true;
    els.appShell.hidden = true;
    els.mindMapOverlay.hidden = false;
    renderMindMap();
    centerMindMap();
    els.mindMapStatus.textContent = mindMapSavedStatus(state.mindMap);
    showToast(syncEnabled
      ? (replaceTarget ? "マインドマップを置き換えて同期しました。" : "メモとマインドマップを同期しました。")
      : "独立したマインドマップを追加しました。");
  } catch (e) {
    showToast(e.message);
  }
}

async function convertCurrentMindMapToNotes(rootNodeId = null) {
  if (isMindMapPresentationMode()) return;
  if (blockMindMapSyncForGuest()) return;
  try {
    if (!state.mindMap) {
      showToast("変換するマインドマップがありません。");
      return;
    }
    if (!state.data) await loadNotes();

    await saveMindMapNow();
    const targetRootId = typeof rootNodeId === "string" ? rootNodeId : null;
    const root = targetRootId
      ? getMindMapNode(targetRootId)
      : (getMindMapNodes().find(node => node.parent_id === null) ?? getMindMapNodes()[0]);
    if (!root) {
      showToast("変換できるノードがありません。");
      return;
    }

    const isDifferentLinkedSubtree = Boolean(
      rootNodeId && state.mindMap.sync_enabled && state.mindMap.source_node_id !== root.id
    );
    const isFirstTimeSync = !state.mindMap.sync_enabled || !state.mindMap.source_note_id;
    if ((isDifferentLinkedSubtree || isFirstTimeSync) && blockNewRootMemoInCollab()) return;

    if (isDifferentLinkedSubtree) {
      const tree = buildNoteTreeFromMindMapNode(root);
      const created = createNotesFromTemplate(tree, null, nextOrderForNewNote(null));
      await writeNotesBatch(created);
      appendNotesIfMissing(created);
      await closeMindMapPanel();
      selectNote(created[0].id);
      showToast("選択したノードを独立したメモに変換しました。");
      return;
    }

    if (!state.mindMap.sync_enabled || !state.mindMap.source_note_id) {
      state.mindMap.sync_enabled = true;
      state.mindMap.source_note_id = root.source_note_id || makeId();
      state.mindMap.source_node_id = root.id;
      root.source_note_id = state.mindMap.source_note_id;
      if (root.parent_id === null) state.mindMap.title = root.title;
      await mindMapsCollection().doc(state.mindMap.id).set(serializeMindMap(), { merge: true });
    }
    const linkedRootId = await syncLinkedNotesFromMindMap(state.mindMap);
    getNoteAncestorChain(linkedRootId).forEach(note => state.expanded.add(note.id));
    await closeMindMapPanel();
    selectNote(linkedRootId);
    showToast("マインドマップとメモを同期しました。");
  } catch (e) {
    showToast(e.message);
  }
}

async function ensureOfficialTemplates(uid) {
  const ref   = db.collection("users").doc(uid).collection("templates");
  const snap  = await ref.get();
  const byId  = new Map();
  const batch = db.batch();
  let hasWrites = false;

  snap.docs.forEach(doc => {
    if (RETIRED_OFFICIAL_TEMPLATE_IDS.has(doc.id)) {
      batch.delete(doc.ref);
      hasWrites = true;
      return;
    }
    byId.set(doc.id, { id: doc.id, ...doc.data() });
  });

  for (const official of OFFICIAL_TEMPLATES) {
    const current = byId.get(official.id);
    if (!current) {
      batch.set(ref.doc(official.id), official);
      byId.set(official.id, { ...official });
      hasWrites = true;
      continue;
    }
    const updates = {};
    for (const key of ["name", "official", "tree"]) {
      if (JSON.stringify(current[key]) !== JSON.stringify(official[key])) {
        updates[key] = official[key];
      }
    }
    if (current.created_at === undefined) updates.created_at = official.created_at;
    if (current.updated_at !== official.updated_at) updates.updated_at = official.updated_at;
    if (Object.keys(updates).length > 0) {
      batch.update(ref.doc(official.id), updates);
      Object.assign(current, updates);
      hasWrites = true;
    }
  }

  if (hasWrites) await batch.commit();
  return [...byId.values()];
}

// ── 一括削除（アカウント削除）────────────────────────────────────────────────────

async function deleteCollectionInBatches(ref, batchSize = 500) {
  for (;;) {
    const snap = await ref.limit(batchSize).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    if (snap.size < batchSize) return;
  }
}

async function deleteStoragePrefix(prefix) {
  const ref = storage.ref(prefix);
  let pageToken;
  do {
    const res = await ref.list({ maxResults: 1000, pageToken });
    await Promise.all(res.items.map(item => item.delete().catch(() => {})));
    pageToken = res.nextPageToken;
  } while (pageToken);
}

// ── メディアヘルパー ─────────────────────────────────────────────────────────────

function pruneOrphanedMedia(note, newContent) {
  const kept = [];
  for (const item of (note.media ?? [])) {
    if (item.downloadURL && newContent.includes(item.downloadURL)) {
      kept.push(item);
    } else if (item.storagePath && STORAGE_ENABLED) {
      storage.ref(item.storagePath).delete().catch(() => {});
    }
  }
  return kept;
}

// ── Note helpers ──────────────────────────────────────────────────────────────

function getNotes()        { return state.data?.notes ?? []; }
function getSelectedNote() { return getNotes().find(n => n.id === state.selectedId) ?? null; }

// Firestoreへ書き込んだ直後にローカルへも反映するためのヘルパー。
// 共同編集中はnotesCollection()のonSnapshotが同じ書き込みを検知して
// 先にstate.data.notesへ反映してしまうことがあるため、そのまま push すると
// 同じメモが二重に入ってしまう。既にあるIDは追加しないことで二重生成を防ぐ。
function appendNotesIfMissing(notes) {
  const existingIds = new Set(getNotes().map(n => n.id));
  notes.forEach(note => {
    if (existingIds.has(note.id)) return;
    state.data.notes.push(note);
    existingIds.add(note.id);
  });
}
function getChildren(pid) {
  return getNotes()
    .filter(n => n.parent_id === pid)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function getNoteAncestorChain(noteId) {
  const chain = [];
  let current = getNotes().find(note => note.id === noteId) ?? null;
  const visited = new Set();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    chain.unshift(current);
    current = current.parent_id
      ? (getNotes().find(note => note.id === current.parent_id) ?? null)
      : null;
  }
  return chain;
}

function getClosedNoteLocks(noteId) {
  return getNoteAncestorChain(noteId).filter(note => (
    Boolean(note.locked) && !state.unlockedNoteIds.has(note.id)
  ));
}

function isNoteAccessLocked(noteId) {
  return getClosedNoteLocks(noteId).length > 0;
}

function isLockableParentNote(note) {
  return Boolean(note) && (note.parent_id === null || getChildren(note.id).length > 0);
}

function isNoteInSubtree(noteId, parentId) {
  return getNoteAncestorChain(noteId).some(note => note.id === parentId);
}

function collectNoteSubtree(rootId) {
  if (!rootId) return [];
  return getNotes().filter(note => isNoteInSubtree(note.id, rootId));
}

async function ensureNoteAccess(noteId, { keepLocked = false } = {}) {
  const locks = getClosedNoteLocks(noteId);
  if (locks.length === 0) return true;
  const lock = locks[0];
  const verified = await requestAccountPassword(keepLocked ? {
    title: "鍵付きメモにメモを追加",
    message: `「${lock.title || "無題"}」にメモを追加するには、アカウント登録時のパスワードを入力してください。`,
    submitLabel: "追加",
  } : {
    title: "鍵付きメモを開く",
    message: `「${lock.title || "無題"}」を開くには、アカウント登録時のパスワードを入力してください。`,
    submitLabel: "開く",
  });
  if (!verified) return false;
  if (!keepLocked) {
    locks.forEach(item => state.unlockedNoteIds.add(item.id));
    state.expanded.add(lock.id);
    renderTree();
  }
  return true;
}

async function openProtectedNote(noteId) {
  if (!await ensureNoteAccess(noteId)) return false;
  selectNote(noteId);
  return true;
}

function clearSelectionInsideLockedNote(parentId) {
  if (!state.selectedId || !isNoteInSubtree(state.selectedId, parentId)) return;
  clearTimeout(state.saveTimer);
  state.selectedId = null;
  setLargeEditorOpen(false);
}

function clearUnlockedNoteSubtree(parentId) {
  getNotes().forEach(note => {
    if (note.locked && isNoteInSubtree(note.id, parentId)) {
      state.unlockedNoteIds.delete(note.id);
    }
  });
}

async function toggleNoteLock(noteId) {
  if (blockIfGuestReadOnly()) return;
  const note = getNotes().find(item => item.id === noteId);
  if (!note || (!note.locked && !isLockableParentNote(note))) {
    showToast("鍵を設定できるのは親メモです。");
    return;
  }

  const removing = Boolean(note.locked);
  const verified = await requestAccountPassword({
    title: removing ? "鍵を外す" : "親メモに鍵をかける",
    message: `「${note.title || "無題"}」の鍵を${removing ? "外す" : "設定する"}には、アカウント登録時のパスワードを入力してください。`,
    submitLabel: removing ? "鍵を外す" : "鍵をかける",
  });
  if (!verified) return;

  try {
    if (!removing && state.selectedId && isNoteInSubtree(state.selectedId, note.id)) {
      await saveCurrentEditorNow();
    }
    await updateNote(note.id, { locked: !removing }, false);
    if (removing) {
      state.unlockedNoteIds.delete(note.id);
    } else {
      clearUnlockedNoteSubtree(note.id);
      clearSelectionInsideLockedNote(note.id);
    }
    renderTree();
    renderEditor();
    showToast(removing ? "鍵を外しました。" : "親メモに鍵をかけました。");
  } catch (e) {
    showToast(e.message);
  }
}

async function relockNote(noteId) {
  const note = getNotes().find(item => item.id === noteId);
  if (!note?.locked) return;
  if (state.selectedId && isNoteInSubtree(state.selectedId, note.id)) {
    await saveCurrentEditorNow();
  }
  clearUnlockedNoteSubtree(note.id);
  clearSelectionInsideLockedNote(note.id);
  renderTree();
  renderEditor();
  showToast("メモを再ロックしました。");
}

function getParentChain(note) {
  const chain = [];
  let cur = note;
  while (cur) {
    chain.unshift(cur.title);
    cur = getNotes().find(n => n.id === cur.parent_id) ?? null;
  }
  return chain;
}

function matchesSearch(note, q) {
  if (!q) return true;
  const lq = q.toLowerCase();
  if (note.title.toLowerCase().includes(lq) || note.content.toLowerCase().includes(lq)) return true;
  return getChildren(note.id).some(c => matchesSearch(c, q));
}

function countDescendants(noteId) {
  const children = getChildren(noteId);
  return children.reduce((sum, c) => sum + 1 + countDescendants(c.id), 0);
}

function checkedTimestampValue(note) {
  const value = note.checked_at;
  if (typeof value === "string") {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : 0;
  }
  if (typeof value === "number") return value;
  if (value && typeof value.toMillis === "function") return value.toMillis();
  if (value && typeof value.seconds === "number") {
    return value.seconds * 1000 + Math.floor((value.nanoseconds ?? 0) / 1e6);
  }
  return 0;
}

function orderTreeChildren(parentId, children) {
  return [...children].sort((a, b) => {
    if (parentId === null) {
      const pinDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
      if (pinDiff !== 0) return pinDiff;
    }
    const checkDiff = Number(Boolean(b.checked)) - Number(Boolean(a.checked));
    if (checkDiff !== 0) return checkDiff;
    if (a.checked && b.checked) {
      const checkedAtDiff = checkedTimestampValue(b) - checkedTimestampValue(a);
      if (checkedAtDiff !== 0) return checkedAtDiff;
    }
    return (a.order ?? 0) - (b.order ?? 0);
  });
}

function createTreeRenderContext(q) {
  const childrenByParent = new Map();
  getNotes().forEach(note => {
    const key = note.parent_id ?? null;
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key).push(note);
  });

  const query = q.toLowerCase();
  const matchMemo = new Map();
  const countMemo = new Map();

  function childrenOf(parentId) {
    const key = parentId ?? null;
    return orderTreeChildren(key, childrenByParent.get(key) ?? []);
  }

  function matches(note) {
    if (!query) return true;
    if (matchMemo.has(note.id)) return matchMemo.get(note.id);
    const title = String(note.title ?? "").toLowerCase();
    const content = String(note.content ?? "").toLowerCase();
    const closedLocks = getClosedNoteLocks(note.id);
    const result = closedLocks.length > 0
      ? closedLocks[0].id === note.id && title.includes(query)
      : title.includes(query) ||
        content.includes(query) ||
        childrenOf(note.id).some(child => matches(child));
    matchMemo.set(note.id, result);
    return result;
  }

  function descendantCount(noteId) {
    if (countMemo.has(noteId)) return countMemo.get(noteId);
    const total = childrenOf(noteId).reduce(
      (sum, child) => sum + 1 + descendantCount(child.id),
      0,
    );
    countMemo.set(noteId, total);
    return total;
  }

  return { childrenOf, descendantCount, hasQuery: query.length > 0, matches };
}

function clearTreeDropHighlights() {
  document.querySelectorAll(".tree-insert-zone.drag-target, .tree-row.drag-target, .tree-row.drag-before")
    .forEach(el => el.classList.remove("drag-target", "drag-before"));
}

function isSameTreePosition(noteId, parentId, beforeId) {
  if (noteId === beforeId) return true;

  const normalizedParentId = parentId ?? null;
  const moving = getNotes().find(n => n.id === noteId);
  if (!moving || moving.parent_id !== normalizedParentId) return false;

  const siblings = getChildren(normalizedParentId);
  const orderedSiblings = orderTreeChildren(normalizedParentId, siblings);
  const currentIndex = orderedSiblings.findIndex(n => n.id === noteId);
  if (currentIndex < 0) return false;

  if (!beforeId) return currentIndex === orderedSiblings.length - 1;
  return orderedSiblings[currentIndex + 1]?.id === beforeId;
}

function firstSiblingId(noteId, parentId) {
  return getChildren(parentId ?? null).find(note => note.id !== noteId)?.id ?? null;
}

function normalizeTreeDropTarget(noteId, parentId, beforeId, options = {}) {
  const normalizedParentId = parentId ?? null;
  return {
    parentId: normalizedParentId,
    beforeId: beforeId ?? null,
    stayedWithParent: Boolean(options.stayedWithParent),
  };
}

async function moveNoteToTreePosition(noteId, parentId, beforeId, options = {}) {
  if (!noteId) return;
  if (blockIfGuestReadOnly()) return;
  if (!await ensureNoteAccess(noteId)) return;
  if (parentId && !await ensureNoteAccess(parentId, { keepLocked: true })) return;
  const target = normalizeTreeDropTarget(noteId, parentId, beforeId, options);
  if (isSameTreePosition(noteId, target.parentId, target.beforeId)) return;

  const moving = getNotes().find(n => n.id === noteId);
  const parentChanged = moving?.parent_id !== target.parentId;
  if (target.parentId === null && parentChanged && blockNewRootMemoInCollab()) return;
  const wasSelected = state.selectedId === noteId;

  try {
    await reorderNote(noteId, target.beforeId, target.parentId);
    if (target.parentId) state.expanded.add(target.parentId);
    if (isMobileMenuLayout()) {
      renderTree();
      if (wasSelected) renderEditor();
    } else {
      selectNote(noteId);
    }
    showToast(target.stayedWithParent ? "同じ親メモ内で並び替えました。" :
              parentChanged ? "メモを移動しました。" : "並び替えました。");
  } catch (e) { showToast(e.message); }
}

async function moveNoteToSiblingEdge(noteId, edge) {
  const note = getNotes().find(n => n.id === noteId);
  if (!note) return;
  const parentId = note.parent_id ?? null;
  const beforeId = edge === "start" ? firstSiblingId(noteId, parentId) : null;
  await moveNoteToTreePosition(noteId, parentId, beforeId, { stayedWithParent: true });
}

function createTreeInsertZone(parentId, beforeId) {
  const zone = document.createElement("div");
  zone.className = "tree-insert-zone";
  zone.title = "ここに並び替え";

  zone.addEventListener("dragover", e => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    clearTreeDropHighlights();
    zone.classList.add("drag-target");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("drag-target"));
  zone.addEventListener("drop", async e => {
    e.preventDefault();
    e.stopPropagation();
    suppressTreeClickAfterDrag();
    const id = e.dataTransfer.getData("text/plain");
    clearTreeDropHighlights();
    await moveNoteToTreePosition(id, parentId, beforeId);
  });

  return zone;
}

// ── ドラッグ中のサイドバー自動スクロール ──────────────────────────────────────

const TREE_AUTOSCROLL_EDGE      = 48;
const TREE_AUTOSCROLL_MAX_SPEED = 16;

let treeAutoScrollRAF   = null;
let treeAutoScrollDelta = 0;

function stopTreeAutoScroll() {
  treeAutoScrollDelta = 0;
  if (treeAutoScrollRAF !== null) {
    cancelAnimationFrame(treeAutoScrollRAF);
    treeAutoScrollRAF = null;
  }
}

function tickTreeAutoScroll() {
  if (treeAutoScrollDelta === 0) { treeAutoScrollRAF = null; return; }
  els.tree.scrollTop += treeAutoScrollDelta;
  treeAutoScrollRAF = requestAnimationFrame(tickTreeAutoScroll);
}

els.tree.addEventListener("dragover", e => {
  const rect   = els.tree.getBoundingClientRect();
  const top    = e.clientY - rect.top;
  const bottom = rect.bottom - e.clientY;

  if (top < TREE_AUTOSCROLL_EDGE) {
    const ratio = Math.max(0, Math.min(1, 1 - top / TREE_AUTOSCROLL_EDGE));
    treeAutoScrollDelta = -Math.ceil(TREE_AUTOSCROLL_MAX_SPEED * ratio);
  } else if (bottom < TREE_AUTOSCROLL_EDGE) {
    const ratio = Math.max(0, Math.min(1, 1 - bottom / TREE_AUTOSCROLL_EDGE));
    treeAutoScrollDelta = Math.ceil(TREE_AUTOSCROLL_MAX_SPEED * ratio);
  } else {
    treeAutoScrollDelta = 0;
  }

  if (treeAutoScrollDelta !== 0 && treeAutoScrollRAF === null) {
    treeAutoScrollRAF = requestAnimationFrame(tickTreeAutoScroll);
  }
}, { capture: true });

els.tree.addEventListener("dragleave", e => {
  if (!els.tree.contains(e.relatedTarget)) stopTreeAutoScroll();
}, { capture: true });

// ── コンテンツ変換 ─────────────────────────────────────────────────────────────

function appendPlainTextWithBreaks(parent, text) {
  const lines = String(text ?? "").split(/\r\n?|\n/);
  lines.forEach((line, index) => {
    if (index > 0) parent.appendChild(document.createElement("br"));
    if (line) parent.appendChild(document.createTextNode(line));
  });
}

function countMemoChar(text, char) {
  let count = 0;
  for (const current of text) {
    if (current === char) count += 1;
  }
  return count;
}

function splitMemoUrlTrailingText(rawUrl) {
  let url = String(rawUrl ?? "");
  let trailing = "";

  while (url) {
    const last = url.charAt(url.length - 1);
    const openPair = MEMO_URL_TRAILING_PAIRS[last];
    const shouldTrim = MEMO_URL_TRAILING_CHARS.includes(last) ||
      (openPair && countMemoChar(url, last) > countMemoChar(url, openPair));
    if (!shouldTrim) break;
    trailing = last + trailing;
    url = url.slice(0, -1);
  }

  return { url, trailing };
}

function normalizeMemoLinkHref(url) {
  const raw = String(url ?? "").trim();
  if (!raw) return null;
  const href = /^www\./i.test(raw) ? `https://${raw}` : raw;
  try {
    const parsed = new URL(href, document.baseURI);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.href;
  } catch (_) {
    return null;
  }
}

function isMacLikePlatform() {
  const platform = navigator.userAgentData?.platform || navigator.platform || "";
  if (/mac|iphone|ipad|ipod/i.test(platform)) return true;
  return /mac/i.test(navigator.userAgent || "") && navigator.maxTouchPoints > 1;
}

function shouldOpenMemoLinkFromClick(event) {
  return isMacLikePlatform() ? event.metaKey : event.ctrlKey;
}

function recentlyOpenedMemoLink(href) {
  return _lastMemoLinkOpen.href === href && Date.now() - _lastMemoLinkOpen.at < 800;
}

function openMemoLink(href) {
  _lastMemoLinkOpen = { href, at: Date.now() };
  let opened = null;
  try {
    opened = window.open("about:blank", "_blank");
    if (opened) {
      opened.opener = null;
      opened.location.href = href;
      return;
    }
  } catch (_) {
    // Fall back to same-tab navigation below.
  }
  window.location.href = href;
}

function memoLinkModifierActiveFromKeyEvent(event) {
  const isMac = isMacLikePlatform();
  const modifierKey = isMac ? "Meta" : "Control";
  if (event.type === "keyup" && event.key === modifierKey) return false;
  return isMac ? Boolean(event.metaKey || event.key === modifierKey)
               : Boolean(event.ctrlKey || event.key === modifierKey);
}

function setMemoLinkCursorMode(active) {
  els.contentInput?.classList.toggle("is-memo-link-open-mode", Boolean(active));
}

function getMemoLinkFromTarget(target) {
  const element = target?.nodeType === Node.ELEMENT_NODE ? target : target?.parentElement;
  return element?.closest?.("a[href]") || null;
}

function memoLinkOpenHintText() {
  return isMacLikePlatform() ? "⌘ + クリックで開く" : "Ctrl + クリックで開く";
}

function setMemoLinkOpenHint(link) {
  const hint = memoLinkOpenHintText();
  link.dataset.openHint = hint;
  link.title = hint;
}

function createMemoLinkElement(label, href) {
  const link = document.createElement("a");
  link.className = "memo-link";
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  setMemoLinkOpenHint(link);
  link.textContent = label;
  return link;
}

function appendLinkedTextFragment(parent, text) {
  const source = String(text ?? "");
  let lastIndex = 0;
  let match;
  MEMO_URL_RE.lastIndex = 0;

  while ((match = MEMO_URL_RE.exec(source)) !== null) {
    appendPlainTextWithBreaks(parent, source.slice(lastIndex, match.index));

    const { url, trailing } = splitMemoUrlTrailingText(match[0]);
    const href = normalizeMemoLinkHref(url);
    if (href) parent.appendChild(createMemoLinkElement(url, href));
    else appendPlainTextWithBreaks(parent, url);
    appendPlainTextWithBreaks(parent, trailing);

    lastIndex = match.index + match[0].length;
  }

  appendPlainTextWithBreaks(parent, source.slice(lastIndex));
}

function linkifyPlainTextToHtml(text) {
  const holder = document.createElement("div");
  appendLinkedTextFragment(holder, text);
  return holder.innerHTML;
}

function memoTextHasUrl(text) {
  MEMO_URL_RE.lastIndex = 0;
  return MEMO_URL_RE.test(String(text ?? ""));
}

function prepareExistingMemoLinks(root) {
  root.querySelectorAll("a[href]").forEach(link => {
    const href = normalizeMemoLinkHref(link.getAttribute("href") || link.href);
    if (!href) {
      link.replaceWith(...link.childNodes);
      return;
    }
    link.classList.add("memo-link");
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    setMemoLinkOpenHint(link);
  });
}

function shouldSkipMemoUrlLinkify(textNode) {
  const parent = textNode.parentElement;
  return !parent || Boolean(parent.closest("a, script, style, textarea"));
}

function linkifyMemoHtml(html) {
  const holder = document.createElement("div");
  holder.innerHTML = html || "";
  prepareExistingMemoLinks(holder);

  const walker = document.createTreeWalker(holder, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!shouldSkipMemoUrlLinkify(node) && memoTextHasUrl(node.nodeValue)) {
      textNodes.push(node);
    }
  }

  textNodes.forEach(node => {
    const fragment = document.createDocumentFragment();
    appendLinkedTextFragment(fragment, node.nodeValue);
    node.replaceWith(fragment);
  });

  return holder.innerHTML;
}

function contentToHtml(content) {
  if (!content) return "";
  const raw = String(content);
  if (/<(img|video|figure|div|p|br|span|a)\b/i.test(raw)) {
    return linkifyMemoHtml(raw);
  }
  return linkifyPlainTextToHtml(raw);
}

function contentToPlainText(content) {
  const raw = String(content ?? "");
  if (!raw) return "";

  const html = /<\/?[a-z][^>]*>/i.test(raw) ? raw : contentToHtml(raw);
  const holder = document.createElement("div");
  holder.innerHTML = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|li|h[1-6]|blockquote|pre|section|article|tr)>/gi, "\n")
    .replace(/<\/(td|th)>/gi, "\t");

  return holder.textContent
    .replace(/\u00a0/g, " ")
    .replace(/\u200b/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// 見出し・小見出し・取り消し線・画像などをMarkdown記法に変換
function contentToMarkdown(content) {
  const raw = String(content ?? "");
  if (!raw) return "";

  const html = /<\/?[a-z][^>]*>/i.test(raw) ? raw : contentToHtml(raw);
  const holder = document.createElement("div");
  holder.innerHTML = html;

  holder.querySelectorAll(".memo-text-strike").forEach(el => {
    if (!el.textContent.trim()) return;
    el.prepend(document.createTextNode("~~"));
    el.append(document.createTextNode("~~"));
  });
  holder.querySelectorAll(".memo-text-heading, .memo-text-subheading").forEach(el => {
    const prefix = el.classList.contains("memo-text-heading") ? "# " : "## ";
    el.prepend(document.createTextNode(prefix));
  });
  holder.querySelectorAll("img").forEach(img => {
    const alt = (img.getAttribute("alt") || "画像").trim();
    const src = img.getAttribute("src") || "";
    img.replaceWith(document.createTextNode(src ? `![${alt}](${src})` : ""));
  });
  holder.querySelectorAll("video").forEach(video => {
    const src = video.getAttribute("src") || "";
    video.replaceWith(document.createTextNode(src ? `[動画](${src})` : ""));
  });

  const textHolder = document.createElement("div");
  textHolder.innerHTML = holder.innerHTML
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|li|h[1-6]|blockquote|pre|section|article|tr)>/gi, "\n")
    .replace(/<\/(td|th)>/gi, "\t");

  return textHolder.textContent
    .replace(/\u00a0/g, " ")
    .replace(/\u200b/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getContentHtml() { return els.contentInput.innerHTML ?? ""; }

function insertFragmentAtMemoSelection(fragment) {
  redirectMediaCaretTyping();

  const selection = window.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  const lastNode = fragment.lastChild;

  if (!range || !rangeIsInMemoEditor(range)) {
    els.contentInput.appendChild(fragment);
  } else {
    range.deleteContents();
    range.insertNode(fragment);
  }

  if (lastNode && selection) {
    const nextRange = document.createRange();
    nextRange.setStartAfter(lastNode);
    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);
  }
}

function insertLinkedTextAtMemoSelection(text) {
  const fragment = document.createDocumentFragment();
  appendLinkedTextFragment(fragment, text);
  insertFragmentAtMemoSelection(fragment);
  repairMediaCaretAfterEdit();
  updateEmptyState();
  updateMemoFormatUiFromSelection();
  scheduleSave();
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function snapshotFromNote(note) {
  if (!note) return null;
  return {
    noteId: note.id,
    title: note.title ?? "",
    content: note.content ?? "",
  };
}

function snapshotFromEditor(noteId) {
  if (!noteId) return null;
  return {
    noteId,
    title: els.titleInput.value,
    content: getContentHtml(),
  };
}

function snapshotDeletedNotes(noteId) {
  const deleteIds = new Set([noteId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const note of getNotes()) {
      if (deleteIds.has(note.parent_id) && !deleteIds.has(note.id)) {
        deleteIds.add(note.id);
        changed = true;
      }
    }
  }

  return {
    kind: "delete",
    noteId,
    insertIndex: getNotes().findIndex(n => n.id === noteId),
    notes: cloneData(getNotes().filter(n => deleteIds.has(n.id))),
  };
}

async function deleteNoteDocuments(deleteIds) {
  const ref = notesCollection();
  const CHUNK = 450;
  for (let i = 0; i < deleteIds.length; i += CHUNK) {
    const batch = db.batch();
    deleteIds.slice(i, i + CHUNK).forEach(id => batch.delete(ref.doc(id)));
    await batch.commit();
  }
}

async function deleteNoteDocumentsWithMindMaps(deleteIds, mapIds) {
  const uniqueMapIds = [...new Set(mapIds.filter(Boolean))];
  if (deleteIds.length + uniqueMapIds.length <= 450) {
    const batch = db.batch();
    const noteRef = notesCollection();
    deleteIds.forEach(id => batch.delete(noteRef.doc(id)));
    uniqueMapIds.forEach(id => batch.delete(mindMapsCollection().doc(id)));
    await batch.commit();
    return;
  }
  await deleteNoteDocuments(deleteIds);
  for (const id of uniqueMapIds) await mindMapsCollection().doc(id).delete();
}

function removeDeletedNotesFromState(deleteIds, preferredSelectionId = null) {
  const deleted = new Set(deleteIds);
  state.data.notes = state.data.notes.filter(note => !deleted.has(note.id));
  deleteIds.forEach(id => state.unlockedNoteIds.delete(id));
  if (!state.selectedId || deleted.has(state.selectedId) || !getSelectedNote()) {
    const preferred = preferredSelectionId
      ? getNotes().find(note => note.id === preferredSelectionId)
      : null;
    const firstRoot = getNotes().find(note => note.parent_id === null) || null;
    state.selectedId = preferred?.id || firstRoot?.id || null;
  }
}

function snapshotsEqual(a, b) {
  return !!a && !!b &&
    a.noteId === b.noteId &&
    a.title === b.title &&
    a.content === b.content;
}

function hasUnsavedEditorChange() {
  const note = getSelectedNote();
  if (!note) return false;
  return !snapshotsEqual(snapshotFromEditor(note.id), snapshotFromNote(note));
}

function updateUndoButton() {
  if (!els.undoBtn) return;
  els.undoBtn.disabled = state.undoStack.length === 0 && !hasUnsavedEditorChange();
}

function undoEntriesEqual(a, b) {
  if (!a || !b) return false;
  const ak = a.kind ?? "edit";
  const bk = b.kind ?? "edit";
  if (ak !== bk) return false;
  if (ak === "delete") return a.noteId === b.noteId && a.notes?.length === b.notes?.length;
  return snapshotsEqual(a, b);
}

function pushUndoSnapshot(entry) {
  if (!entry?.noteId) return;
  const last = state.undoStack[state.undoStack.length - 1];
  if (undoEntriesEqual(last, entry)) return;
  state.undoStack.push(entry);
  if (state.undoStack.length > MAX_UNDO) state.undoStack.shift();
  updateUndoButton();
}

function expandAncestors(note) {
  let parentId = note?.parent_id ?? null;
  while (parentId) {
    state.expanded.add(parentId);
    const parent = getNotes().find(n => n.id === parentId);
    parentId = parent?.parent_id ?? null;
  }
}

async function applyUndoSnapshot(snapshot) {
  const note = getNotes().find(n => n.id === snapshot.noteId);
  if (!note) {
    showToast("戻す対象のメモが見つかりません。");
    updateUndoButton();
    return;
  }
  if (!await ensureNoteAccess(snapshot.noteId)) return;

  clearTimeout(state.saveTimer);
  state.isApplyingUndo = true;
  try {
    state.selectedId = snapshot.noteId;
    expandAncestors(note);
    els.titleInput.value = snapshot.title;
    els.contentInput.innerHTML = snapshot.content;
    updateEmptyState();

    const upd = await updateNote(snapshot.noteId, {
      title:   snapshot.title,
      content: snapshot.content,
    }, false);
    const idx = state.data.notes.findIndex(n => n.id === upd.id);
    if (idx >= 0) state.data.notes[idx] = upd;
    renderTree();
    renderEditor();
    els.saveStatus.textContent = `戻しました ${upd.updated_at}`;
    showToast("一つ前に戻しました。");
  } catch (e) {
    showToast("戻せませんでした: " + e.message);
  } finally {
    state.isApplyingUndo = false;
    updateUndoButton();
  }
}

async function restoreDeletedNotes(snapshot) {
  state.isApplyingUndo = true;
  try {
    const batch = db.batch();
    const ref   = notesCollection();
    for (const note of snapshot.notes) {
      batch.set(ref.doc(note.id), note);
    }
    await batch.commit();
    appendNotesIfMissing(cloneData(snapshot.notes));
    const restoredRoot = state.data.notes.find(note => note.id === snapshot.noteId);
    if (restoredRoot?.linked_mindmap_id) {
      const mapId = restoredRoot.linked_mindmap_id;
      const doc = await mindMapsCollection().doc(mapId).get();
      if (doc.exists) {
        const mapData = doc.data();
        if ((!mapData.sync_enabled || !mapData.source_note_id) && restoredRoot.parent_id === null) {
          await mindMapsCollection().doc(mapId).set({
            source_note_id: restoredRoot.id,
            source_note_title: restoredRoot.title || "無題",
            source_node_id: restoredRoot.linked_mindmap_node_id || mapData.source_node_id || null,
            sync_enabled: true,
          }, { merge: true });
        }
        await syncLinkedMindMapById(mapId);
      }
    }
    state.selectedId = snapshot.noteId;
    selectNote(snapshot.noteId);
    showToast("削除したメモを復元しました。");
  } catch (e) {
    showToast("復元できませんでした: " + e.message);
  } finally {
    state.isApplyingUndo = false;
    updateUndoButton();
  }
}

async function undoLastChange() {
  const note = getSelectedNote();
  if (note) {
    const saved = snapshotFromNote(note);
    const current = snapshotFromEditor(note.id);
    if (!snapshotsEqual(current, saved)) {
      await applyUndoSnapshot(saved);
      return;
    }
  }

  let snapshot = state.undoStack.pop();
  while (snapshot && (snapshot.kind ?? "edit") !== "delete" &&
         !getNotes().some(n => n.id === snapshot.noteId)) {
    snapshot = state.undoStack.pop();
  }

  if (!snapshot) {
    updateUndoButton();
    showToast("戻せる変更がありません。");
    return;
  }

  if ((snapshot.kind ?? "edit") === "delete") {
    await restoreDeletedNotes(snapshot);
  } else {
    await applyUndoSnapshot(snapshot);
  }
}

function updateEmptyState() {
  const text = els.contentInput.textContent.replace(/\u200b/g, "").trim();
  const empty = !text &&
                !els.contentInput.querySelector("img, video");
  els.contentInput.classList.toggle("is-empty", empty);
  els.contentInput.classList.toggle("is-focused", document.activeElement === els.contentInput);
}

function setMemoFormatEnabled(enabled) {
  [els.memoFormatToggleBtn, els.memoTextColorBtn, els.memoHighlightBtn, els.memoStrikeBtn, els.memoSubheadingBtn, els.memoHeadingBtn]
    .filter(Boolean)
    .forEach(button => { button.disabled = !enabled; });
  if (!enabled) {
    closeMemoFormatPanel();
    state.memoFormatRange = null;
    setMemoFormatUi({ strike: false, headingLevel: "normal", highlight: MEMO_NO_HIGHLIGHT });
  }
}

function positionMemoFormatPanel() {
  if (!els.memoFormatBar || !els.memoFormatToggleBtn || els.memoFormatBar.hidden) return;
  if (els.memoSettingsPanel?.contains(els.memoFormatBar)) {
    els.memoFormatBar.style.removeProperty("top");
    els.memoFormatBar.style.removeProperty("left");
    return;
  }
  const rect = els.memoFormatToggleBtn.getBoundingClientRect();
  const panel = els.memoFormatBar;
  panel.style.top = `${rect.bottom + 8}px`;
  panel.style.left = "0px";
  const width = panel.offsetWidth;
  const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
  panel.style.left = `${left}px`;
}

function setMemoFormatPanelOpen(open) {
  if (!els.memoFormatBar || !els.memoFormatToggleBtn || els.memoFormatToggleBtn.disabled) return;
  if (open) {
    closeMemoSettingsPanel();
    closeNoteGridOverlay();
    closeNoteTodoPanel();
  }
  els.memoFormatBar.hidden = !open;
  els.memoFormatToggleBtn.classList.toggle("active", open);
  els.memoFormatToggleBtn.setAttribute("aria-expanded", String(open));
  if (open) {
    updateMemoFormatUiFromSelection();
    positionMemoFormatPanel();
  } else {
    closeMemoTextColorPalette();
    closeMemoHighlightPalette();
  }
  requestAnimationFrame(positionMemoSettingsPanel);
}

function closeMemoFormatPanel() {
  if (!els.memoFormatBar || !els.memoFormatToggleBtn) return;
  els.memoFormatBar.hidden = true;
  els.memoFormatToggleBtn.classList.remove("active");
  els.memoFormatToggleBtn.setAttribute("aria-expanded", "false");
  closeMemoTextColorPalette();
  closeMemoHighlightPalette();
}

function openMemoSettingsPanel() {
  if (!els.memoSettingsPanel || !els.memoSettingsBtn) return;
  closeMemoFormatPanel();
  closeNoteGridOverlay();
  closeNoteTodoPanel();
  hideCtxMenu();
  hideMediaCtxMenu();
  if (els.accountMenu) els.accountMenu.hidden = true;
  els.memoSettingsPanel.hidden = false;
  els.memoSettingsBtn.setAttribute("aria-expanded", "true");
  positionMemoSettingsPanel();
}

function closeMemoSettingsPanel() {
  if (!els.memoSettingsPanel) return;
  closeMemoFormatPanel();
  els.memoSettingsPanel.hidden = true;
  els.memoSettingsBtn?.setAttribute("aria-expanded", "false");
}

function toggleMemoSettingsPanel() {
  if (els.memoSettingsPanel?.hidden) openMemoSettingsPanel();
  else closeMemoSettingsPanel();
}

function closeMemoTextColorPalette() {
  if (!els.memoTextColorPalette || !els.memoTextColorBtn) return;
  els.memoTextColorPalette.hidden = true;
  els.memoTextColorBtn.classList.remove("is-open");
  els.memoTextColorBtn.setAttribute("aria-expanded", "false");
}

function setMemoTextColorPaletteOpen(open) {
  if (!els.memoTextColorPalette || !els.memoTextColorBtn || els.memoTextColorBtn.disabled) return;
  els.memoTextColorPalette.hidden = !open;
  els.memoTextColorBtn.classList.toggle("is-open", open);
  els.memoTextColorBtn.setAttribute("aria-expanded", String(open));
  if (open) positionMemoFormatPanel();
}

function setMemoTextColorPreview(color) {
  const option = getMemoPaletteOption(color);
  state.memoTextColor = option.value;
  els.memoTextColorBtn?.style.setProperty("--memo-current-color", option.value);
  if (els.memoTextColorLabel) els.memoTextColorLabel.textContent = option.label;
  updateMemoColorSwatchSelection(option.value);
}

function createMemoTextColorSwatch(option) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "memo-color-swatch";
  button.dataset.color = option.value;
  button.title = option.label;
  button.setAttribute("aria-label", option.label);
  button.style.setProperty("--memo-swatch-color", option.value);
  button.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    const nextColor = state.memoTextColor === option.value && option.value !== MEMO_DEFAULT_TEXT_COLOR
      ? MEMO_DEFAULT_TEXT_COLOR
      : option.value;
    applyMemoTextStyle({ color: nextColor });
  });
  return button;
}

function renderMemoTextColorPalette() {
  if (!els.memoTextColorPalette) return;
  els.memoTextColorPalette.innerHTML = "";
  MEMO_TEXT_COLOR_PALETTE.forEach(option => {
    els.memoTextColorPalette.appendChild(createMemoTextColorSwatch(option));
  });
  setMemoTextColorPreview(MEMO_DEFAULT_TEXT_COLOR);
}

function getMemoPaletteOption(color) {
  const normalized = normalizeMindMapColor(color) || MEMO_DEFAULT_TEXT_COLOR;
  return MEMO_TEXT_COLOR_PALETTE.find(option => option.value === normalized) ||
    MEMO_TEXT_COLOR_PALETTE.find(option => option.value === MEMO_DEFAULT_TEXT_COLOR) ||
    { label: "黒", value: MEMO_DEFAULT_TEXT_COLOR };
}

function updateMemoColorSwatchSelection(color) {
  if (!els.memoTextColorPalette) return;
  const selected = getMemoPaletteOption(color).value;
  els.memoTextColorPalette.querySelectorAll(".memo-color-swatch").forEach(button => {
    const active = button.dataset.color === selected;
    button.classList.toggle("is-selected", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function closeMemoHighlightPalette() {
  if (!els.memoHighlightPalette || !els.memoHighlightBtn) return;
  els.memoHighlightPalette.hidden = true;
  els.memoHighlightBtn.classList.remove("is-open");
  els.memoHighlightBtn.setAttribute("aria-expanded", "false");
}

function setMemoHighlightPaletteOpen(open) {
  if (!els.memoHighlightPalette || !els.memoHighlightBtn || els.memoHighlightBtn.disabled) return;
  els.memoHighlightPalette.hidden = !open;
  els.memoHighlightBtn.classList.toggle("is-open", open);
  els.memoHighlightBtn.setAttribute("aria-expanded", String(open));
  if (open) positionMemoFormatPanel();
}

function getMemoHighlightPaletteOption(color) {
  const normalized = normalizeMindMapColor(color);
  return MEMO_HIGHLIGHT_COLOR_PALETTE.find(option => option.value === normalized) ||
    { label: "ハイライト", value: MEMO_NO_HIGHLIGHT };
}

function setMemoHighlightPreview(color) {
  const option = getMemoHighlightPaletteOption(color);
  state.memoHighlightColor = option.value;
  els.memoHighlightBtn?.style.setProperty("--memo-current-color", option.value || "transparent");
  if (els.memoHighlightLabel) els.memoHighlightLabel.textContent = option.label;
  updateMemoHighlightSwatchSelection(option.value);
}

function createMemoHighlightSwatch(option) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "memo-color-swatch";
  button.dataset.color = option.value;
  button.title = option.label;
  button.setAttribute("aria-label", option.label);
  button.style.setProperty("--memo-swatch-color", option.value);
  button.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    const nextHighlight = state.memoHighlightColor === option.value ? MEMO_NO_HIGHLIGHT : option.value;
    applyMemoTextStyle({ highlight: nextHighlight });
  });
  return button;
}

function renderMemoHighlightPalette() {
  if (!els.memoHighlightPalette) return;
  els.memoHighlightPalette.innerHTML = "";
  MEMO_HIGHLIGHT_COLOR_PALETTE.forEach(option => {
    els.memoHighlightPalette.appendChild(createMemoHighlightSwatch(option));
  });
  setMemoHighlightPreview(MEMO_NO_HIGHLIGHT);
}

function updateMemoHighlightSwatchSelection(color) {
  if (!els.memoHighlightPalette) return;
  const selected = getMemoHighlightPaletteOption(color).value;
  els.memoHighlightPalette.querySelectorAll(".memo-color-swatch").forEach(button => {
    const active = button.dataset.color === selected && Boolean(selected);
    button.classList.toggle("is-selected", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function setMemoToggleActive(button, active) {
  if (!button) return;
  button.classList.toggle("is-active", Boolean(active));
  button.setAttribute("aria-pressed", String(Boolean(active)));
}

function normalizeMemoHeadingLevel(level) {
  return ["normal", "subheading", "heading"].includes(level) ? level : "normal";
}

function setMemoFormatUi({ color = state.memoTextColor, highlight = state.memoHighlightColor, strike = state.memoStrikeActive, headingLevel = state.memoHeadingLevel } = {}) {
  setMemoTextColorPreview(color);
  setMemoHighlightPreview(highlight);
  state.memoStrikeActive = Boolean(strike);
  state.memoHeadingLevel = normalizeMemoHeadingLevel(headingLevel);
  setMemoToggleActive(els.memoTextColorBtn, state.memoTextColor !== MEMO_DEFAULT_TEXT_COLOR);
  setMemoToggleActive(els.memoHighlightBtn, Boolean(state.memoHighlightColor));
  setMemoToggleActive(els.memoStrikeBtn, state.memoStrikeActive);
  setMemoToggleActive(els.memoSubheadingBtn, state.memoHeadingLevel === "subheading");
  setMemoToggleActive(els.memoHeadingBtn, state.memoHeadingLevel === "heading");
}

function cssColorToHex(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (MINDMAP_HEX_COLOR_RE.test(raw)) return raw;
  const match = raw.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;
  const toHex = n => Math.max(0, Math.min(255, Number(n) || 0)).toString(16).padStart(2, "0");
  return `#${toHex(match[1])}${toHex(match[2])}${toHex(match[3])}`;
}

function getMemoPaletteColorFromCss(value) {
  const hex = cssColorToHex(value);
  if (!hex) return MEMO_DEFAULT_TEXT_COLOR;
  if (hex === "#ffffff") return MEMO_DEFAULT_TEXT_COLOR;
  const match = MEMO_TEXT_COLOR_PALETTE.find(option => option.value === hex);
  if (match) return match.value;

  const rgb = hexToRgb(hex);
  const nearest = MEMO_TEXT_COLOR_PALETTE
    .map(option => {
      const optionRgb = hexToRgb(option.value);
      const distance =
        (rgb.r - optionRgb.r) ** 2 +
        (rgb.g - optionRgb.g) ** 2 +
        (rgb.b - optionRgb.b) ** 2;
      return { option, distance };
    })
    .sort((a, b) => a.distance - b.distance)[0]?.option;
  return nearest?.value || MEMO_DEFAULT_TEXT_COLOR;
}

function getMemoHighlightColorFromCss(value) {
  const hex = cssColorToHex(value);
  if (!hex) return MEMO_NO_HIGHLIGHT;
  const match = MEMO_HIGHLIGHT_COLOR_PALETTE.find(option => option.value === hex);
  return match?.value || MEMO_NO_HIGHLIGHT;
}

function nodeIsInMemoEditor(node) {
  if (!node) return false;
  if (node === els.contentInput) return true;
  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  return Boolean(element && els.contentInput.contains(element));
}

function rangeIsInMemoEditor(range) {
  return Boolean(range &&
    nodeIsInMemoEditor(range.startContainer) &&
    nodeIsInMemoEditor(range.endContainer));
}

function getCurrentMemoSelectionRange() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!rangeIsInMemoEditor(range)) return null;
  return range.cloneRange();
}

function resetMemoFormatUiSelection() {
  state.memoFormatRange = null;
  setMemoFormatUi({ color: MEMO_DEFAULT_TEXT_COLOR, highlight: MEMO_NO_HIGHLIGHT, strike: false, headingLevel: "normal" });
}

function saveMemoFormatSelection() {
  if (state.isApplyingMemoFormat) return;
  const range = getCurrentMemoSelectionRange();
  if (!range || range.collapsed) {
    if (getSelectedNote()) resetMemoFormatUiSelection();
    return;
  }
  state.memoFormatRange = range.cloneRange();
  setMemoFormatUi(getMemoFormatStateFromRange(range));
}

function getMemoFormatRange() {
  const currentRange = getCurrentMemoSelectionRange();
  if (currentRange && !currentRange.collapsed) {
    state.memoFormatRange = currentRange.cloneRange();
    return currentRange;
  }
  const range = state.memoFormatRange;
  if (!range || range.collapsed || !rangeIsInMemoEditor(range)) return null;
  return range.cloneRange();
}

function restoreMemoFormatRange(range) {
  els.contentInput.focus();
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function getMemoElementFromNode(node) {
  if (!node) return null;
  if (node.nodeType === Node.ELEMENT_NODE) return node;
  return node.parentElement;
}

function getMemoReferenceNode(range) {
  if (!range) return null;
  let node = range.startContainer;
  if (node.nodeType === Node.ELEMENT_NODE) {
    if (!range.collapsed && node.childNodes[range.startOffset]) {
      return node.childNodes[range.startOffset];
    }
    if (range.startOffset > 0 && node.childNodes[range.startOffset - 1]) {
      return node.childNodes[range.startOffset - 1];
    }
    return node.childNodes[range.startOffset] || node;
  }
  return node;
}

function getMemoStrikeStateFromRange(range, element) {
  if (!range) return state.memoStrikeActive;
  if (element?.closest?.(".memo-text-strike") || element?.querySelector?.(".memo-text-strike")) {
    return true;
  }
  if (element) {
    const decoration = window.getComputedStyle(element).textDecorationLine || "";
    if (decoration.includes("line-through")) return true;
  }
  const fragment = range.cloneContents();
  return getMemoMatchingElements(fragment, ".memo-text-strike").length > 0;
}

function getMemoFormatStateFromRange(range) {
  const element = getMemoElementFromNode(getMemoReferenceNode(range));
  if (!element || !els.contentInput.contains(element)) {
    return {
      color: state.memoTextColor,
      highlight: state.memoHighlightColor,
      strike: state.memoStrikeActive,
      headingLevel: state.memoHeadingLevel,
    };
  }

  const colorElement = element.closest?.("[style*='color']") || element;
  const computed = window.getComputedStyle(colorElement);
  const highlightElement = element.closest?.("[style*='background-color']");
  const decoration = window.getComputedStyle(element).textDecorationLine || "";
  const headingElement = element.closest?.(".memo-text-heading, .memo-text-subheading, .memo-text-normal");
  const headingLevel = headingElement?.classList.contains("memo-text-heading")
    ? "heading"
    : (headingElement?.classList.contains("memo-text-subheading") ? "subheading" : "normal");
  return {
    color: getMemoPaletteColorFromCss(colorElement.style?.color || computed.color),
    highlight: highlightElement
      ? getMemoHighlightColorFromCss(highlightElement.style.backgroundColor)
      : MEMO_NO_HIGHLIGHT,
    strike: getMemoStrikeStateFromRange(range, element) || decoration.includes("line-through"),
    headingLevel,
  };
}

function updateMemoFormatUiFromSelection() {
  if (state.isApplyingMemoFormat) return;
  if (!getSelectedNote()) {
    setMemoFormatEnabled(false);
    return;
  }
  const range = getCurrentMemoSelectionRange();
  if (!range || range.collapsed) {
    resetMemoFormatUiSelection();
    return;
  }
  state.memoFormatRange = range.cloneRange();
  setMemoFormatUi(getMemoFormatStateFromRange(range));
}

function selectedFragmentHasText(fragment) {
  return Boolean(fragment.textContent.replace(/\u200b/g, "").trim());
}

function getMemoMatchingElements(root, selector) {
  if (!root) return [];
  const elements = [];
  if (root.nodeType === Node.ELEMENT_NODE && root.matches?.(selector)) {
    elements.push(root);
  }
  if (root.querySelectorAll) {
    elements.push(...root.querySelectorAll(selector));
  }
  return elements;
}

function removeMemoHeadingClasses(root) {
  getMemoMatchingElements(root, ".memo-text-heading, .memo-text-subheading, .memo-text-normal").forEach(element => {
    element.classList.remove("memo-text-heading", "memo-text-subheading", "memo-text-normal");
    if (element.tagName === "SPAN" && element.className.trim() === "" && !element.getAttribute("style")) {
      element.replaceWith(...element.childNodes);
    }
  });
}

function removeMemoColorStyles(root) {
  getMemoMatchingElements(root, "[style*='color'], .memo-text-white").forEach(element => {
    element.style.removeProperty("color");
    element.classList.remove("memo-text-white");
    if (element.tagName === "SPAN" && element.className.trim() === "" && !element.getAttribute("style")) {
      element.replaceWith(...element.childNodes);
    }
  });
}

function removeMemoHighlightStyles(root) {
  getMemoMatchingElements(root, "[style*='background-color']").forEach(element => {
    element.style.removeProperty("background-color");
    if (element.tagName === "SPAN" && element.className.trim() === "" && !element.getAttribute("style")) {
      element.replaceWith(...element.childNodes);
    }
  });
}

function removeMemoStrikeClasses(root) {
  getMemoMatchingElements(root, ".memo-text-strike").forEach(element => {
    element.classList.remove("memo-text-strike");
    if (element.tagName === "SPAN" && element.className.trim() === "" && !element.getAttribute("style")) {
      element.replaceWith(...element.childNodes);
    }
  });
}

function getMemoHeadingClass(level) {
  if (level === "heading") return "memo-text-heading";
  if (level === "subheading") return "memo-text-subheading";
  if (level === "normal") return "memo-text-normal";
  return "";
}

// 行頭で「マーカー + 半角スペース」の後ろに文字を入力した時点で、その文字ごと
// 指定の見た目（クラスまたはインラインstyle）へ変換する
// （見出し「# 」「## 」・取り消し線「~ 」・文字色「[色名] 」で共通利用）。
// マーカーとスペースだけ（まだ後ろに文字がない状態）では何も変化させない。
// 既存のツールバー（選択範囲をspanで囲む方式）とは別実装にし、既存の装飾処理には触れない。
function tryApplyMemoLineStartFormatShortcut(markerPattern, resolveSpanConfig) {
  if (!getSelectedNote()) return false;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return false;

  const range = selection.getRangeAt(0);
  const container = range.startContainer;
  // 行頭の生テキストノードのみ対象。改行はBR、またはブラウザがEnterで挿入するDIV/Pの形を取りうるため、
  // 直接の親がcontentInputかどうかではなく、contentInput配下にあるかどうかで判定する。
  if (container.nodeType !== Node.TEXT_NODE || !els.contentInput.contains(container)) return false;

  const previousSibling = container.previousSibling;
  if (previousSibling && previousSibling.nodeName !== "BR") return false;

  // 改行直後の行は、直前の書式spanの解除跡としてゼロ幅スペースが先頭に残ることがあるため、
  // 判定前に読み飛ばす。またマーカー後の空白はブラウザがnbspに変換することがあるため両方許容する。
  // 判定はキャレットより前だけでなく行全体（テキストノード全体）に対して行う。
  // これにより「先に文字を打ってから先頭にマーカーを付け足す」という順番でも変換される。
  const rawText = container.textContent;
  const leadingZwsLength = /^​*/.exec(rawText)[0].length;
  const lineText = rawText.slice(leadingZwsLength);
  const match = markerPattern.exec(lineText);
  if (!match) return false;

  const config = resolveSpanConfig(match);
  if (!config) return false;

  const remainderText = match[match.length - 1];
  const prefixLength = leadingZwsLength + match[0].length - remainderText.length;
  const caretOffsetInRemainder = range.startOffset - prefixLength;

  state.isApplyingMemoFormat = true;
  try {
    const remainder = container.textContent.slice(prefixLength);
    const span = document.createElement("span");
    if (config.className) span.className = config.className;
    if (config.style) Object.assign(span.style, config.style);
    const textNode = document.createTextNode(remainder);
    span.appendChild(textNode);
    container.parentNode.replaceChild(span, container);

    const newRange = document.createRange();
    newRange.setStart(textNode, Math.max(0, Math.min(remainder.length, caretOffsetInRemainder)));
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    updateEmptyState();
    updateMemoFormatUiFromSelection();
    scheduleSave();
  } finally {
    setTimeout(() => { state.isApplyingMemoFormat = false; }, 0);
  }
  return true;
}

function tryApplyMemoHeadingShortcut() {
  return tryApplyMemoLineStartFormatShortcut(
    /^(#{1,2})[  ](.+)$/,
    match => ({ className: match[1].length === 1 ? "memo-text-heading" : "memo-text-subheading" })
  );
}

function tryApplyMemoStrikeShortcut() {
  return tryApplyMemoLineStartFormatShortcut(/^~[  ](.+)$/, () => ({ className: "memo-text-strike" }));
}

// 「色名」は既存の文字色パレット（日本語名・英語名どちらも）から解決する。
// パレットに無い色名を書いた場合は何もしない（誤変換を避ける）。
const MEMO_COLOR_SHORTCUT_ALIASES = {
  "黒": "#111827", "black": "#111827",
  "赤": "#ef4444", "red": "#ef4444",
  "青": "#3b82f6", "blue": "#3b82f6",
  "黄色": "#facc15", "黄": "#facc15", "yellow": "#facc15",
  "緑": "#22c55e", "green": "#22c55e",
  "紫": "#a855f7", "purple": "#a855f7",
  "ピンク": "#ec4899", "pink": "#ec4899",
  "オレンジ": "#f97316", "orange": "#f97316",
};

function resolveMemoColorShortcutName(name) {
  const normalized = String(name ?? "").trim().toLowerCase();
  if (!normalized) return null;
  return Object.prototype.hasOwnProperty.call(MEMO_COLOR_SHORTCUT_ALIASES, normalized)
    ? MEMO_COLOR_SHORTCUT_ALIASES[normalized]
    : null;
}

function tryApplyMemoColorShortcut() {
  return tryApplyMemoLineStartFormatShortcut(/^[\[［]([^\]］]{1,8})[\]］][  ](.+)$/, match => {
    const colorValue = resolveMemoColorShortcutName(match[1]);
    if (!colorValue) return null;
    return { style: { color: colorValue } };
  });
}

// ハイライトの色は文字色の名前とは別（薄いパレット色）なので、専用の対応表で解決する。
const MEMO_HIGHLIGHT_SHORTCUT_ALIASES = {
  "黄色": "#fef08a", "黄": "#fef08a", "yellow": "#fef08a",
  "緑": "#bbf7d0", "green": "#bbf7d0",
  "青": "#bfdbfe", "blue": "#bfdbfe",
  "赤": "#fecaca", "red": "#fecaca",
  "紫": "#e9d5ff", "purple": "#e9d5ff",
  "ピンク": "#fbcfe8", "pink": "#fbcfe8",
  "オレンジ": "#fed7aa", "orange": "#fed7aa",
  "白": "#ffffff", "white": "#ffffff",
};

function resolveMemoHighlightShortcutName(name) {
  const normalized = String(name ?? "").trim().toLowerCase();
  if (!normalized) return null;
  return Object.prototype.hasOwnProperty.call(MEMO_HIGHLIGHT_SHORTCUT_ALIASES, normalized)
    ? MEMO_HIGHLIGHT_SHORTCUT_ALIASES[normalized]
    : null;
}

function tryApplyMemoHighlightShortcut() {
  return tryApplyMemoLineStartFormatShortcut(/^[{｛]([^}｝]{1,8})[}｝][  ](.+)$/, match => {
    const highlightValue = resolveMemoHighlightShortcutName(match[1]);
    if (!highlightValue) return null;
    return { style: { backgroundColor: highlightValue } };
  });
}

// 行頭に「= 」を入力すると、その行に付いている見出し・取り消し線・文字色・
// ハイライトなどの装飾をまとめて解除してプレーンな文字に戻す。ネストして
// 複数の装飾が付いている場合も、一番外側までまとめて解除する。
function tryApplyMemoClearFormatShortcut() {
  if (!getSelectedNote()) return false;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return false;

  const range = selection.getRangeAt(0);
  const container = range.startContainer;
  if (container.nodeType !== Node.TEXT_NODE || !els.contentInput.contains(container)) return false;

  const formatSelector = ".memo-text-heading, .memo-text-subheading, .memo-text-strike, [style*='color']";
  const innerSpan = container.parentElement?.closest?.(formatSelector);
  if (!innerSpan || !els.contentInput.contains(innerSpan)) return false;
  if (innerSpan.firstChild !== container) return false;

  let outerSpan = innerSpan;
  while (true) {
    const next = outerSpan.parentElement?.closest?.(formatSelector);
    if (!next || !els.contentInput.contains(next) || next.firstChild !== outerSpan) break;
    outerSpan = next;
  }

  const spanPreviousSibling = outerSpan.previousSibling;
  if (spanPreviousSibling && spanPreviousSibling.nodeName !== "BR") return false;

  const rawText = container.textContent;
  const leadingZwsLength = /^​*/.exec(rawText)[0].length;
  const lineText = rawText.slice(leadingZwsLength);
  const match = /^=[  ](.+)$/.exec(lineText);
  if (!match) return false;

  const prefixLength = leadingZwsLength + 2;
  const caretOffsetInRemainder = range.startOffset - prefixLength;

  state.isApplyingMemoFormat = true;
  try {
    const remainder = container.textContent.slice(prefixLength);
    const textNode = document.createTextNode(remainder);
    outerSpan.replaceWith(textNode);

    const newRange = document.createRange();
    newRange.setStart(textNode, Math.max(0, Math.min(remainder.length, caretOffsetInRemainder)));
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    updateEmptyState();
    updateMemoFormatUiFromSelection();
    scheduleSave();
  } finally {
    setTimeout(() => { state.isApplyingMemoFormat = false; }, 0);
  }
  return true;
}

// 見出し/小見出しspan内の文字を全部消したとき、その空spanにカーソルが残って
// 次に打つ文字までその書式を引き継いでしまうのを防ぐ。文字が無くなったら書式ごと解除する。
function pruneEmptyMemoHeadingSpanAtCaret() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  const node = range.startContainer;

  // まとめて選択して削除した場合など、削除後のキャレットが空spanの「中」ではなく
  // 親要素側のオフセット（空spanの直前・直後）として報告されるケースがあるため、
  // キャレット自身の祖先だけでなく、隣接する子要素も候補としてチェックする。
  const candidates = [];
  if (node.nodeType === Node.TEXT_NODE) {
    candidates.push(node.parentElement);
  } else {
    candidates.push(node.childNodes[range.startOffset - 1]);
    candidates.push(node.childNodes[range.startOffset]);
    candidates.push(node);
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    const element = candidate.nodeType === Node.ELEMENT_NODE ? candidate : candidate.parentElement;
    const headingSpan = element?.closest?.(".memo-text-heading, .memo-text-subheading, .memo-text-strike, [style*='color']");
    if (!headingSpan || !els.contentInput.contains(headingSpan)) continue;
    if (headingSpan.textContent.replace(/​/g, "").trim()) continue;

    const parent = headingSpan.parentNode;
    if (!parent) continue;
    const caretWasInside = headingSpan.contains(node);

    const anchor = document.createTextNode("​");
    parent.replaceChild(anchor, headingSpan);

    if (caretWasInside) {
      const newRange = document.createRange();
      newRange.setStart(anchor, 1);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    return;
  }
}

// ハイライト(background-color)は、ブラウザが「直前まで効いていた書式」を復元するとき、
// <font>のような専用タグを使わずこのアプリ自身が作るspanと同じ形（styleのbackground-color）
// で復元してしまうため、他の書式のようにCSSやDOMの後始末だけでは見分けて打ち消せない。
// そこで、削除操作によって行が空になった直後にフォーカスを出し入れし、ブラウザ内部の
// 「直前の書式」キャッシュそのものをリセットする。ただし同じinputイベントの中で行っても
// 効果が無く、かつリセットが実際に効く前に別の入力が来ていたら実行してはいけない
// （キャレット位置がずれて入力が乱れる不具合の原因になるため）。
function resetStickyHighlightIfLineEmptiedByDeletion(inputType) {
  if (!inputType || !inputType.startsWith("delete")) return;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  const node = range.startContainer;
  const el = els.contentInput;
  if (!el.contains(node) && node !== el) return;

  let line = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  while (line && line !== el && line.parentNode !== el) line = line.parentNode;
  if (!line) return;

  if (line.textContent.replace(/​/g, "").trim()) return;

  const savedNode = node;
  const savedOffset = range.startOffset;
  setTimeout(() => {
    if (!el.isConnected) return;
    const currentSelection = window.getSelection();
    if (!currentSelection || currentSelection.rangeCount === 0 || !currentSelection.isCollapsed) return;
    const currentRange = currentSelection.getRangeAt(0);
    // この間に別の入力があってキャレット位置が動いていたら、古い状態を復元してしまうため中断する。
    if (currentRange.startContainer !== savedNode || currentRange.startOffset !== savedOffset) return;

    el.blur();
    el.focus();
    const restoredRange = document.createRange();
    restoredRange.setStart(savedNode, savedOffset);
    restoredRange.collapse(true);
    currentSelection.removeAllRanges();
    currentSelection.addRange(restoredRange);
  }, 0);
}

// Chromeは「その位置で最後に効いていた書式（太字・文字サイズなど）」をDOMとは別に
// 内部で覚えていて、見出しspanが空になって消えたあとにそこへ文字を打つと、
// このアプリでは使っていないはずの<b>タグや文字サイズのインラインstyleとして
// 勝手に復元してしまうことがある。このアプリ自身はfont-size/font-weightを
// インラインstyleで付けることも<b>タグを使うこともないため、見つけ次第
// 書式を剥がして良い（色指定などcolorだけのstyleは対象外にして残す）。
function stripNativeStickyFormatting() {
  const el = els.contentInput;
  const selection = window.getSelection();
  const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  const caretNode = range ? range.startContainer : null;
  const caretOffset = range ? range.startOffset : 0;
  let mutated = false;

  el.querySelectorAll("b, strong, i, em, u, s, strike, font").forEach(tag => {
    tag.replaceWith(...tag.childNodes);
    mutated = true;
  });

  el.querySelectorAll("[style]").forEach(styled => {
    if (styled.classList.contains("memo-text-heading") || styled.classList.contains("memo-text-subheading") || styled.classList.contains("memo-text-strike")) return;
    if (!styled.style.fontSize && !styled.style.fontWeight && !styled.style.textDecoration) return;
    styled.style.removeProperty("font-size");
    styled.style.removeProperty("font-weight");
    styled.style.removeProperty("text-decoration");
    if (!styled.getAttribute("style")) {
      styled.replaceWith(...styled.childNodes);
    }
    mutated = true;
  });

  if (!mutated || !caretNode || !el.contains(caretNode) || !selection) return;
  const maxOffset = caretNode.nodeType === Node.TEXT_NODE ? caretNode.textContent.length : caretNode.childNodes.length;
  const newRange = document.createRange();
  newRange.setStart(caretNode, Math.min(caretOffset, maxOffset));
  newRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(newRange);
}

// Shift+Enterなどで見出し/小見出しspanの中に改行(<br>)が入ると、そのまま次の行も
// 同じspanの中に居続けてしまい太字が続いてしまう。見出しは「#」を付けたその1行だけに
// 適用したいので、span内に改行ができた時点で、改行より後ろの内容を書式無しのspan外へ追い出す。
function splitMemoHeadingSpanAtLineBreak() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  const caretNode = range.startContainer;
  const caretOffset = range.startOffset;

  const element = caretNode.nodeType === Node.ELEMENT_NODE ? caretNode : caretNode.parentElement;
  const headingSpan = element?.closest?.(".memo-text-heading, .memo-text-subheading, .memo-text-strike, [style*='color']");
  if (!headingSpan || !els.contentInput.contains(headingSpan)) return;

  const br = headingSpan.querySelector("br");
  if (!br) return;
  if (!(br.compareDocumentPosition(caretNode) & Node.DOCUMENT_POSITION_FOLLOWING) && caretNode !== br) return;

  const parent = headingSpan.parentNode;
  if (!parent) return;

  const separatorBr = document.createElement("br");
  parent.insertBefore(separatorBr, headingSpan.nextSibling);

  let cursor = br.nextSibling;
  let insertBeforeNode = separatorBr.nextSibling;
  while (cursor) {
    const next = cursor.nextSibling;
    parent.insertBefore(cursor, insertBeforeNode);
    cursor = next;
  }
  br.remove();

  const newRange = document.createRange();
  if (els.contentInput.contains(caretNode)) {
    newRange.setStart(caretNode, Math.min(caretOffset, caretNode.nodeType === Node.TEXT_NODE ? caretNode.textContent.length : caretNode.childNodes.length));
  } else {
    newRange.setStartAfter(separatorBr);
  }
  newRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(newRange);
}

function getMemoHeadingLevelForAction() {
  const range = getMemoFormatRange();
  if (!range) return state.memoHeadingLevel;
  return getMemoFormatStateFromRange(range).headingLevel;
}

function getMemoStrikeForAction() {
  const range = getMemoFormatRange();
  if (!range) return state.memoStrikeActive;
  return getMemoFormatStateFromRange(range).strike;
}

function getMemoStrikeElementForRange(range) {
  const element = getMemoElementFromNode(getMemoReferenceNode(range));
  const strikeElement = element?.closest?.(".memo-text-strike");
  return strikeElement && els.contentInput.contains(strikeElement) ? strikeElement : null;
}

function applyMemoTextStyle({ color = null, highlight = null, strike = null, headingLevel = null } = {}) {
  if (!getSelectedNote()) {
    resetMemoFormatUiSelection();
    showToast("先にメモを選択してください。");
    return;
  }

  let range = getMemoFormatRange();
  if (!range || range.collapsed) {
    resetMemoFormatUiSelection();
    showToast("装飾する文字を選択してください。");
    return;
  }
  if (strike === false) {
    const strikeElement = getMemoStrikeElementForRange(range);
    if (strikeElement) {
      range = document.createRange();
      range.selectNode(strikeElement);
    }
  }

  const colorValue = color ? normalizeMindMapColor(color) : null;
  const highlightValue = highlight ? normalizeMindMapColor(highlight) : null;
  if (!selectedFragmentHasText(range.cloneContents())) {
    resetMemoFormatUiSelection();
    showToast("装飾する文字を選択してください。");
    return;
  }

  state.isApplyingMemoFormat = true;
  const fragment = range.extractContents();
  const span = document.createElement("span");
  const targetHeadingLevel = headingLevel === null ? null : normalizeMemoHeadingLevel(headingLevel);
  try {
    if (colorValue) {
      removeMemoColorStyles(fragment);
      span.style.color = colorValue;
      span.classList.toggle("memo-text-white", colorValue === "#ffffff");
    }
    if (highlight !== null) {
      removeMemoHighlightStyles(fragment);
      if (highlightValue) span.style.backgroundColor = highlightValue;
    }
    if (strike !== null) {
      removeMemoStrikeClasses(fragment);
      if (strike) span.classList.add("memo-text-strike");
    }
    if (targetHeadingLevel !== null) {
      removeMemoHeadingClasses(fragment);
      const headingClass = getMemoHeadingClass(targetHeadingLevel);
      if (headingClass) span.classList.add(headingClass);
    }
    span.appendChild(fragment);
    range.insertNode(span);

    const styledRange = document.createRange();
    styledRange.selectNode(span);
    restoreMemoFormatRange(styledRange);
    state.memoFormatRange = styledRange.cloneRange();
    setMemoFormatUi({
      color: colorValue || state.memoTextColor,
      highlight: highlight !== null ? (highlightValue || MEMO_NO_HIGHLIGHT) : state.memoHighlightColor,
      strike: strike ?? state.memoStrikeActive,
      headingLevel: targetHeadingLevel ?? state.memoHeadingLevel,
    });
    updateEmptyState();
    scheduleSave();
  } finally {
    setTimeout(() => {
      state.isApplyingMemoFormat = false;
    }, 0);
  }
}

// ── Tree render ───────────────────────────────────────────────────────────────

function renderTree() {
  const q = els.searchInput.value.trim();
  const treeCtx = createTreeRenderContext(q);
  els.tree.innerHTML = "";
  els.noteCount.textContent = `${getNotes().length}件`;

  treeCtx.childrenOf(null).forEach(note => {
    const node = renderNode(note, treeCtx);
    if (node) {
      els.tree.appendChild(createTreeInsertZone(null, note.id));
      els.tree.appendChild(node);
    }
  });
  els.tree.appendChild(createTreeInsertZone(null, null));
}

function getRootNotesForList() {
  return getNotes()
    .filter(note => note.parent_id === null)
    .sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")));
}

function getSelectedRootNoteId() {
  return state.selectedId ? (getNoteAncestorChain(state.selectedId)[0]?.id ?? null) : null;
}

async function openRootNoteFromList(noteId) {
  if (!await ensureNoteAccess(noteId)) return;
  await saveCurrentEditorNow();
  selectNote(noteId);
  closeNoteGridOverlay();
}

// カードのプレビューには親メモ自身の本文ではなく、直下の子メモのタイトル一覧を表示する
// （親メモは分類用の入れ物なだけのことが多く、本文より子メモの中身が分かる方が探しやすいため）。
function getChildNotesForCard(noteId) {
  return orderTreeChildren(noteId, getNotes().filter(n => n.parent_id === noteId));
}

// プレビューは-webkit-line-clampで見た目上4行（モバイルは3行）に収まるが、
// それより子メモが多い場合は何件省略されているか分からず中途半端に見えるため、
// 「他◯件」のバッジを出す。バッジを出す分、プレビューの表示行数を1行減らして
// カードの固定高さ（.note-grid-card）に収まるようにする。
const NOTE_GRID_PREVIEW_LINES = 4;
const NOTE_GRID_PREVIEW_LINES_MOBILE = 3;

function getNoteGridPreviewLimit() {
  return window.matchMedia("(max-width: 520px)").matches
    ? NOTE_GRID_PREVIEW_LINES_MOBILE
    : NOTE_GRID_PREVIEW_LINES;
}

// Safari/Chromeのタブ一覧のように、親メモをカード形式で並べて一目で探せるようにする。
// 縦一列のリストだった「親メモ一覧」を置き換える表示方法。
function renderNoteGrid() {
  if (!els.noteGridItems) return;
  els.noteGridItems.innerHTML = "";
  const roots = getRootNotesForList();
  const activeRootId = getSelectedRootNoteId();

  if (roots.length === 0) {
    const empty = document.createElement("p");
    empty.className = "note-grid-empty";
    empty.textContent = "親メモはまだありません。";
    els.noteGridItems.appendChild(empty);
    return;
  }

  roots.forEach(note => {
    const syncDisplayMapId = getNoteSyncDisplayMapId(note);
    const children = getChildNotesForCard(note.id);
    const previewLimit = getNoteGridPreviewLimit();
    const hasMore = children.length > previewLimit;
    const moreCount = hasMore ? children.length - (previewLimit - 1) : 0;

    const card = document.createElement("div");
    card.className = `note-grid-card${note.id === activeRootId ? " is-active" : ""}${hasMore ? " has-more" : ""}`;
    card.dataset.id = note.id;
    if (syncDisplayMapId) applySyncPairStyle(card, syncDisplayMapId);

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "note-grid-card-open";
    openBtn.dataset.action = "open";

    const titleRow = document.createElement("span");
    titleRow.className = "note-grid-card-title-row";

    const titleLine = document.createElement("span");
    titleLine.className = "note-grid-card-title";
    titleLine.textContent = note.title || "無題";
    titleRow.appendChild(titleLine);
    if (syncDisplayMapId) {
      const mapTitle = state.mindMapList.find(map => map.id === syncDisplayMapId)?.title;
      titleRow.appendChild(createSyncPairBadge(
        syncDisplayMapId,
        mapTitle ? `マインドマップ「${mapTitle}」と同期中` : "マインドマップと同期中",
      ));
    }
    openBtn.appendChild(titleRow);

    const preview = document.createElement("span");
    preview.className = "note-grid-card-preview";
    preview.textContent = children.map(child => child.title || "無題").join("\n");
    openBtn.appendChild(preview);

    const date = document.createElement("span");
    date.className = "note-grid-card-date";
    date.textContent = formatListDate(note.updated_at);
    openBtn.appendChild(date);
    card.appendChild(openBtn);

    if (hasMore) {
      // openBtnは<button>なので、その中に<button>をネストすると実機タッチで
      // 反応しないことがあるため、カード直下の兄弟要素として置く。
      const more = document.createElement("button");
      more.type = "button";
      more.className = "note-grid-card-more";
      more.dataset.action = "expand";
      more.textContent = `他${moreCount}件`;
      card.appendChild(more);
    }

    const actions = document.createElement("div");
    actions.className = "note-grid-card-actions";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "note-grid-card-icon-btn danger";
    deleteBtn.dataset.action = "delete";
    deleteBtn.title = "削除";
    deleteBtn.setAttribute("aria-label", `「${note.title || "無題"}」を削除`);
    deleteBtn.textContent = "🗑";
    deleteBtn.hidden = isCollabActive();
    actions.appendChild(deleteBtn);

    card.appendChild(actions);
    els.noteGridItems.appendChild(card);
  });
}

function openNoteGridOverlay() {
  if (!els.noteGridOverlay) return;
  closeNoteHistoryOverlay();
  hideNoteChildrenPopover();
  closeMemoFormatPanel();
  closeMemoSettingsPanel();
  closeNoteTodoPanel();
  renderNoteGrid();
  els.noteGridOverlay.hidden = false;
  document.body.classList.add("has-management-open");
  updateNoteListButton(true);
}

function closeNoteGridOverlay() {
  if (!els.noteGridOverlay || els.noteGridOverlay.hidden) return;
  els.noteGridOverlay.hidden = true;
  document.body.classList.remove("has-management-open");
  updateNoteListButton(false);
}

// 「親メモ一覧」カードのプレビューで省略された子メモを、バッジの近くの小さい
// ポップアップで全件見てそのまま開けるようにする（履歴・一覧のような別画面にはしない）。
async function openChildNoteFromPopover(noteId) {
  if (!await ensureNoteAccess(noteId)) return;
  await saveCurrentEditorNow();
  selectNote(noteId);
  closeNoteGridOverlay();
  hideNoteChildrenPopover();
}

function showNoteChildrenPopover(anchorEl, parentId) {
  if (!els.noteChildrenPopover || !anchorEl) return;
  const parent = getNotes().find(n => n.id === parentId);
  els.noteChildrenPopoverTitle.textContent = `「${parent?.title || "無題"}」の子メモ`;
  els.noteChildrenPopoverItems.innerHTML = "";

  getChildNotesForCard(parentId).forEach(child => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "ctx-item";
    item.textContent = child.title || "無題";
    item.addEventListener("click", () => openChildNoteFromPopover(child.id));
    els.noteChildrenPopoverItems.appendChild(item);
  });

  const popover = els.noteChildrenPopover;
  popover.hidden = false;
  const rect = anchorEl.getBoundingClientRect();
  popover.style.left = `${rect.left}px`;
  popover.style.top = `${rect.bottom + 4}px`;
  const pw = popover.offsetWidth, ph = popover.offsetHeight;
  if (rect.left + pw > window.innerWidth) popover.style.left = `${window.innerWidth - pw - 6}px`;
  if (rect.bottom + 4 + ph > window.innerHeight) popover.style.top = `${rect.top - ph - 4}px`;
}

function hideNoteChildrenPopover() {
  if (!els.noteChildrenPopover || els.noteChildrenPopover.hidden) return;
  els.noteChildrenPopover.hidden = true;
}

const NOTE_HISTORY_LIMIT = 50;
const NOTE_HISTORY_DAYS = 3;
// この機能を導入した日時より前のupdated_atは対象外にする（実装前の古いデータが
// 大量に履歴へ出てくるのを防ぐため）。日付を動的に計算せず固定値にすることが重要。
const NOTE_HISTORY_LAUNCH_AT = "2026-08-05T00:00:00";
const NOTE_HISTORY_CLEAR_STORAGE_PREFIX = "matome_note_history_cleared_at:";

function noteHistoryClearStorageKey(uid = state.uid) {
  return uid ? `${NOTE_HISTORY_CLEAR_STORAGE_PREFIX}${uid}` : "";
}

function getNoteHistoryClearedAt() {
  const key = noteHistoryClearStorageKey();
  if (!key) return "";
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function setNoteHistoryClearedAt(value) {
  const key = noteHistoryClearStorageKey();
  if (!key) return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorageが使えない環境では諦める（履歴機能自体は動き続ける）
  }
}

// 常に「直近3日分」だけを表示するため、実装日時・全履歴削除の実行日時・
// 3日前の時刻のうち、一番新しいものを下限として使う。
function getNoteHistoryCutoff() {
  const rollingWindowStart = nowIso(new Date(Date.now() - NOTE_HISTORY_DAYS * 24 * 60 * 60 * 1000));
  // nowIsoは秒までしか持たないため、「全履歴を削除」した直後・同じ秒に編集した分は
  // 厳密には判定できない。1件だけ一瞬残る可能性はあるが、次の編集で自然に解消するため許容する。
  return [NOTE_HISTORY_LAUNCH_AT, getNoteHistoryClearedAt(), rollingWindowStart]
    .reduce((max, value) => (value && value > max ? value : max), "");
}

// 履歴は「開いた」だけでは追加されない。updated_atはupdateNote等、実際に
// 内容・タイトル・親子関係などを変更したときだけ更新されるため、これを
// そのまま「最近操作したメモ」の判定に使う。親メモ・子メモの区別なく対象にする。
async function openNoteFromHistory(noteId) {
  if (!await ensureNoteAccess(noteId)) return;
  await saveCurrentEditorNow();
  selectNote(noteId);
  closeNoteHistoryOverlay();
}

function clearNoteHistory() {
  setNoteHistoryClearedAt(nowIso());
  renderNoteHistory();
  showToast("履歴を削除しました。");
}

function renderNoteHistory() {
  if (!els.noteHistoryItems) return;
  els.noteHistoryItems.innerHTML = "";
  const cutoff = getNoteHistoryCutoff();
  const entries = getNotes()
    .filter(note => note.updated_at && note.updated_at >= cutoff)
    .sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")))
    .slice(0, NOTE_HISTORY_LIMIT);

  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "note-grid-empty";
    empty.textContent = "履歴はまだありません。";
    els.noteHistoryItems.appendChild(empty);
    return;
  }

  entries.forEach(note => {
    const card = document.createElement("div");
    card.className = `note-grid-card${note.id === state.selectedId ? " is-active" : ""}`;
    card.dataset.id = note.id;

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "note-grid-card-open";
    openBtn.dataset.action = "open";

    const ancestors = getNoteAncestorChain(note.id).slice(0, -1);
    if (ancestors.length > 0) {
      const path = document.createElement("span");
      path.className = "note-grid-card-path";
      path.textContent = ancestors.map(a => a.title || "無題").join(" > ");
      openBtn.appendChild(path);
    }

    const title = document.createElement("span");
    title.className = "note-grid-card-title";
    title.textContent = note.title || "無題";
    openBtn.appendChild(title);

    const preview = document.createElement("span");
    preview.className = "note-grid-card-preview";
    preview.textContent = contentToPlainText(note.content).slice(0, 160);
    openBtn.appendChild(preview);

    const date = document.createElement("span");
    date.className = "note-grid-card-date";
    date.textContent = formatListDate(note.updated_at);
    openBtn.appendChild(date);
    card.appendChild(openBtn);

    card.addEventListener("click", () => openNoteFromHistory(note.id));
    els.noteHistoryItems.appendChild(card);
  });
}

function openNoteHistoryOverlay() {
  if (!els.noteHistoryOverlay) return;
  closeNoteGridOverlay();
  hideNoteChildrenPopover();
  closeMemoFormatPanel();
  closeMemoSettingsPanel();
  closeNoteTodoPanel();
  renderNoteHistory();
  els.noteHistoryOverlay.hidden = false;
  document.body.classList.add("has-management-open");
  els.noteHistoryBtn?.setAttribute("aria-expanded", "true");
}

function closeNoteHistoryOverlay() {
  if (!els.noteHistoryOverlay || els.noteHistoryOverlay.hidden) return;
  els.noteHistoryOverlay.hidden = true;
  document.body.classList.remove("has-management-open");
  els.noteHistoryBtn?.setAttribute("aria-expanded", "false");
}

async function deleteRootNoteFromGrid(noteId) {
  if (!await ensureNoteAccess(noteId)) return;
  await saveCurrentEditorNow();
  selectNote(noteId);
  closeNoteGridOverlay();
  await deleteSelectedNote();
}

// ── TODOリスト ────────────────────────────────────────────────────────────────

function updateTodoButton() {
  if (!els.noteTodoCount) return;
  const pending = getVisibleTodos().filter(todo => !todo.done).length;
  els.noteTodoCount.textContent = String(pending);
  els.noteTodoCount.hidden = pending === 0;
}

function getTodoNote(todo) {
  return getNotes().find(note => note.id === todo.note_id) ?? null;
}

function getTodosForNote(noteId) {
  if (!noteId) return [];
  return state.todos.filter(todo => todo.note_id === noteId);
}

function todoAddedSortKey(todo) {
  return String(todo.created_at ?? "");
}

function compareTodoAddedAt(a, b) {
  const createdDiff = todoAddedSortKey(b).localeCompare(todoAddedSortKey(a), "ja");
  if (createdDiff !== 0) return createdDiff;
  return String(b.id ?? "").localeCompare(String(a.id ?? ""), "ja");
}

function compareTodoRepresentative(a, b) {
  if (Boolean(a.done) !== Boolean(b.done)) return a.done ? 1 : -1;
  return compareTodoAddedAt(a, b);
}

function getTodoForNote(noteId) {
  return getTodosForNote(noteId).sort(compareTodoRepresentative)[0] ?? null;
}

function getRelatedTodos(todo) {
  if (!todo) return [];
  return todo.note_id ? getTodosForNote(todo.note_id) : [todo];
}

function getVisibleTodos() {
  const grouped = new Map();
  state.todos.forEach(todo => {
    const key = todo.note_id ? `note:${todo.note_id}` : `todo:${todo.id}`;
    const current = grouped.get(key);
    if (!current || compareTodoRepresentative(todo, current) < 0) {
      grouped.set(key, todo);
    }
  });
  return [...grouped.values()];
}

function updateMemoTodoButton() {
  const btn = els.memoTodoBtn;
  if (!btn) return;
  const note = state.selectedId ? getNotes().find(n => n.id === state.selectedId) : null;
  const existingTodo = note ? getTodoForNote(note.id) : null;
  const readOnly = isGuestReadOnly();
  const added = Boolean(existingTodo);

  btn.classList.toggle("is-added", added);
  btn.setAttribute("aria-pressed", String(added));

  if (!note) {
    btn.disabled = true;
    btn.title = "メモを選択するとTODOに追加できます";
    btn.setAttribute("aria-label", "TODO追加");
    setButtonContent(btn, "📋", "TODO追加");
  } else if (added) {
    btn.disabled = true;
    btn.title = "このメモはTODOに追加済みです";
    btn.setAttribute("aria-label", "TODO追加済み");
    setButtonContent(btn, "✓", "追加済み");
  } else {
    btn.disabled = readOnly;
    btn.title = readOnly ? "ホストが閲覧専用に設定しています" : "選択中のメモをTODOに追加";
    btn.setAttribute("aria-label", "TODO追加");
    setButtonContent(btn, "📋", "TODO追加");
  }
}

function getTodoDisplayContext(todo) {
  const note = getTodoNote(todo);
  if (!note) {
    const label = `${todo.title || "無題"}（削除済み）`;
    return {
      note,
      label,
      depth: 0,
      breadcrumb: "元メモは削除済み",
      fullPath: label,
    };
  }

  const chain = getNoteAncestorChain(note.id);
  const titles = chain.map(item => item.title || "無題");
  const parents = titles.slice(0, -1);
  return {
    note,
    label: note.title || "無題",
    depth: Math.max(0, chain.length - 1),
    breadcrumb: parents.length ? parents.join(" › ") : "最上位メモ",
    fullPath: titles.join(" › "),
  };
}

function sortedTodos() {
  return getVisibleTodos().sort(compareTodoAddedAt);
}

function renderTodoList() {
  if (!els.noteTodoItems) return;
  els.noteTodoItems.innerHTML = "";
  const todos = sortedTodos();

  if (todos.length === 0) {
    const empty = document.createElement("li");
    empty.className = "note-list-empty";
    empty.textContent = "TODOはまだありません。メモ設定または右クリックから「TODO追加」を選んでください。";
    els.noteTodoItems.appendChild(empty);
    updateTodoButton();
    return;
  }

  todos.forEach(todo => {
    const { note, label, depth, breadcrumb, fullPath } = getTodoDisplayContext(todo);

    const item = document.createElement("li");
    item.className = `mindmap-list-item todo-list-item${todo.done ? " is-done" : ""}`;
    item.classList.toggle("has-parent", depth > 0);
    item.dataset.id = todo.id;

    const checkbox = document.createElement("button");
    checkbox.type = "button";
    checkbox.className = "todo-checkbox";
    checkbox.dataset.action = "toggle";
    checkbox.title = todo.done ? "未完了に戻す" : "完了にする";
    checkbox.setAttribute("aria-label", `「${label}」を${todo.done ? "未完了に戻す" : "完了にする"}`);
    checkbox.setAttribute("aria-pressed", String(Boolean(todo.done)));
    checkbox.textContent = todo.done ? "☑" : "☐";
    item.appendChild(checkbox);

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "mindmap-list-open";
    openBtn.dataset.action = "open-note";
    openBtn.title = fullPath;
    openBtn.setAttribute("aria-label", `「${label}」のメモを開く`);
    openBtn.disabled = !note;

    const titleLine = document.createElement("span");
    titleLine.className = "mindmap-list-title-line";

    const title = document.createElement("span");
    title.className = "mindmap-list-title";
    title.textContent = label;
    titleLine.appendChild(title);
    openBtn.appendChild(titleLine);

    const hierarchy = document.createElement("span");
    hierarchy.className = "todo-hierarchy";
    hierarchy.textContent = breadcrumb;
    hierarchy.title = fullPath;
    openBtn.appendChild(hierarchy);
    item.appendChild(openBtn);

    const actions = document.createElement("div");
    actions.className = "mindmap-list-actions";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "mindmap-list-icon-btn danger";
    deleteBtn.dataset.action = "delete";
    deleteBtn.title = "TODOから削除";
    deleteBtn.setAttribute("aria-label", `「${label}」をTODOから削除`);
    deleteBtn.textContent = "🗑";
    actions.appendChild(deleteBtn);

    item.appendChild(actions);
    els.noteTodoItems.appendChild(item);
  });

  updateTodoButton();
}

function updateNoteTodoButton(open) {
  const isOpen = Boolean(open);
  els.noteTodoBtn?.setAttribute("aria-expanded", String(isOpen));
  els.noteTodoBtn?.setAttribute("aria-label", isOpen ? "TODOリストを閉じる" : "TODOリストを開く");
  if (els.noteTodoBtn) els.noteTodoBtn.title = isOpen ? "TODOリストを閉じる" : "TODOリストを開く";
}

function openNoteTodoPanel() {
  if (!els.noteTodoPanel) return;
  closeMemoFormatPanel();
  closeMemoSettingsPanel();
  closeNoteGridOverlay();
  closeNoteHistoryOverlay();
  hideNoteChildrenPopover();
  renderTodoList();
  els.noteTodoPanel.hidden = false;
  document.body.classList.add("has-management-open");
  updateNoteTodoButton(true);
}

function closeNoteTodoPanel() {
  if (!els.noteTodoPanel || els.noteTodoPanel.hidden) return;
  els.noteTodoPanel.hidden = true;
  document.body.classList.remove("has-management-open");
  updateNoteTodoButton(false);
}

async function addNoteToTodoList(noteId) {
  if (blockIfGuestReadOnly()) return;
  const note = getNotes().find(n => n.id === noteId);
  if (!note) return;
  const existingTodo = getTodoForNote(noteId);
  if (existingTodo) {
    if (!els.noteTodoPanel?.hidden) renderTodoList();
    updateTodoButton();
    updateMemoTodoButton();
    showToast("このメモはすでにTODOに追加済みです。");
    return;
  }
  try {
    const todo = {
      id:         makeId(),
      note_id:    noteId,
      title:      note.title || "無題",
      done:       false,
      created_at: nowIso(),
    };
    await todosCollection().doc(todo.id).set(todo);
    state.todos.push(todo);
    if (!els.noteTodoPanel?.hidden) renderTodoList();
    updateTodoButton();
    updateMemoTodoButton();
    showToast("TODOに追加しました。");
  } catch (e) { showToast(e.message); }
}

async function toggleTodoDone(todoId) {
  const todo = state.todos.find(t => t.id === todoId);
  if (!todo) return;
  const done = !todo.done;
  const relatedTodos = getRelatedTodos(todo);
  try {
    const note = getNotes().find(n => n.id === todo.note_id);
    if (note) {
      if (blockIfGuestReadOnly()) return;
      if (!await ensureNoteAccess(todo.note_id, { keepLocked: true })) return;
      await updateNote(todo.note_id, { checked: done });
    }
    await Promise.all(relatedTodos.map(item => todosCollection().doc(item.id).set({ done }, { merge: true })));
    relatedTodos.forEach(item => { item.done = done; });
    renderTree();
    if (state.selectedId === todo.note_id) renderEditor();
    renderTodoList();
    updateMemoTodoButton();
  } catch (e) { showToast(e.message); }
}

async function deleteTodo(todoId) {
  const todo = state.todos.find(t => t.id === todoId);
  if (!todo) return;
  const relatedTodos = getRelatedTodos(todo);
  const relatedIds = new Set(relatedTodos.map(item => item.id));
  try {
    await Promise.all(relatedTodos.map(item => todosCollection().doc(item.id).delete()));
    state.todos = state.todos.filter(t => !relatedIds.has(t.id));
    renderTodoList();
    updateMemoTodoButton();
  } catch (e) { showToast(e.message); }
}

async function openNoteFromTodo(todoId) {
  const todo = state.todos.find(t => t.id === todoId);
  if (!todo) return;
  if (!await ensureNoteAccess(todo.note_id)) return;
  await saveCurrentEditorNow();
  getNoteAncestorChain(todo.note_id).forEach(note => state.expanded.add(note.id));
  selectNote(todo.note_id);
  closeNoteTodoPanel();
  els.tree.querySelector(".tree-row.active")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderNode(note, treeCtx) {
  if (!treeCtx.matches(note)) return null;

  const children  = treeCtx.childrenOf(note.id);
  const hasKids   = children.length > 0;
  const lockedClosed = Boolean(note.locked) && !state.unlockedNoteIds.has(note.id);
  const expanded  = !lockedClosed && (state.expanded.has(note.id) || treeCtx.hasQuery);
  const descCount = treeCtx.descendantCount(note.id);
  const syncDisplayMapId = getNoteSyncDisplayMapId(note);
  const editingPresences = getPresenceForNote(note.id, { editingOnly: true });

  const wrapper = document.createElement("div");
  wrapper.className = "tree-node";

  const row = document.createElement("button");
  row.className  = `tree-row${note.id === state.selectedId ? " active" : ""}${note.pinned ? " pinned" : ""}${note.checked ? " checked" : ""}${note.locked ? " locked" : ""}${lockedClosed ? " locked-closed" : ""}`;
  row.classList.toggle("has-collab-presence", editingPresences.length > 0);
  row.draggable  = !lockedClosed;
  row.dataset.id = note.id;
  if (syncDisplayMapId) applySyncPairStyle(row, syncDisplayMapId);

  const toggle = document.createElement("span");
  toggle.className   = "toggle";
  toggle.textContent = hasKids ? (expanded ? "▼" : "▶") : "•";

  const titleWrap = document.createElement("span");
  titleWrap.className = "tree-title-wrap";

  if (note.pinned && note.parent_id === null) {
    const pinIcon = document.createElement("span");
    pinIcon.className = "tree-pin";
    pinIcon.textContent = "📌";
    pinIcon.title = "ピン留め中";
    titleWrap.appendChild(pinIcon);
  }

  if (note.locked) {
    const lockIcon = document.createElement("span");
    lockIcon.className = "tree-lock";
    lockIcon.textContent = lockedClosed ? "🔒" : "🔓";
    lockIcon.title = lockedClosed ? "鍵付きメモ" : "このセッションでは開いています";
    titleWrap.appendChild(lockIcon);
  }

  if (note.checked) {
    const checkIcon = document.createElement("span");
    checkIcon.className = "tree-check";
    checkIcon.textContent = "✅";
    checkIcon.title = "チェック済み";
    titleWrap.appendChild(checkIcon);
  }

  const title = document.createElement("span");
  title.className   = "tree-title";
  title.textContent = note.title || "無題";
  title.title = "Enterで名前を変更";
  if (syncDisplayMapId) {
    const mapTitle = state.mindMapList.find(map => map.id === syncDisplayMapId)?.title;
    titleWrap.appendChild(createSyncPairBadge(
      syncDisplayMapId,
      mapTitle ? `マインドマップ「${mapTitle}」と同期中` : "マインドマップと同期中",
    ));
  }
  titleWrap.appendChild(title);

  row.append(toggle, titleWrap);

  if (descCount > 0) {
    const badge = document.createElement("span");
    badge.className   = "tree-count-badge";
    badge.textContent = descCount;
    row.appendChild(badge);
  }

  if (editingPresences.length > 0) {
    row.appendChild(createTreePresenceBadge(editingPresences));
  }

  const addBtn = document.createElement("span");
  addBtn.className   = "tree-add";
  addBtn.title       = "このメモに子メモを追加";
  setButtonContent(addBtn, "＋");
  addBtn.hidden = lockedClosed;
  row.appendChild(addBtn);

  row.addEventListener("click", async e => {
    if (shouldSuppressTreeClick()) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (addBtn.contains(e.target)) {
      e.stopPropagation();
      if (await ensureNoteAccess(note.id)) createNote(note.id);
      return;
    }
    if (isTreeToggleClick(e, row, toggle, hasKids)) {
      e.stopPropagation();
      if (!await ensureNoteAccess(note.id)) return;
      state.expanded.has(note.id) ? state.expanded.delete(note.id) : state.expanded.add(note.id);
      renderTree(); return;
    }
    await openProtectedNote(note.id);
  });

  row.addEventListener("contextmenu", e => {
    e.preventDefault(); e.stopPropagation();
    showCtxMenu(e.clientX, e.clientY, note.id);
  });

  row.addEventListener("dragstart", e => {
    if (lockedClosed) { e.preventDefault(); return; }
    e.dataTransfer.setData("text/plain", note.id);
    document.body.classList.add("is-dragging");
    state.isDraggingNote = true;
  });
  row.addEventListener("dragend", () => {
    document.body.classList.remove("is-dragging");
    state.isDraggingNote = false;
    suppressTreeClickAfterDrag();
    row.classList.remove("drag-target", "drag-before");
    stopTreeAutoScroll();
  });
  row.addEventListener("dragover", e => {
    e.preventDefault();
    clearTreeDropHighlights();
    const rect  = row.getBoundingClientRect();
    const upper = e.clientY < rect.top + rect.height * 0.38;
    row.classList.toggle("drag-before", upper);
    row.classList.toggle("drag-target",  !upper);
  });
  row.addEventListener("dragleave", () => {
    row.classList.remove("drag-target", "drag-before");
  });
  row.addEventListener("drop", async e => {
    e.preventDefault();
    suppressTreeClickAfterDrag();
    const isBefore = row.classList.contains("drag-before");
    row.classList.remove("drag-target", "drag-before");
    const id = e.dataTransfer.getData("text/plain");
    if (!id || id === note.id) return;
    try {
      if (isBefore) {
        await moveNoteToTreePosition(id, note.parent_id, note.id);
      } else {
        await moveNoteToTreePosition(id, note.id, null);
      }
    } catch (err) { showToast(err.message); }
  });

  wrapper.appendChild(row);

  if (hasKids && expanded) {
    const area = document.createElement("div");
    area.className = "tree-children";
    children.forEach(c => {
      const n = renderNode(c, treeCtx);
      if (n) {
        area.appendChild(createTreeInsertZone(note.id, c.id));
        area.appendChild(n);
      }
    });
    area.appendChild(createTreeInsertZone(note.id, null));
    wrapper.appendChild(area);
  }

  return wrapper;
}

// ── Editor render ─────────────────────────────────────────────────────────────

function renderEditor() {
  state.memoFormatRange = null;
  let note = getSelectedNote();
  const closedLock = note ? getClosedNoteLocks(note.id)[0] : null;
  if (closedLock) {
    state.selectedId = null;
    note = null;
  }
  if (!note) {
    const emptyMessage = closedLock
      ? "鍵付きメモです。開くにはパスワードを入力してください"
      : NO_SELECTION_MESSAGE;
    els.titleInput.value         = "";
    els.titleInput.placeholder   = emptyMessage;
    els.titleInput.readOnly      = true;
    els.contentInput.innerHTML   = "";
    els.contentInput.contentEditable = "false";
    els.contentInput.dataset.placeholder = emptyMessage;
    els.breadcrumb.textContent   = emptyMessage;
    els.selectedInfo.textContent = "";
    applySyncPairStyle(els.selectedInfo, null, false);
    renderCollabCaretFlags();
    els.checkBtn.disabled = true;
    els.checkBtn.classList.remove("active");
    els.checkBtn.title = "チェックを付ける";
    setButtonContent(els.checkBtn, "✓");
    els.largeEditorBtn.disabled = true;
    els.mediaBtn.disabled = true;
    els.deleteBtn.disabled = true;
    setLargeEditorOpen(false);
    if (els.noteToMindMapBtn) els.noteToMindMapBtn.disabled = true;
    updateMemoTodoButton();
    setMemoFormatUi({ color: MEMO_DEFAULT_TEXT_COLOR, highlight: MEMO_NO_HIGHLIGHT, strike: false, headingLevel: "normal" });
    setMemoFormatEnabled(false);
    updateEmptyState();
    updateUndoButton();
    return;
  }
  const readOnly = isGuestReadOnly();
  els.checkBtn.disabled = readOnly;
  els.largeEditorBtn.disabled = false;
  els.mediaBtn.disabled = readOnly;
  const isRootNote = note.parent_id === null;
  els.deleteBtn.disabled = (isCollabActive() && isRootNote) || readOnly;
  els.deleteBtn.title = isCollabActive() && isRootNote
    ? "共同作業中は親メモを削除できません"
    : readOnly ? "ホストが閲覧専用に設定しています" : "選択中のメモを削除";
  els.checkBtn.classList.toggle("active", Boolean(note.checked));
  els.checkBtn.title = note.checked ? "チェックを外す" : "チェックを付ける";
  setButtonContent(els.checkBtn, "✓");
  if (els.noteToMindMapBtn) {
    const syncBlockedForGuest = isCollabActive() && state.collabRoomRole !== "host";
    els.noteToMindMapBtn.disabled = readOnly || syncBlockedForGuest;
    els.noteToMindMapBtn.title = syncBlockedForGuest
      ? "共同作業中、マインドマップとの同期はホストだけができます"
      : "選択中のメモをマインドマップと同期";
  }
  updateMemoTodoButton();
  setMemoFormatEnabled(!readOnly);
  setMemoFormatUi({ color: MEMO_DEFAULT_TEXT_COLOR, highlight: MEMO_NO_HIGHLIGHT, strike: false, headingLevel: "normal" });
  els.contentInput.dataset.placeholder = "ここにメモを書いてください";
  els.contentInput.contentEditable = readOnly ? "false" : "true";
  els.titleInput.placeholder = "タイトル";
  const titleEditable = canEditNoteTitle(note) && !readOnly;
  els.titleInput.readOnly = !titleEditable;
  els.titleInput.title = titleEditable
    ? ""
    : readOnly ? "ホストが閲覧専用に設定しています" : "共同作業中、親メモの名前を変更できるのはホストだけです";
  els.titleInput.value = note.title;

  let html = contentToHtml(note.content);

  // 旧 media 配列 → インライン figure に変換（一度 content に書き込まれるとスキップ）
  for (const item of (note.media ?? [])) {
    if (!item.downloadURL || html.includes(item.downloadURL)) continue;
    const url     = escapeHtmlAttr(item.downloadURL);
    const isVideo = (item.mime_type || "").startsWith("video/") ||
                    /\.(mp4|mov|avi|webm|m4v|mkv)$/i.test(item.filename || "");
    const alt     = escapeHtmlAttr(item.original_name || "");
    html += isVideo
      ? `<figure class="inline-media-figure" contenteditable="false" draggable="false">` +
        `<video src="${url}" class="inline-media" controls preload="metadata" draggable="false"></video></figure>`
      : `<figure class="inline-media-figure" contenteditable="false" draggable="false" data-original-src="${url}" data-original-alt="${alt}">` +
        `<img src="${url}" alt="${alt}" class="inline-media" draggable="false"></figure>`;
  }

  els.contentInput.innerHTML = html;
  ensureMediaTextLines();
  els.breadcrumb.textContent = getParentChain(note).join(" / ");
  const src = note.source_file ? ` / 読み込み元: ${note.source_file}` : "";
  const syncDisplayMapId = getNoteSyncDisplayMapId(note);
  const syncStyle = syncDisplayMapId ? getSyncPairStyle(syncDisplayMapId) : null;
  const sync = syncStyle ? ` / ${syncStyle.label}でマインドマップと同期中` : "";
  els.selectedInfo.textContent = `作成: ${note.created_at} / 更新: ${note.updated_at}${src}${sync}`;
  applySyncPairStyle(els.selectedInfo, syncDisplayMapId, Boolean(syncDisplayMapId));
  renderCollabCaretFlags();
  els.saveStatus.textContent   = readOnly ? "閲覧専用（ホストが編集を制限中）" : "保存済み";
  updateEmptyState();
  updateUndoButton();
}

const AI_FILE_MAX_BYTES = 10 * 1024 * 1024;
const AI_FILE_EXTENSIONS = new Set([
  "txt", "md", "csv", "json", "pdf", "docx", "xlsx",
  "png", "jpg", "jpeg", "webp", "heic", "heif",
]);

function prepareAiRequest(promptInput, fileInput, errorElement) {
  const prompt = promptInput?.value.trim() || "";
  const file = fileInput?.files?.[0] || null;
  let error = "";

  if (!prompt && !file) {
    error = "テーマを入力するか、ファイルを選択してください。";
  } else if (file?.size > AI_FILE_MAX_BYTES) {
    error = "ファイルサイズは10MB以下にしてください。";
  } else if (file) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!AI_FILE_EXTENSIONS.has(extension)) {
      error = "対応形式は画像（PNG・JPEG・WebP・HEIC・HEIF）と文書ファイルです。";
    }
  }

  if (error) {
    if (errorElement) {
      errorElement.textContent = error;
      errorElement.hidden = false;
    }
    return null;
  }

  if (!file) {
    return {
      prompt,
      fetchOptions: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      },
    };
  }

  const body = new FormData();
  body.append("prompt", prompt);
  body.append("file", file, file.name);
  return { prompt, fetchOptions: { method: "POST", body } };
}

function openNoteAiPanel() {
  if (els.noteAiTitle)  els.noteAiTitle.value  = "";
  if (els.noteAiPrompt) els.noteAiPrompt.value = "";
  if (els.noteAiFile)   els.noteAiFile.value = "";
  if (els.noteAiError)  els.noteAiError.hidden = true;
  if (els.noteAiGenerateBtn) els.noteAiGenerateBtn.disabled = false;
  if (els.noteAiPanel) {
    els.noteAiPanel.hidden = false;
    els.noteAiTitle?.focus();
  }
}

function closeNoteAiPanel() {
  if (els.noteAiPanel) els.noteAiPanel.hidden = true;
}

async function generateNoteWithAI() {
  if (blockNewRootMemoInCollab()) return;
  const btn   = els.noteAiGenerateBtn;
  const errEl = els.noteAiError;
  const requestData = prepareAiRequest(els.noteAiPrompt, els.noteAiFile, errEl);
  if (!requestData) return;
  btn.disabled = true;
  btn.querySelector(".btn-label").textContent = "生成中...";
  if (errEl) errEl.hidden = true;
  try {
    const res = await fetch("/api/ai-note", requestData.fetchOptions);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "生成に失敗しました");
    const tree = json.tree;
    const userTitle = els.noteAiTitle?.value.trim();
    if (userTitle) tree.title = userTitle;
    closeNoteAiPanel();
    const created = createNotesFromTemplate(tree, null, nextOrderForNewNote(null));
    await writeNotesBatch(created);
    appendNotesIfMissing(created);
    created.forEach(note => {
      if (created.some(child => child.parent_id === note.id)) state.expanded.add(note.id);
    });
    renderTree();
    selectNote(created[0].id);
    showToast("AIメモを生成しました。");
  } catch (err) {
    if (errEl) {
      errEl.textContent = String(err.message || err);
      errEl.hidden = false;
    }
  } finally {
    btn.disabled = false;
    btn.querySelector(".btn-label").textContent = "生成";
  }
}

function selectNote(id) {
  if (isNoteAccessLocked(id)) {
    void openProtectedNote(id);
    return;
  }
  state.selectedId = id;
  // 折りたたまれた親の下にある子メモは、親メモ一覧・履歴・子メモポップアップ
  // などツリーの外から選んだ場合そもそもツリーに描画されないため、
  // 選択行が見つからずスクロールも効かない。祖先を先に開いておく。
  getNoteAncestorChain(id).slice(0, -1).forEach(ancestor => state.expanded.add(ancestor.id));
  renderTree();
  renderEditor();
  closeMobileMenu();
  setCollabPresence("viewing", { immediate: true });
  // グリッド表示や親メモ一覧などツリーの外から開いた場合、選択中のメモが
  // サイドバーのスクロール外にあることがあるため、選択行を表示範囲に入れる。
  requestAnimationFrame(() => {
    els.tree.querySelector(".tree-row.active")?.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

async function saveCurrentEditorNow() {
  if (_isComposing || state.isApplyingUndo) return;
  const note = getSelectedNote();
  if (!note) return;

  clearTimeout(state.saveTimer);
  const before = snapshotFromNote(note);
  const next = snapshotFromEditor(note.id);
  if (snapshotsEqual(before, next)) return;

  pushUndoSnapshot(before);
  const upd = await updateNote(note.id, {
    title:   next.title,
    content: next.content,
  }, false);
  const idx = state.data.notes.findIndex(n => n.id === upd.id);
  if (idx >= 0) state.data.notes[idx] = upd;
  els.saveStatus.textContent = `保存済み ${upd.updated_at}`;
}

// ── Note CRUD ─────────────────────────────────────────────────────────────────

async function loadNotes() {
  const snap = await notesCollection().get();
  state.data = {
    notes: snap.docs.map(d => ({ ...d.data(), id: d.id, locked: Boolean(d.data().locked) })),
  };
  if (!state.selectedId || !getSelectedNote() || isNoteAccessLocked(state.selectedId)) {
    const roots = orderTreeChildren(null, getNotes().filter(n => n.parent_id === null));
    state.selectedId = roots.find(note => !isNoteAccessLocked(note.id))?.id ?? null;
  }
  renderTree();
  renderEditor();
}

async function createNote(parentId) {
  try {
    if (blockIfGuestReadOnly()) return;
    const pid = parentId ?? null;
    if (pid === null && blockNewRootMemoInCollab()) return;
    if (pid && !await ensureNoteAccess(pid)) return;
    const ts  = nowIso();
    const note = {
      id:          makeId(),
      parent_id:   pid,
      title:       "新しいメモ",
      content:     "",
      created_at:  ts,
      updated_at:  ts,
      source_file: null,
      media:       [],
      pinned:      false,
      checked:     false,
      checked_at:  null,
      locked:      false,
      order:       nextOrderForNewNote(pid),
    };
    await notesCollection().doc(note.id).set(note);
    appendNotesIfMissing([note]);
    if (pid) await syncLinkedMindMapForNote(note);
    if (parentId) state.expanded.add(parentId);
    selectNote(note.id);
    els.titleInput.focus(); els.titleInput.select();
    showToast("メモを追加しました。");
  } catch (e) { showToast(e.message); }
}

async function updateNote(id, payload, reload = true) {
  const note = state.data.notes.find(n => n.id === id);
  if (!note) throw new Error("メモが見つかりません。");
  const previousParentId = note.parent_id;
  const previousMapId = getLinkedMindMapIdForNote(note);

  const updates = {};

  if ("title" in payload) {
    const title = String(payload.title ?? "").slice(0, 120);
    updates.title = title || "無題";
  }

  if ("content" in payload) {
    const content = String(payload.content ?? "");
    updates.content = content;
    updates.media = pruneOrphanedMedia(note, content);
  }

  if ("parent_id" in payload) {
    const newParentId = payload.parent_id;
    if (newParentId !== null && !getNotes().find(n => n.id === newParentId)) {
      throw new Error("移動先のメモが見つかりません。");
    }
    if (wouldCreateCycle(getNotes(), id, newParentId)) {
      throw new Error("自分自身の下には移動できません。");
    }
    updates.parent_id = newParentId;
    if (newParentId !== null) updates.pinned = false;
  }

  if ("pinned" in payload) {
    const pinned = Boolean(payload.pinned);
    const parentId = "parent_id" in updates ? updates.parent_id : note.parent_id;
    if (pinned && parentId !== null) {
      throw new Error("ピン留めできるのは最上位メモだけです。");
    }
    updates.pinned = pinned;
  }

  if ("checked" in payload) {
    const checked = Boolean(payload.checked);
    updates.checked = checked;
    updates.checked_at = checked ? nowSortableIso() : null;
  }

  if ("locked" in payload) {
    updates.locked = Boolean(payload.locked);
  }

  updates.updated_at = nowIso();

  await notesCollection().doc(id).set(updates, { merge: true });
  Object.assign(note, updates);

  if ("title" in payload || "content" in payload || "parent_id" in payload) {
    const movedLinkedRoot = "parent_id" in payload
      && previousParentId === null
      && updates.parent_id !== null
      && previousMapId;
    if (movedLinkedRoot) await unlinkMindMap(previousMapId);
    const targetParent = "parent_id" in payload && updates.parent_id
      ? getNotes().find(item => item.id === updates.parent_id)
      : null;
    const targetMapId = getLinkedMindMapIdForNote(targetParent);
    await syncLinkedMindMapForNote(note, [movedLinkedRoot ? null : previousMapId, targetMapId]);
  }

  if (reload) {
    renderTree(); renderEditor();
  }
  return note;
}

async function reorderNote(noteId, beforeId, parentId) {
  const note = getNotes().find(n => n.id === noteId);
  if (!note) throw new Error("メモが見つかりません。");
  if (beforeId === noteId) return note;

  if (parentId !== null && !getNotes().find(n => n.id === parentId)) {
    throw new Error("移動先のメモが見つかりません。");
  }
  if (beforeId) {
    const beforeNote = getNotes().find(n => n.id === beforeId);
    if (!beforeNote) throw new Error("挿入先のメモが見つかりません。");
    if (beforeNote.parent_id !== parentId) {
      throw new Error("同じ階層の間にのみ並び替えできます。");
    }
  }
  if (wouldCreateCycle(getNotes(), noteId, parentId)) {
    throw new Error("自分自身の下には移動できません。");
  }

  const previousParentId = note.parent_id;
  const previousMapId = getLinkedMindMapIdForNote(note);
  const targetParent = parentId ? getNotes().find(n => n.id === parentId) : null;
  const targetMapId = getLinkedMindMapIdForNote(targetParent);
  const order = await orderForReorder(noteId, beforeId, parentId);
  const updates = {
    parent_id:  parentId,
    order,
    updated_at: nowIso(),
  };
  if (parentId !== null) updates.pinned = false;

  await notesCollection().doc(noteId).set(updates, { merge: true });
  Object.assign(note, updates);
  const movedLinkedRoot = previousParentId === null && parentId !== null && previousMapId;
  if (movedLinkedRoot) await unlinkMindMap(previousMapId);
  await syncLinkedMindMapForNote(note, [movedLinkedRoot ? null : previousMapId, targetMapId]);
  return note;
}

async function togglePinnedNote(noteId) {
  const note = getNotes().find(n => n.id === noteId);
  if (!note) return;
  if (!await ensureNoteAccess(noteId)) return;
  if (note.parent_id !== null) {
    showToast("ピン留めできるのは最上位メモだけです。");
    return;
  }

  const nextPinned = !Boolean(note.pinned);
  try {
    await updateNote(noteId, { pinned: nextPinned });
    showToast(nextPinned ? "ピン留めしました。" : "ピン留めを解除しました。");
  } catch (e) { showToast(e.message); }
}

async function toggleCheckedNote(noteId) {
  if (blockIfGuestReadOnly()) return;
  const note = getNotes().find(n => n.id === noteId);
  if (!note) return;
  if (!await ensureNoteAccess(noteId)) return;

  const nextChecked = !Boolean(note.checked);
  try {
    await updateNote(noteId, { checked: nextChecked });
    showToast(nextChecked ? "チェックを付けました。" : "チェックを外しました。");
  } catch (e) { showToast(e.message); }
}

function scheduleSave() {
  if (_isComposing || state.isApplyingUndo) return;
  const note = getSelectedNote();
  if (!note) return;
  clearTimeout(state.saveTimer);
  els.saveStatus.textContent = "編集中...";
  updateUndoButton();
  state.saveTimer = setTimeout(async () => {
    if (_isComposing || state.isApplyingUndo) return;
    try {
      const before = snapshotFromNote(note);
      const next = snapshotFromEditor(note.id);
      if (snapshotsEqual(before, next)) {
        els.saveStatus.textContent = "保存済み";
        updateUndoButton();
        return;
      }
      pushUndoSnapshot(before);
      const upd = await updateNote(note.id, {
        title:   next.title,
        content: next.content,
      }, false);
      const idx = state.data.notes.findIndex(n => n.id === upd.id);
      if (idx >= 0) state.data.notes[idx] = upd;
      renderTree();
      els.saveStatus.textContent = `保存済み ${upd.updated_at}`;
      updateUndoButton();
    } catch (e) { els.saveStatus.textContent = "保存失敗"; showToast(e.message); }
  }, 600);
}

async function deleteSelectedNote() {
  const note = getSelectedNote();
  if (!note) return;
  if (isCollabActive() && note.parent_id === null) {
    showToast("共同作業中は親メモを削除できません。");
    return;
  }
  if (blockIfGuestReadOnly()) return;
  if (!await ensureNoteAccess(note.id)) return;
  const initialSnapshot = snapshotDeletedNotes(note.id);
  const initialDeleteIds = new Set(initialSnapshot.notes.map(item => item.id));
  const relatedMapIds = [...new Set(
    initialSnapshot.notes.map(item => item.linked_mindmap_id).filter(Boolean),
  )];
  let relatedMaps;
  try {
    relatedMaps = (await Promise.all(relatedMapIds.map(getMindMapById))).filter(Boolean);
  } catch (e) {
    showToast(e.message);
    return;
  }
  const sourceMapsBeingRemoved = NoteMindMapSync.findSyncedMapsRemovedByNoteIds(
    relatedMaps,
    initialDeleteIds,
  );
  let deleteLinkedMaps = false;
  if (sourceMapsBeingRemoved.length > 0) {
    const destination = sourceMapsBeingRemoved.length > 1
      ? `${sourceMapsBeingRemoved.length}件の同期先マインドマップ`
      : "同期先のマインドマップ";
    const decision = await showSyncedDeleteConfirm(
      `「${note.title}」の削除対象には同期済みメモが含まれます。${destination}も削除しますか？`,
      "メモだけ削除",
    );
    if (decision === false) return;
    deleteLinkedMaps = decision === true;
  } else {
    const ok = await showConfirm(`「${note.title}」とその子メモを削除しますか？`);
    if (!ok) return;
  }
  try {
    await saveCurrentEditorNow();
    const target = getSelectedNote();
    if (!target) return;
    const parentId = target.parent_id;
    const deleteSnapshot = snapshotDeletedNotes(target.id);
    const deleteIds = deleteSnapshot.notes.map(n => n.id);
    const sourceMapIds = sourceMapsBeingRemoved.map(map => map.id);
    const sourceMapIdSet = new Set(sourceMapIds);

    if (deleteLinkedMaps) await deleteNoteDocumentsWithMindMaps(deleteIds, sourceMapIds);
    else await deleteNoteDocuments(deleteIds);
    removeDeletedNotesFromState(deleteIds, parentId);
    if (deleteLinkedMaps) {
      const undoSnapshot = cloneData(deleteSnapshot);
      undoSnapshot.notes.forEach(item => {
        if (sourceMapIdSet.has(item.linked_mindmap_id)) {
          item.linked_mindmap_id = null;
          item.linked_mindmap_node_id = null;
        }
      });
      pushUndoSnapshot(undoSnapshot);
      sourceMapIds.forEach(removeMindMapFromStateAfterLinkedDelete);
    } else {
      pushUndoSnapshot(deleteSnapshot);
      for (const map of sourceMapsBeingRemoved) await unlinkMindMap(map.id);
    }
    for (const mapId of relatedMapIds) {
      if (!sourceMapIdSet.has(mapId)) await syncLinkedMindMapById(mapId);
    }
    selectNote(state.selectedId);
    showToast(deleteLinkedMaps
      ? "メモと同期先のマインドマップを削除しました。"
      : "削除しました。");
  } catch (e) { showToast(e.message); }
}

// ── テンプレート ──────────────────────────────────────────────────────────────

function renderTemplateItem(t) {
  const item = document.createElement("div");
  item.className = `template-item${t.official ? " is-official" : ""}${state.templatePreviewId === t.id ? " is-previewing" : ""}`;
  item.dataset.id = t.id;

  const info = document.createElement("div");
  info.className = "template-info";

  const titleLine = document.createElement("div");
  titleLine.className = "template-title-line";

  const name = document.createElement("span");
  name.className   = "template-name";
  name.textContent = t.name;
  titleLine.appendChild(name);

  if (t.official) {
    const badge = document.createElement("span");
    badge.className = "template-badge";
    badge.textContent = "公式";
    titleLine.appendChild(badge);
  }

  const meta = document.createElement("span");
  meta.className   = "template-meta";
  meta.textContent = `${countTemplateNodes(t.tree)}件のメモ`;

  info.append(titleLine, meta);

  const actions = document.createElement("div");
  actions.className = "template-actions";

  const previewActive = state.templatePreviewId === t.id;
  const previewBtn = document.createElement("button");
  previewBtn.className   = `template-action-btn${previewActive ? " is-active" : ""}`;
  previewBtn.title       = previewActive ? "プレビューを閉じる" : "テンプレートの内容を見る";
  previewBtn.setAttribute("aria-label", previewActive ? "プレビューを閉じる" : "テンプレートの内容を見る");
  previewBtn.dataset.action = "preview";
  setButtonContent(previewBtn, previewActive ? "×" : "🔍", previewActive ? "" : "内容を見る");

  const applyBtn = document.createElement("button");
  applyBtn.className   = "template-action-btn";
  applyBtn.title       = "このテンプレートを今開いている親メモの直下に追加";
  applyBtn.setAttribute("aria-label", "このテンプレートを今開いている親メモの直下に追加");
  applyBtn.dataset.action = "apply";
  setButtonContent(applyBtn, "＋", "追加する");

  const renameBtn = document.createElement("button");
  renameBtn.className   = "template-action-btn";
  renameBtn.title       = "名前を変更";
  renameBtn.setAttribute("aria-label", "名前を変更");
  renameBtn.dataset.action = "rename";
  setButtonContent(renameBtn, "✎", "名前変更");

  const deleteBtn = document.createElement("button");
  deleteBtn.className   = "template-action-btn ctx-danger";
  deleteBtn.title       = "削除";
  deleteBtn.setAttribute("aria-label", "削除");
  deleteBtn.dataset.action = "delete";
  setButtonContent(deleteBtn, "🗑", "削除");

  actions.append(previewBtn, applyBtn);
  if (!t.official) actions.append(renameBtn, deleteBtn);
  item.append(info, actions);
  if (state.templatePreviewId === t.id) item.appendChild(renderTemplatePreview(t));
  return item;
}

function templatePreviewText(content) {
  return contentToPlainText(content).replace(/\s+/g, " ");
}

function renderTemplatePreviewNode(node) {
  const item = document.createElement("li");
  item.className = "template-preview-node";

  const title = document.createElement("p");
  title.className = "template-preview-title";
  title.textContent = String(node.title || "無題");
  item.appendChild(title);

  const preview = templatePreviewText(node.content);
  const content = document.createElement("p");
  content.className = "template-preview-content";
  content.textContent = preview || "本文なし";
  item.appendChild(content);

  const children = node.children ?? [];
  if (children.length > 0) {
    const list = document.createElement("ol");
    list.className = "template-preview-children";
    children.forEach(child => list.appendChild(renderTemplatePreviewNode(child)));
    item.appendChild(list);
  }

  return item;
}

function renderTemplatePreview(template) {
  const preview = document.createElement("div");
  preview.className = "template-preview";

  const head = document.createElement("div");
  head.className = "template-preview-head";

  const title = document.createElement("p");
  title.className = "template-preview-label";
  title.textContent = "プレビュー";

  const count = document.createElement("span");
  count.className = "template-preview-count";
  count.textContent = `${countTemplateNodes(template.tree)}件`;

  head.append(title, count);
  preview.appendChild(head);

  const list = document.createElement("ol");
  list.className = "template-preview-tree";
  list.appendChild(renderTemplatePreviewNode(template.tree));
  preview.appendChild(list);

  return preview;
}

function renderTemplatesList() {
  const templates = [...state.templates].sort((a, b) => {
    const officialDiff = Number(Boolean(b.official)) - Number(Boolean(a.official));
    if (officialDiff !== 0) return officialDiff;
    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  });

  els.templatesList.innerHTML = "";
  if (templates.length === 0) {
    const empty = document.createElement("p");
    empty.className   = "templates-empty";
    empty.textContent = "保存されたテンプレートはありません。";
    els.templatesList.appendChild(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  templates.forEach(t => fragment.appendChild(renderTemplateItem(t)));
  els.templatesList.appendChild(fragment);
}

function showTemplatesEmptyIfNeeded() {
  if (els.templatesList.querySelector(".template-item")) return;
  els.templatesList.innerHTML = "";
  const empty = document.createElement("p");
  empty.className   = "templates-empty";
  empty.textContent = "保存されたテンプレートはありません。";
  els.templatesList.appendChild(empty);
}

function appendTemplateItem(template) {
  els.templatesList.querySelector(".templates-empty")?.remove();
  els.templatesList.appendChild(renderTemplateItem(template));
}

function openTemplatesPanel() {
  closeMobileMenu();
  els.templatesOverlay.hidden = false;
  state.templatePreviewId = null;
  els.templateNameInput.value = "";
  renderTemplatesList();
}

function closeTemplatesPanel() {
  els.templatesOverlay.hidden = true;
  state.templatePreviewId = null;
}

// ── マインドマップ テンプレート ────────────────────────────────────────────────────

function buildMindMapTemplateTree(nodes, nodeId) {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return null;
  const children = nodes
    .filter(n => n.parent_id === nodeId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return {
    title:    String(node.title || "トピック").slice(0, 80),
    memo:     node.memo || "",
    children: children.map(c => buildMindMapTemplateTree(nodes, c.id)).filter(Boolean),
  };
}

function createNodesFromMindMapTree(tree, parentId, order) {
  const id   = makeId();
  const node = {
    id,
    parent_id:    parentId,
    title:        String(tree.title || "トピック").slice(0, 80),
    order,
    x:            null,
    y:            null,
    collapsed:    false,
    fill_color:   null,
    border_color: null,
    link_color:   null,
    memo:         String(tree.memo || ""),
  };
  const nodes = [node];
  (tree.children ?? []).forEach((child, i) => {
    nodes.push(...createNodesFromMindMapTree(child, id, (i + 1) * 1000));
  });
  return nodes;
}

function countMindMapTemplateNodes(tree) {
  return 1 + (tree.children ?? []).reduce((sum, c) => sum + countMindMapTemplateNodes(c), 0);
}

function renderMindMapTemplateItem(t) {
  const item = document.createElement("div");
  item.className = `template-item${t.official ? " is-official" : ""}`;
  item.dataset.id = t.id;

  const info = document.createElement("div");
  info.className = "template-info";

  const titleLine = document.createElement("div");
  titleLine.className = "template-title-line";
  const name = document.createElement("span");
  name.className   = "template-name";
  name.textContent = t.name;
  titleLine.appendChild(name);
  if (t.official) {
    const badge = document.createElement("span");
    badge.className   = "template-badge";
    badge.textContent = "公式";
    titleLine.appendChild(badge);
  }

  const meta = document.createElement("p");
  meta.className   = "template-meta";
  meta.textContent = `${countMindMapTemplateNodes(t.tree)}件のトピック`;

  info.appendChild(titleLine);
  info.appendChild(meta);

  const actions = document.createElement("div");
  actions.className = "template-actions";

  const applyBtn = document.createElement("button");
  applyBtn.className       = "template-action-btn";
  applyBtn.title           = "このテンプレートを適用";
  applyBtn.setAttribute("aria-label", "このテンプレートを適用");
  applyBtn.dataset.action  = "apply";
  applyBtn.dataset.id      = t.id;
  applyBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 8L7 12L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  actions.appendChild(applyBtn);

  if (!t.official) {
    const renameBtn = document.createElement("button");
    renameBtn.className      = "template-action-btn";
    renameBtn.title          = "名前を変更";
    renameBtn.setAttribute("aria-label", "名前を変更");
    renameBtn.dataset.action = "rename";
    renameBtn.dataset.id     = t.id;
    renameBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M11 2L14 5L5 14H2V11L11 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    actions.appendChild(renameBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.className      = "template-action-btn ctx-danger";
    deleteBtn.title          = "削除";
    deleteBtn.setAttribute("aria-label", "削除");
    deleteBtn.dataset.action = "delete";
    deleteBtn.dataset.id     = t.id;
    deleteBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 4H14M5 4V2H11V4M6 7V12M10 7V12M3 4L4 14H12L13 4H3Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    actions.appendChild(deleteBtn);
  }

  item.appendChild(info);
  item.appendChild(actions);
  return item;
}

function renderMindMapTemplatesList() {
  els.mindMapTemplatesList.innerHTML = "";
  const sorted = [...state.mindMapTemplates].sort((a, b) => {
    if (a.official && !b.official) return -1;
    if (!a.official && b.official) return 1;
    return (a.name || "").localeCompare(b.name || "");
  });
  if (sorted.length === 0) {
    showMindMapTemplatesEmpty();
    return;
  }
  const frag = document.createDocumentFragment();
  sorted.forEach(t => frag.appendChild(renderMindMapTemplateItem(t)));
  els.mindMapTemplatesList.appendChild(frag);
}

function showMindMapTemplatesEmpty() {
  if (els.mindMapTemplatesList.querySelector(".template-item")) return;
  els.mindMapTemplatesList.innerHTML = "";
  const p = document.createElement("p");
  p.className   = "templates-empty";
  p.textContent = "保存済みテンプレートはありません";
  els.mindMapTemplatesList.appendChild(p);
}

function appendMindMapTemplateItem(template) {
  els.mindMapTemplatesList.querySelector(".templates-empty")?.remove();
  els.mindMapTemplatesList.appendChild(renderMindMapTemplateItem(template));
}

function openMindMapAiPanel() {
  if (isMindMapPresentationMode()) return;
  hideMindMapCtxMenu();
  closeMindMapListPanel();
  closeMindMapTemplatesPanel();
  if (els.mindMapAiMapName) els.mindMapAiMapName.value = "";
  if (els.mindMapAiPrompt) els.mindMapAiPrompt.value = "";
  if (els.mindMapAiFile) els.mindMapAiFile.value = "";
  if (els.mindMapAiError) els.mindMapAiError.hidden = true;
  if (els.mindMapAiGenerateBtn) els.mindMapAiGenerateBtn.disabled = false;
  if (els.mindMapAiPanel) {
    els.mindMapAiPanel.hidden = false;
    els.mindMapAiPrompt?.focus();
  }
}

function closeMindMapAiPanel() {
  if (els.mindMapAiPanel) els.mindMapAiPanel.hidden = true;
}

async function generateMindMapWithAI() {
  if (blockNewMindMapInCollab()) return;
  const btn = els.mindMapAiGenerateBtn;
  const errEl = els.mindMapAiError;
  const requestData = prepareAiRequest(els.mindMapAiPrompt, els.mindMapAiFile, errEl);
  if (!requestData) return;
  btn.disabled = true;
  btn.querySelector(".btn-label").textContent = "生成中...";
  if (errEl) errEl.hidden = true;
  try {
    const res = await fetch("/api/ai-mindmap", requestData.fetchOptions);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "生成に失敗しました");
    const tree = json.tree;
    const userTitle = els.mindMapAiMapName?.value.trim();
    closeMindMapAiPanel();
    if (state.mindMap) await saveMindMapNow();
    const nodes = createNodesFromMindMapTree(tree, null, 1000);
    const ts = nowIso();
    const map = {
      id:               makeId(),
      title:            String(userTitle || tree.title || "AIマインドマップ").slice(0, 80),
      created_at:       ts,
      updated_at:       ts,
      selected_node_id: nodes[0]?.id ?? null,
      nodes,
      extra_links:      [],
    };
    const previous = state.mindMap;
    state.mindMap = map;
    state.mindMapSelectedId = map.selected_node_id;
    try {
      await mindMapsCollection().doc(map.id).set(serializeMindMap());
    } catch (e) {
      state.mindMap = previous;
      state.mindMapSelectedId = previous?.selected_node_id ?? null;
      throw e;
    }
    state.mindMapCentered = false;
    state.mindMapList.unshift(mapListEntryFromMindMap(map));
    clearMindMapUndoStack();
    renderMindMap();
    centerMindMap();
    if (els.mindMapStatus) els.mindMapStatus.textContent = mindMapSavedStatus(map);
    showToast("AIマインドマップを生成しました。");
  } catch (err) {
    if (errEl) {
      errEl.textContent = String(err.message || err);
      errEl.hidden = false;
    }
    btn.disabled = false;
    btn.querySelector(".btn-label").textContent = "生成";
    return;
  }
  btn.disabled = false;
  btn.querySelector(".btn-label").textContent = "生成";
}

function openMindMapTemplatesPanel() {
  if (isMindMapPresentationMode()) return;
  hideMindMapCtxMenu();
  closeMindMapListPanel();
  els.mindMapTemplateNameInput.value = "";
  renderMindMapTemplatesList();
  els.mindMapTemplatesPanel.hidden = false;
}

function closeMindMapTemplatesPanel() {
  els.mindMapTemplatesPanel.hidden = true;
}

async function saveMindMapAsTemplate() {
  if (isMindMapPresentationMode()) return;
  if (!state.mindMap) return;
  const name = els.mindMapTemplateNameInput.value.trim();
  if (!name) { showToast("テンプレート名を入力してください。"); return; }
  const nodes = getMindMapNodes();
  const roots = nodes.filter(n => n.parent_id === null);
  if (roots.length === 0) { showToast("ノードがありません。"); return; }
  const tree = roots.length === 1
    ? buildMindMapTemplateTree(nodes, roots[0].id)
    : {
        title:    String(state.mindMap.title || "マインドマップ").slice(0, 80),
        children: roots.map(r => buildMindMapTemplateTree(nodes, r.id)).filter(Boolean),
      };
  const template = {
    id:         makeId(),
    name,
    official:   false,
    created_at: nowIso(),
    updated_at: nowIso(),
    tree,
  };
  try {
    await mindMapTemplatesCollection().doc(template.id).set(template);
    state.mindMapTemplates.push(template);
    els.mindMapTemplateNameInput.value = "";
    appendMindMapTemplateItem(template);
    showToast("テンプレートを保存しました。");
  } catch (e) { showToast(e.message); }
}

async function applyMindMapTemplate(templateId) {
  if (isMindMapPresentationMode()) return;
  if (blockNewMindMapInCollab()) return;
  const template = state.mindMapTemplates.find(t => t.id === templateId);
  if (!template) return;
  if (state.mindMap) await saveMindMapNow();
  const nodes = createNodesFromMindMapTree(template.tree, null, 1000);
  const ts  = nowIso();
  const map = {
    id:               makeId(),
    title:            String(template.name || "新しいマインドマップ").slice(0, 80),
    created_at:       ts,
    updated_at:       ts,
    selected_node_id: nodes[0]?.id ?? null,
    nodes,
    extra_links:      [],
  };
  const previous = state.mindMap;
  state.mindMap = map;
  state.mindMapSelectedId = map.selected_node_id;
  try {
    await mindMapsCollection().doc(map.id).set(serializeMindMap());
  } catch (e) {
    state.mindMap = previous;
    state.mindMapSelectedId = previous?.selected_node_id ?? null;
    showToast(e.message);
    return;
  }
  state.mindMapCentered = false;
  state.mindMapList.unshift(mapListEntryFromMindMap(map));
  clearMindMapUndoStack();
  closeMindMapTemplatesPanel();
  renderMindMap();
  centerMindMap();
  els.mindMapStatus.textContent = mindMapSavedStatus(map);
  showToast(`「${template.name}」テンプレートを適用しました。`);
}

function startMindMapTemplateRename(item, templateId) {
  if (isMindMapPresentationMode()) return;
  const nameEl  = item.querySelector(".template-name");
  const current = nameEl.textContent;
  const input   = document.createElement("input");
  input.className = "template-rename-input";
  input.value     = current;
  nameEl.replaceWith(input);
  input.focus();
  input.select();
  const commit = async () => {
    const val = input.value.trim();
    if (!val || val === current) { renderMindMapTemplatesList(); return; }
    try {
      await mindMapTemplatesCollection().doc(templateId).set({ name: val, updated_at: nowIso() }, { merge: true });
      const t = state.mindMapTemplates.find(t => t.id === templateId);
      if (t) t.name = val;
      renderMindMapTemplatesList();
    } catch (e) { showToast(e.message); renderMindMapTemplatesList(); }
  };
  input.addEventListener("blur", commit);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter")  { e.preventDefault(); input.blur(); }
    if (e.key === "Escape") { input.removeEventListener("blur", commit); renderMindMapTemplatesList(); }
  });
}

async function deleteMindMapTemplate(item, templateId, name) {
  if (isMindMapPresentationMode()) return;
  const ok = await showConfirm(`「${name}」を削除しますか？`);
  if (!ok) return;
  try {
    await mindMapTemplatesCollection().doc(templateId).delete();
    state.mindMapTemplates = state.mindMapTemplates.filter(t => t.id !== templateId);
    item.remove();
    showMindMapTemplatesEmpty();
  } catch (e) { showToast(e.message); }
}


async function saveSelectedNoteAsTemplate() {
  const note = getSelectedNote();
  if (!note) { showToast("先にメモを選択してください。"); return; }
  const name = els.templateNameInput.value.trim();
  if (!name) { showToast("テンプレート名を入力してください。"); return; }
  try {
    await saveCurrentEditorNow();
    const ts = nowIso();
    const template = {
      id:         makeId(),
      name:       name.slice(0, 120),
      official:   false,
      created_at: ts,
      updated_at: ts,
      tree:       buildTemplateTree(getNotes(), note.id),
    };
    await templatesCollection().doc(template.id).set(template);
    state.templates.push(template);
    els.templateNameInput.value = "";
    appendTemplateItem(template);
    showToast("テンプレートを保存しました。");
  } catch (e) { showToast(e.message); }
}

function startTemplateRename(item, templateId) {
  const nameEl = item.querySelector(".template-name");
  const orig   = nameEl.textContent;
  const input  = document.createElement("input");
  input.className = "template-rename-input";
  input.value = orig;
  nameEl.replaceWith(input);
  input.focus(); input.select();
  let done = false;
  async function commit() {
    if (done) return; done = true;
    const val = input.value.trim() || orig;
    nameEl.textContent = val;
    input.replaceWith(nameEl);
    if (val !== orig) {
      try {
        await templatesCollection().doc(templateId).set({ name: val, updated_at: nowIso() }, { merge: true });
        const t = state.templates.find(t => t.id === templateId);
        if (t) t.name = val;
        showToast("名前を変更しました。");
      } catch (e) { showToast(e.message); renderTemplatesList(); }
    }
  }
  function cancel() { if (done) return; done = true; nameEl.textContent = orig; input.replaceWith(nameEl); }
  input.addEventListener("blur", commit);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter")  { e.preventDefault(); input.blur(); }
    if (e.key === "Escape") { input.removeEventListener("blur", commit); cancel(); }
  });
}

async function applyTemplate(templateId) {
  try {
    if (blockIfGuestReadOnly()) return;
    const template = state.templates.find(t => t.id === templateId);
    if (!template) throw new Error("テンプレートが見つかりません。");

    const selectedRootId = getSelectedRootNoteId();
    const selectedRoot = selectedRootId ? getNotes().find(note => note.id === selectedRootId) : null;
    const parentId = selectedRoot?.id ?? null;

    if (parentId === null && blockNewRootMemoInCollab()) return;
    if (parentId && !await ensureNoteAccess(parentId, { keepLocked: true })) return;

    const created = createNotesFromTemplate(template.tree, parentId, nextOrderForNewNote(parentId));
    created[0].title = String(template.name || "新しいメモ").slice(0, 120);

    await writeNotesBatch(created);

    closeTemplatesPanel();
    appendNotesIfMissing(created);
    if (parentId) state.expanded.add(parentId);
    selectNote(created[0].id);
    showToast(parentId
      ? `「${selectedRoot.title || "無題"}」の直下にテンプレートを追加しました。`
      : "テンプレートを親メモとして追加しました。");
  } catch (e) { showToast(e.message); }
}

async function deleteTemplate(item, templateId, name) {
  const ok = await showConfirm(`テンプレート「${name}」を削除しますか？`);
  if (!ok) return;
  try {
    await templatesCollection().doc(templateId).delete();
    state.templates = state.templates.filter(t => t.id !== templateId);
    if (state.templatePreviewId === templateId) state.templatePreviewId = null;
    item.remove();
    showTemplatesEmptyIfNeeded();
    showToast("テンプレートを削除しました。");
  } catch (e) { showToast(e.message); }
}

function toggleTemplatePreview(templateId) {
  state.templatePreviewId = state.templatePreviewId === templateId ? null : templateId;
  renderTemplatesList();
}

els.templatesBtn  .addEventListener("click", openTemplatesPanel);
els.templatesClose.addEventListener("click", closeTemplatesPanel);
els.templatesOverlay.addEventListener("click", e => {
  if (e.target === els.templatesOverlay) closeTemplatesPanel();
});
els.templateSaveBtn.addEventListener("click", saveSelectedNoteAsTemplate);
els.templateNameInput.addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); saveSelectedNoteAsTemplate(); }
});
els.templatesList.addEventListener("click", e => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const item = btn.closest(".template-item");
  const id   = item?.dataset.id;
  if (!id) return;
  switch (btn.dataset.action) {
    case "preview": toggleTemplatePreview(id); break;
    case "apply":  applyTemplate(id); break;
    case "rename": startTemplateRename(item, id); break;
    case "delete": deleteTemplate(item, id, item.querySelector(".template-name")?.textContent ?? ""); break;
  }
});

els.mindMapAiBtn?.addEventListener("click", openMindMapAiPanel);
els.mindMapAiClose?.addEventListener("click", closeMindMapAiPanel);
els.mindMapAiPanel?.addEventListener("click", e => {
  if (e.target === els.mindMapAiPanel) closeMindMapAiPanel();
});
els.mindMapAiGenerateBtn?.addEventListener("click", generateMindMapWithAI);
els.mindMapAiPrompt?.addEventListener("keydown", e => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); generateMindMapWithAI(); }
});
els.mindMapTemplateBtn?.addEventListener("click", openMindMapTemplatesPanel);
els.mindMapTemplatesClose?.addEventListener("click", closeMindMapTemplatesPanel);
els.mindMapTemplatesPanel?.addEventListener("click", e => {
  if (e.target === els.mindMapTemplatesPanel) closeMindMapTemplatesPanel();
});
els.mindMapTemplateSaveBtn?.addEventListener("click", saveMindMapAsTemplate);
els.mindMapTemplateNameInput?.addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); saveMindMapAsTemplate(); }
});
els.mindMapTemplatesList?.addEventListener("click", e => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const id   = btn.dataset.id;
  const item = btn.closest(".template-item");
  if (!id || !item) return;
  switch (btn.dataset.action) {
    case "apply":  applyMindMapTemplate(id); break;
    case "rename": startMindMapTemplateRename(item, id); break;
    case "delete": deleteMindMapTemplate(item, id, item.querySelector(".template-name")?.textContent ?? ""); break;
  }
});

// ── Mind map ──────────────────────────────────────────────────────────────────

const MINDMAP_SCENE_WIDTH  = 2600;
const MINDMAP_SCENE_HEIGHT = 1800;
const MINDMAP_CENTER_X     = MINDMAP_SCENE_WIDTH / 2;
const MINDMAP_CENTER_Y     = MINDMAP_SCENE_HEIGHT / 2;
const MINDMAP_X_GAP        = 240;
const MINDMAP_Y_GAP        = 92;
const MINDMAP_NODE_HALF_W  = 86;
const MINDMAP_ADD_CHILD_OFFSET = 0;
const MINDMAP_ALIGN_SUBTREE_GAP = 32;
const MINDMAP_ADD_COLLISION_MARGIN = 14;
const MINDMAP_ALIGN_NODE_SAFETY_Y = 10;
const MINDMAP_DEFAULT_NODE_FILL = "#ffffff";
const MINDMAP_DEFAULT_NODE_BORDER = "#3b82f6";
const MINDMAP_ROOT_NODE_FILL = "#2563eb";
const MINDMAP_ROOT_NODE_BORDER = "#3b82f6";
const MINDMAP_DEFAULT_LINK_COLOR = "#3b82f6";
const MINDMAP_HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;
const MINDMAP_COLOR_PALETTE = [
  { label: "白", value: "#ffffff" },
  { label: "黒", value: "#111827" },
  { label: "赤", value: "#ef4444" },
  { label: "青", value: "#3b82f6" },
  { label: "黄色", value: "#facc15" },
  { label: "緑", value: "#22c55e" },
  { label: "紫", value: "#a855f7" },
  { label: "ピンク", value: "#ec4899" },
];
const MEMO_TEXT_COLOR_PALETTE = [
  ...MINDMAP_COLOR_PALETTE.filter(option => option.value !== "#ffffff"),
  { label: "オレンジ", value: "#f97316" },
];

function createDefaultMindMap(id = makeId()) {
  const rootId = makeId();
  const ts = nowIso();
  return {
    id,
    title: "新しいマインドマップ",
    created_at: ts,
    updated_at: ts,
    selected_node_id: rootId,
    source_note_id: null,
    source_note_title: "",
    source_node_id: null,
    sync_enabled: false,
    nodes: [{
      id: rootId,
      parent_id: null,
      title: "中心テーマ",
      order: 1000,
      x: null,
      y: null,
      collapsed: false,
      fill_color: null,
      border_color: null,
      link_color: null,
      memo: "",
      source_note_id: null,
    }],
    extra_links: [],
  };
}

function normalizeMindMap(raw, id) {
  const fallback = createDefaultMindMap(id);
  const nodes = Array.isArray(raw?.nodes) ? raw.nodes : fallback.nodes;
  const cleaned = nodes
    .filter(node => node && node.id)
    .map((node, index) => ({
      id: String(node.id),
      parent_id: node.parent_id ?? null,
      title: String(node.title || "トピック").slice(0, 80),
      order: Number.isFinite(Number(node.order)) ? Number(node.order) : (index + 1) * 1000,
      x: Number.isFinite(node.x) ? node.x : null,
      y: Number.isFinite(node.y) ? node.y : null,
      collapsed: Boolean(node.collapsed),
      fill_color: normalizeMindMapColor(node.fill_color),
      border_color: normalizeMindMapColor(node.border_color),
      link_color: normalizeMindMapColor(node.link_color),
      memo: String(node.memo ?? ""),
      source_note_id: node.source_note_id ? String(node.source_note_id) : null,
    }));

  if (cleaned.length === 0) cleaned.push(...fallback.nodes);
  if (!cleaned.some(node => node.parent_id === null)) cleaned[0].parent_id = null;

  const selected = cleaned.find(node => node.id === raw?.selected_node_id)?.id
    ?? cleaned.find(node => node.parent_id === null)?.id
    ?? cleaned[0].id;

  return {
    id,
    title: String(raw?.title || fallback.title).slice(0, 80),
    created_at: raw?.created_at || fallback.created_at,
    updated_at: raw?.updated_at || fallback.updated_at,
    selected_node_id: selected,
    source_note_id: raw?.source_note_id ? String(raw.source_note_id) : null,
    source_note_title: raw?.source_note_title ? String(raw.source_note_title).slice(0, 120) : "",
    source_node_id: raw?.source_node_id ? String(raw.source_node_id) : null,
    sync_enabled: raw?.sync_enabled === undefined
      ? Boolean(raw?.source_note_id)
      : Boolean(raw.sync_enabled && raw?.source_note_id),
    nodes: cleaned,
    extra_links: Array.isArray(raw?.extra_links)
      ? raw.extra_links
          .filter(l => l && l.from_id && l.to_id)
          .map(l => ({ from_id: String(l.from_id), to_id: String(l.to_id) }))
      : [],
  };
}

function getMindMapNodes() {
  return state.mindMap?.nodes ?? [];
}

function isMindMapPresentationMode() {
  // ゲストが閲覧専用に設定されている間は、発表モードと同じ「編集不可」
  // 扱いにする（既存の発表モード用ガードをそのまま流用するため）。
  return Boolean(state.mindMapPresentationMode) || isGuestReadOnly();
}

function getMindMapNode(id) {
  return getMindMapNodes().find(node => node.id === id) ?? null;
}

function getMindMapChildren(parentId) {
  return getMindMapNodes()
    .filter(node => (node.parent_id ?? null) === (parentId ?? null))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title));
}

function normalizeMindMapColor(value) {
  const color = String(value ?? "").trim();
  return MINDMAP_HEX_COLOR_RE.test(color) ? color.toLowerCase() : null;
}

function getMindMapDefaultNodeFill(node) {
  return node?.parent_id === null ? MINDMAP_ROOT_NODE_FILL : MINDMAP_DEFAULT_NODE_FILL;
}

function getMindMapDefaultNodeBorder(node) {
  return node?.parent_id === null ? MINDMAP_ROOT_NODE_BORDER : MINDMAP_DEFAULT_NODE_BORDER;
}

function getMindMapNodeFillColor(node) {
  return normalizeMindMapColor(node?.fill_color) ?? getMindMapDefaultNodeFill(node);
}

function getMindMapNodeBorderColor(node) {
  return normalizeMindMapColor(node?.border_color) ?? getMindMapDefaultNodeBorder(node);
}

function hexToRgb(hex) {
  const color = normalizeMindMapColor(hex) ?? "#000000";
  return {
    r: parseInt(color.slice(1, 3), 16),
    g: parseInt(color.slice(3, 5), 16),
    b: parseInt(color.slice(5, 7), 16),
  };
}

function getRelativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const normalize = value => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * normalize(r) + 0.7152 * normalize(g) + 0.0722 * normalize(b);
}

function contrastRatio(hexA, hexB) {
  const a = getRelativeLuminance(hexA);
  const b = getRelativeLuminance(hexB);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

function getReadableTextColor(fillColor) {
  const fill = normalizeMindMapColor(fillColor) ?? MINDMAP_DEFAULT_NODE_FILL;
  return contrastRatio(fill, "#ffffff") >= contrastRatio(fill, "#111827")
    ? "#ffffff"
    : "#111827";
}

function getMindMapNodeTextColor(node) {
  const customFill = normalizeMindMapColor(node?.fill_color);
  if (customFill) return getReadableTextColor(customFill);
  return node?.parent_id === null ? "#ffffff" : null;
}

function getMindMapLinkColor(parent, child) {
  return normalizeMindMapColor(child?.link_color)
    ?? normalizeMindMapColor(parent?.link_color)
    ?? MINDMAP_DEFAULT_LINK_COLOR;
}

function applyMindMapNodeStyles(nodeEl, node) {
  const fill = getMindMapNodeFillColor(node);
  const border = getMindMapNodeBorderColor(node);
  const text = getMindMapNodeTextColor(node);

  nodeEl.style.setProperty("--mindmap-node-fill", fill);
  nodeEl.style.setProperty("--mindmap-node-border", border);

  if (text) nodeEl.style.setProperty("--mindmap-node-text", text);
  else nodeEl.style.removeProperty("--mindmap-node-text");
}

function getMindMapColorControls() {
  return [
    {
      prop: "fill_color",
      input: els.mindMapNodeFillColorInput,
      button: els.mindMapNodeFillColorButton,
      palette: els.mindMapNodeFillPalette,
      getColor: selected => getMindMapNodeFillColor(selected),
    },
    {
      prop: "border_color",
      input: els.mindMapNodeBorderColorInput,
      button: els.mindMapNodeBorderColorButton,
      palette: els.mindMapNodeBorderPalette,
      getColor: selected => getMindMapNodeBorderColor(selected),
    },
    {
      prop: "link_color",
      input: els.mindMapLinkColorInput,
      button: els.mindMapLinkColorButton,
      palette: els.mindMapLinkPalette,
      getColor: selected => {
        const parent = selected?.parent_id ? getMindMapNode(selected.parent_id) : null;
        return getMindMapLinkColor(parent, selected);
      },
    },
  ];
}

function setMindMapColorControlState(control, selected) {
  const color = selected ? control.getColor(selected) : MINDMAP_DEFAULT_NODE_FILL;
  const disabled = !selected || isMindMapPresentationMode();
  if (control.input) {
    control.input.disabled = disabled;
    control.input.value = color;
  }
  if (control.button) {
    const trigger = control.button.querySelector(".mindmap-color-current-trigger");
    if ("disabled" in control.button) control.button.disabled = disabled;
    if (trigger) trigger.disabled = disabled;
    control.button.classList.toggle("is-disabled", disabled);
    control.button.setAttribute("aria-disabled", String(disabled));
    control.button.style.setProperty("--mindmap-current-color", color);
    if (disabled) setMindMapColorControlOpen(control, false);
  }
  if (control.palette) {
    control.palette.querySelectorAll(".mindmap-color-swatch").forEach(button => {
      const isActive = button.dataset.color === color;
      button.disabled = disabled;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }
}

function updateMindMapColorInputs(selected) {
  getMindMapColorControls().forEach(control => setMindMapColorControlState(control, selected));
}

function getMindMapContextColor(node, prop) {
  if (prop === "fill_color") return getMindMapNodeFillColor(node);
  if (prop === "border_color") return getMindMapNodeBorderColor(node);
  const parent = node?.parent_id ? getMindMapNode(node.parent_id) : null;
  return getMindMapLinkColor(parent, node);
}

function updateMindMapContextColorPaletteState(node) {
  els.mindMapContextMenu.querySelectorAll("[data-mindmap-context-color-palette]").forEach(palette => {
    const prop = palette.dataset.mindmapContextColorPalette;
    const color = node ? getMindMapContextColor(node, prop) : null;
    const toggle = els.mindMapContextMenu.querySelector(`[data-mindmap-context-color-toggle="${prop}"]`);
    if (toggle) {
      toggle.disabled = !node;
      toggle.style.setProperty("--mindmap-current-color", color || MINDMAP_DEFAULT_NODE_FILL);
    }
    palette.querySelectorAll(".mindmap-color-swatch").forEach(button => {
      const isActive = Boolean(color) && button.dataset.color === color;
      button.disabled = !node;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  });
}

function updateMindMapLinkContextPaletteState(child) {
  const parent = child?.parent_id ? getMindMapNode(child.parent_id) : null;
  const color = parent && child ? getMindMapLinkColor(parent, child) : null;
  const toggle = els.mindMapLinkContextMenu?.querySelector("[data-mindmap-link-context-color-toggle]");
  if (toggle) {
    toggle.disabled = !child || !parent;
    toggle.style.setProperty("--mindmap-current-color", color || MINDMAP_DEFAULT_LINK_COLOR);
  }
  els.mindMapLinkContextPalette?.querySelectorAll(".mindmap-color-swatch").forEach(button => {
    const isActive = Boolean(color) && button.dataset.color === color;
    button.disabled = !child || !parent;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setMindMapContextPaletteOpen(menu, toggleSelector, palette, open) {
  if (!menu) return;
  const toggles = menu.querySelectorAll(toggleSelector);
  toggles.forEach(toggle => {
    const isTarget = Boolean(palette) && toggle.getAttribute("aria-controls") === palette.id;
    const shouldOpen = open && isTarget && !toggle.disabled;
    toggle.classList.toggle("is-open", shouldOpen);
    toggle.setAttribute("aria-expanded", String(shouldOpen));
  });

  menu.querySelectorAll(".mindmap-context-color-palette").forEach(item => {
    item.hidden = item !== palette || !open;
  });
}

function closeMindMapContextColorPalettes() {
  setMindMapContextPaletteOpen(els.mindMapContextMenu, "[data-mindmap-context-color-toggle]", null, false);
  setMindMapContextPaletteOpen(els.mindMapLinkContextMenu, "[data-mindmap-link-context-color-toggle]", null, false);
}

function toggleMindMapContextColorPalette(prop) {
  const palette = els.mindMapContextMenu.querySelector(`[data-mindmap-context-color-palette="${prop}"]`);
  const toggle = els.mindMapContextMenu.querySelector(`[data-mindmap-context-color-toggle="${prop}"]`);
  if (!palette || !toggle || toggle.disabled) return;
  setMindMapContextPaletteOpen(els.mindMapContextMenu, "[data-mindmap-context-color-toggle]", palette, palette.hidden);
  fitMindMapMenuToViewport(els.mindMapContextMenu);
}

function toggleMindMapLinkContextColorPalette() {
  const palette = els.mindMapLinkContextPalette;
  const toggle = els.mindMapLinkContextMenu?.querySelector("[data-mindmap-link-context-color-toggle]");
  if (!palette || !toggle || toggle.disabled) return;
  setMindMapContextPaletteOpen(els.mindMapLinkContextMenu, "[data-mindmap-link-context-color-toggle]", palette, palette.hidden);
  fitMindMapMenuToViewport(els.mindMapLinkContextMenu);
}

function countMindMapDescendants(nodeId) {
  return getMindMapChildren(nodeId).reduce(
    (sum, child) => sum + 1 + countMindMapDescendants(child.id),
    0,
  );
}

function isMindMapNodeVisible(node) {
  let parentId = node?.parent_id ?? null;
  while (parentId) {
    const parent = getMindMapNode(parentId);
    if (!parent) return false;
    if (parent.collapsed) return false;
    parentId = parent.parent_id ?? null;
  }
  return true;
}

function getVisibleMindMapNodes() {
  return getMindMapNodes().filter(isMindMapNodeVisible);
}

function getMindMapAlignTarget(node = getMindMapNode(state.mindMapSelectedId)) {
  if (!node) return { parent: null, nodes: [] };
  const children = getMindMapChildren(node.id);
  return { parent: node, nodes: children };
}

function canAlignMindMapChildren(node = getMindMapNode(state.mindMapSelectedId)) {
  return Boolean(node && getMindMapChildren(node.id).length >= 2);
}

function nextMindMapOrder(parentId) {
  const children = getMindMapChildren(parentId);
  return children.length ? Math.max(...children.map(node => node.order ?? 0)) + 1000 : 1000;
}

function serializeMindMap() {
  const map = state.mindMap;
  if (!map) return null;
  return {
    id: map.id,
    title: map.title || "新しいマインドマップ",
    created_at: map.created_at,
    updated_at: map.updated_at,
    selected_node_id: state.mindMapSelectedId,
    source_note_id: map.source_note_id || null,
    source_note_title: map.source_note_title || "",
    source_node_id: map.source_node_id || null,
    sync_enabled: Boolean(map.sync_enabled && map.source_note_id),
    nodes: getMindMapNodes().map(node => ({
      id: node.id,
      parent_id: node.parent_id ?? null,
      title: node.title || "トピック",
      order: node.order ?? 0,
      x: Number.isFinite(node.x) ? node.x : null,
      y: Number.isFinite(node.y) ? node.y : null,
      collapsed: Boolean(node.collapsed),
      fill_color: normalizeMindMapColor(node.fill_color),
      border_color: normalizeMindMapColor(node.border_color),
      link_color: normalizeMindMapColor(node.link_color),
      memo: node.memo || "",
      source_note_id: node.source_note_id || null,
    })),
    extra_links: (map.extra_links || []).filter(l => l?.from_id && l?.to_id),
  };
}

function snapshotMindMap() {
  const map = serializeMindMap();
  if (!map?.id) return null;
  return {
    mapId: map.id,
    selected_node_id: state.mindMapSelectedId,
    map: cloneData(map),
  };
}

function mindMapSnapshotsEqual(a, b) {
  if (!a || !b) return false;
  return JSON.stringify(a.map) === JSON.stringify(b.map) &&
    a.selected_node_id === b.selected_node_id;
}

function updateMindMapUndoButton() {
  if (!els.mindMapUndoBtn) return;
  els.mindMapUndoBtn.disabled = isMindMapPresentationMode() || state.mindMapUndoStack.length === 0;
}

function clearMindMapUndoStack() {
  state.mindMapUndoStack = [];
  state.mindMapEditSnapshot = null;
  updateMindMapUndoButton();
}

function pushMindMapUndoSnapshot(snapshot = snapshotMindMap()) {
  if (state.isApplyingMindMapUndo || !snapshot?.mapId) return;
  const last = state.mindMapUndoStack[state.mindMapUndoStack.length - 1];
  if (mindMapSnapshotsEqual(last, snapshot)) return;
  state.mindMapUndoStack.push(snapshot);
  if (state.mindMapUndoStack.length > MAX_UNDO) state.mindMapUndoStack.shift();
  updateMindMapUndoButton();
}

function beginMindMapEditUndo() {
  if (state.mindMapEditSnapshot) return;
  const snapshot = snapshotMindMap();
  pushMindMapUndoSnapshot(snapshot);
  state.mindMapEditSnapshot = snapshot;
}

function endMindMapEditUndo() {
  state.mindMapEditSnapshot = null;
}

async function applyMindMapUndoSnapshot(snapshot) {
  if (!snapshot?.map) return;
  clearTimeout(state.mindMapSaveTimer);
  state.isApplyingMindMapUndo = true;
  try {
    state.mindMap = normalizeMindMap(snapshot.map, snapshot.map.id);
    state.mindMapSelectedId = getMindMapNode(snapshot.selected_node_id)
      ? snapshot.selected_node_id
      : state.mindMap.selected_node_id;
    state.mindMap.selected_node_id = state.mindMapSelectedId;
    state.mindMapCentered = false;
    hideMindMapCtxMenu();
    closeMindMapListPanel();
    renderMindMap();
    await saveMindMapNow();
    showToast("マインドマップを一つ前に戻しました。");
  } catch (e) {
    showToast("戻せませんでした: " + e.message);
  } finally {
    state.isApplyingMindMapUndo = false;
    state.mindMapEditSnapshot = null;
    updateMindMapUndoButton();
  }
}

async function undoMindMapLastChange() {
  if (isMindMapPresentationMode()) return;
  const currentMapId = state.mindMap?.id;
  let snapshot = state.mindMapUndoStack.pop();
  while (snapshot && snapshot.mapId !== currentMapId) {
    snapshot = state.mindMapUndoStack.pop();
  }

  if (!snapshot) {
    updateMindMapUndoButton();
    showToast("戻せる変更がありません。");
    return;
  }

  updateMindMapUndoButton();
  await applyMindMapUndoSnapshot(snapshot);
}

async function loadMindMap() {
  if (state.mindMapLoaded) return;
  els.mindMapStatus.textContent = "読み込み中...";
  const snap = await mindMapsCollection().get();
  if (snap.empty) {
    state.mindMap = createDefaultMindMap();
    state.mindMapSelectedId = state.mindMap.selected_node_id;
    await mindMapsCollection().doc(state.mindMap.id).set(serializeMindMap());
    state.mindMapList = [mapListEntryFromMindMap(state.mindMap)];
  } else {
    const docs = snap.docs
      .map(doc => ({ id: doc.id, data: doc.data() }))
      .sort((a, b) => String(b.data.updated_at ?? "").localeCompare(String(a.data.updated_at ?? "")));
    state.mindMap = normalizeMindMap(docs[0].data, docs[0].id);
    state.mindMapSelectedId = state.mindMap.selected_node_id;
    state.mindMapList = docs.map(({ id, data }) => mapListEntryFromMindMap({ ...data, id }));
  }
  state.mindMapLoaded = true;
  clearMindMapUndoStack();
  els.mindMapStatus.textContent = mindMapSavedStatus(state.mindMap);
}

function scheduleMindMapSave() {
  if (!state.mindMap || !state.uid) return;
  clearTimeout(state.mindMapSaveTimer);
  els.mindMapStatus.textContent = "保存中...";
  state.mindMapSaveTimer = setTimeout(saveMindMapNow, 500);
}

function isMindMapInlineNodeEditing() {
  return Boolean(
    state.mindMapInlineEditNodeId &&
    els.mindMapNodes?.querySelector(".mindmap-node-edit")
  );
}

async function saveMindMapNow() {
  if (!state.mindMap || !state.uid) return;
  clearTimeout(state.mindMapSaveTimer);
  if (isMindMapInlineNodeEditing()) {
    els.mindMapStatus.textContent = "編集中...";
    return;
  }
  state.mindMap.updated_at = nowIso();
  state.mindMap.selected_node_id = state.mindMapSelectedId;
  const listEntry = state.mindMapList.find(m => m.id === state.mindMap.id);
  if (listEntry) {
    Object.assign(listEntry, mapListEntryFromMindMap(state.mindMap));
  }
  try {
    await mindMapsCollection().doc(state.mindMap.id).set(serializeMindMap(), { merge: true });
    if (state.mindMap.sync_enabled) {
      await syncLinkedNotesFromMindMap(state.mindMap);
      // ノード編集中・ドラッグ中は再描画しない（エディタが破壊されるため）
      if (!els.mindMapOverlay.hidden && !state.mindMapEditSnapshot && !state.mindMapNodeDrag && !isMindMapInlineNodeEditing()) {
        renderMindMap();
      }
    }
    els.mindMapStatus.textContent = mindMapSavedStatus(state.mindMap);
  } catch (e) {
    els.mindMapStatus.textContent = "保存できませんでした";
    showToast(e.message);
  }
}

function calculateMindMapLayout() {
  const nodes = getVisibleMindMapNodes();
  const layout = new Map();
  const roots = nodes.filter(node => node.parent_id === null);
  if (roots.length === 0 && nodes.length > 0) roots.push(nodes[0]);
  const primaryRoot = roots[0];
  if (!primaryRoot) return layout;

  let cursor = 0;
  function place(node, depth) {
    const children = node.collapsed ? [] : getMindMapChildren(node.id).filter(isMindMapNodeVisible);
    if (children.length === 0) {
      layout.set(node.id, { x: depth * MINDMAP_X_GAP, y: cursor * MINDMAP_Y_GAP });
      cursor += 1;
      return;
    }

    children.forEach(child => place(child, depth + 1));
    const childYs = children.map(child => layout.get(child.id)?.y ?? 0);
    const y = (Math.min(...childYs) + Math.max(...childYs)) / 2;
    layout.set(node.id, { x: depth * MINDMAP_X_GAP, y });
  }

  for (const root of roots) {
    place(root, 0);
    cursor += 2;
  }

  const rootPos = layout.get(primaryRoot.id) ?? { x: 0, y: 0 };
  const offsetX = MINDMAP_CENTER_X - rootPos.x;
  const offsetY = MINDMAP_CENTER_Y - rootPos.y;

  for (const [id, pos] of layout.entries()) {
    layout.set(id, { x: pos.x + offsetX, y: pos.y + offsetY });
  }

  function applySavedPositionShift(node, parentShift = { dx: 0, dy: 0 }) {
    const pos = layout.get(node.id);
    if (!pos) return;

    let shift = parentShift;
    if (Number.isFinite(node.x) && Number.isFinite(node.y)) {
      shift = {
        dx: node.x - pos.x,
        dy: node.y - pos.y,
      };
    }

    layout.set(node.id, {
      x: pos.x + shift.dx,
      y: pos.y + shift.dy,
    });

    if (node.collapsed) return;
    getMindMapChildren(node.id)
      .filter(child => layout.has(child.id))
      .forEach(child => applySavedPositionShift(child, shift));
  }

  for (const root of roots) {
    applySavedPositionShift(root);
  }

  return layout;
}

function preserveVisibleMindMapPositions(layout = calculateMindMapLayout()) {
  for (const node of getVisibleMindMapNodes()) {
    const pos = layout.get(node.id);
    if (!pos) continue;
    node.x = pos.x;
    node.y = pos.y;
  }
}

function getMindMapVisibleSubtreeVerticalBounds(nodeId, layout) {
  const ids = collectMindMapSubtreeIds(nodeId);
  let minY = Infinity;
  let maxY = -Infinity;

  for (const id of ids) {
    if (!layout.has(id)) continue;
    const node = getMindMapNode(id);
    const pos = layout.get(id);
    if (!node || !pos) continue;
    const halfH = estimateMindMapNodeHeight(node) / 2;
    minY = Math.min(minY, pos.y - halfH);
    maxY = Math.max(maxY, pos.y + halfH);
  }

  if (Number.isFinite(minY) && Number.isFinite(maxY)) return { minY, maxY };
  const node = getMindMapNode(nodeId);
  const pos = layout.get(nodeId) ?? { y: Number.isFinite(node?.y) ? node.y : MINDMAP_CENTER_Y };
  const halfH = estimateMindMapNodeHeight(node) / 2;
  return { minY: pos.y - halfH, maxY: pos.y + halfH };
}

function getMindMapNodeCollisionRect(node, pos, margin = MINDMAP_ADD_COLLISION_MARGIN) {
  const halfW = MINDMAP_NODE_HALF_W + margin;
  const halfH = estimateMindMapNodeHeight(node) / 2 + margin;
  return {
    left: pos.x - halfW,
    right: pos.x + halfW,
    top: pos.y - halfH,
    bottom: pos.y + halfH,
  };
}

function mindMapRectsOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function getVisibleMindMapCollisionRects(layout, excludeIds = new Set()) {
  return getVisibleMindMapNodes()
    .filter(node => !excludeIds.has(node.id))
    .map(node => {
      const pos = getMindMapNodePosition(node, layout);
      return pos ? getMindMapNodeCollisionRect(node, pos) : null;
    })
    .filter(Boolean);
}

function findNonOverlappingMindMapPosition(node, desiredPos, layout, options = {}) {
  const excludeIds = options.excludeIds || new Set();
  const rects = getVisibleMindMapCollisionRects(layout, excludeIds);
  const pos = { x: desiredPos.x, y: desiredPos.y };

  for (let i = 0; i < 120; i += 1) {
    const rect = getMindMapNodeCollisionRect(node, pos);
    const overlap = rects.find(other => mindMapRectsOverlap(rect, other));
    if (!overlap) return pos;
    pos.y += overlap.bottom - rect.top + 1;
  }

  return pos;
}

function applyMindMapTransform() {
  els.mindMapScene.style.transform =
    `translate(${state.mindMapPanX}px, ${state.mindMapPanY}px) scale(${state.mindMapZoom})`;
  els.mindMapZoomLabel.textContent = `${Math.round(state.mindMapZoom * 100)}%`;
}

function centerMindMap() {
  const rect = els.mindMapCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  state.mindMapPanX = rect.width / 2 - MINDMAP_CENTER_X * state.mindMapZoom;
  state.mindMapPanY = rect.height / 2 - MINDMAP_CENTER_Y * state.mindMapZoom;
  state.mindMapCentered = true;
  applyMindMapTransform();
}

function setMindMapZoom(nextZoom, origin = null) {
  const oldZoom = state.mindMapZoom;
  const next = Math.max(0.45, Math.min(1.7, nextZoom));
  if (next === oldZoom) return;

  const rect = els.mindMapCanvas.getBoundingClientRect();
  const ox = origin?.x ?? rect.width / 2;
  const oy = origin?.y ?? rect.height / 2;
  const sceneX = (ox - state.mindMapPanX) / oldZoom;
  const sceneY = (oy - state.mindMapPanY) / oldZoom;
  state.mindMapZoom = next;
  state.mindMapPanX = ox - sceneX * next;
  state.mindMapPanY = oy - sceneY * next;
  applyMindMapTransform();
}

function setMindMapLinkPath(path, fromPos, toPos) {
  const startX = fromPos.x + MINDMAP_NODE_HALF_W;
  const startY = fromPos.y;
  const endX = toPos.x - MINDMAP_NODE_HALF_W;
  const endY = toPos.y;
  const gap = endX - startX;
  const verticalGap = Math.abs(endY - startY);

  if (verticalGap < 1) {
    path.setAttribute("d", `M ${startX} ${startY} L ${endX} ${endY}`);
    return;
  }

  if (gap >= 20) {
    const curve = Math.max(8, Math.min(72, gap * 0.38));
    path.setAttribute("d", `M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`);
    return;
  }

  const routeX = Math.max(startX, endX) + 42;
  path.setAttribute("d", `M ${startX} ${startY} C ${routeX} ${startY}, ${routeX} ${endY}, ${endX} ${endY}`);
}

function updateMindMapLinksFor(nodeId, layout) {
  const pos = layout.get(nodeId);
  if (!pos) return;
  const node = getMindMapNode(nodeId);
  if (!node) return;

  if (node.parent_id) {
    const parentPos = layout.get(node.parent_id);
    const path = els.mindMapLinks.querySelector(`.mindmap-link[data-child="${nodeId}"]`);
    const hitPath = els.mindMapLinks.querySelector(`.mindmap-link-hit[data-child="${nodeId}"]`);
    const parent = getMindMapNode(node.parent_id);
    if (parentPos && path) {
      path.style.setProperty("--mindmap-link-color", getMindMapLinkColor(parent, node));
      setMindMapLinkPath(path, parentPos, pos);
      if (hitPath) setMindMapLinkPath(hitPath, parentPos, pos);
    }
  }

  if (!node.collapsed) {
    for (const child of getMindMapChildren(nodeId).filter(isMindMapNodeVisible)) {
      const childPos = layout.get(child.id);
      const path = els.mindMapLinks.querySelector(`.mindmap-link[data-child="${child.id}"]`);
      const hitPath = els.mindMapLinks.querySelector(`.mindmap-link-hit[data-child="${child.id}"]`);
      if (childPos && path) {
        path.style.setProperty("--mindmap-link-color", getMindMapLinkColor(node, child));
        setMindMapLinkPath(path, pos, childPos);
        if (hitPath) setMindMapLinkPath(hitPath, pos, childPos);
      }
    }
  }

  for (const link of (state.mindMap.extra_links || [])) {
    if (link.from_id !== nodeId && link.to_id !== nodeId) continue;
    const fromPos = link.from_id === nodeId ? pos : layout.get(link.from_id);
    const toPos   = link.to_id   === nodeId ? pos : layout.get(link.to_id);
    if (!fromPos || !toPos) continue;
    const ep = els.mindMapLinks.querySelector(`.mindmap-extra-link[data-from="${link.from_id}"][data-to="${link.to_id}"]`);
    const eh = els.mindMapLinks.querySelector(`.mindmap-extra-link-hit[data-from="${link.from_id}"][data-to="${link.to_id}"]`);
    if (ep) setMindMapLinkPath(ep, fromPos, toPos);
    if (eh) setMindMapLinkPath(eh, fromPos, toPos);
  }
}

function setMindMapNodeButtonContent(button, node) {
  button.innerHTML = "";

  const title = document.createElement("span");
  title.className = "mindmap-node-title";
  title.textContent = node.title || "トピック";
  button.appendChild(title);

  if (node.memo) {
    const dot = document.createElement("span");
    dot.className = "mindmap-node-memo-dot";
    dot.title = "メモあり";
    button.appendChild(dot);
  }

  const editingPresences = getPresenceForMindMapNode(node.id, { editingOnly: true });
  if (editingPresences.length > 0) {
    button.appendChild(createMindMapPresenceBadge(editingPresences));
  }
}

// ノードをドラッグ中・インライン編集中でも、他の参加者がどのノードを
// 編集しているかバッジだけは常に最新化する（タイトルやレイアウトは触らない）。
function refreshMindMapNodePresenceBadges() {
  if (!state.mindMap || els.mindMapOverlay?.hidden || !els.mindMapNodes) return;
  els.mindMapNodes.querySelectorAll(".mindmap-node[data-id]").forEach(button => {
    const nodeId = button.dataset.id;
    if (nodeId === state.mindMapInlineEditNodeId) return;
    const existingBadge = button.querySelector(".mindmap-node-presence");
    const editingPresences = getPresenceForMindMapNode(nodeId, { editingOnly: true });
    if (editingPresences.length > 0) {
      const badge = createMindMapPresenceBadge(editingPresences);
      if (existingBadge) existingBadge.replaceWith(badge);
      else button.appendChild(badge);
    } else if (existingBadge) {
      existingBadge.remove();
    }
  });
}

function renderMindMap() {
  if (!state.mindMap) return;
  const presentationMode = isMindMapPresentationMode();
  const layout = calculateMindMapLayout();
  const visibleNodes = getVisibleMindMapNodes();
  const selected = visibleNodes.find(node => node.id === state.mindMapSelectedId)
    ?? visibleNodes.find(node => node.parent_id === null)
    ?? visibleNodes[0]
    ?? null;
  const alignTarget = getMindMapAlignTarget(selected);
  state.mindMapSelectedId = selected?.id ?? null;
  state.mindMap.selected_node_id = state.mindMapSelectedId;

  applySyncPairStyle(
    els.mindMapStatus,
    state.mindMap.id,
    Boolean(state.mindMap.sync_enabled && state.mindMap.source_note_id),
  );
  renderMindMapPresencePanel();

  els.mindMapTitleInput.value = state.mindMap.title || "";
  const mindMapTitleEditable = canEditMindMapTitle();
  els.mindMapTitleInput.disabled = presentationMode;
  els.mindMapTitleInput.readOnly = !mindMapTitleEditable;
  els.mindMapTitleInput.title = mindMapTitleEditable
    ? ""
    : "共同作業中、マインドマップの名前を変更できるのはホストだけです";
  els.mindMapNodeTitleInput.value = selected?.title ?? "";
  els.mindMapNodeTitleInput.disabled = !selected || presentationMode;
  if (els.mindMapNodeMemoInput) {
    els.mindMapNodeMemoInput.value = selected?.memo ?? "";
    els.mindMapNodeMemoInput.disabled = !selected || presentationMode;
  }
  if (els.mindMapMemoLargeBtn) els.mindMapMemoLargeBtn.disabled = !selected || presentationMode;
  updateMindMapColorInputs(selected);
  if (els.mindMapAddChildBtn) els.mindMapAddChildBtn.disabled = presentationMode || !selected;
  if (els.mindMapAlignChildrenBtn) els.mindMapAlignChildrenBtn.disabled = presentationMode || !canAlignMindMapChildren(alignTarget.parent);
  const rootCount = getMindMapNodes().filter(n => n.parent_id === null).length;
  if (els.mindMapDeleteNodeBtn) els.mindMapDeleteNodeBtn.disabled = presentationMode || !selected || (selected.parent_id === null && rootCount <= 1);
  const syncBlockedForGuest = isCollabActive() && state.collabRoomRole !== "host";
  if (els.mindMapToNoteBtn) {
    els.mindMapToNoteBtn.disabled = presentationMode || visibleNodes.length === 0 || syncBlockedForGuest;
    els.mindMapToNoteBtn.title = syncBlockedForGuest
      ? "共同作業中、マインドマップとの同期はホストだけができます"
      : "現在のマインドマップをメモと同期";
  }
  if (els.mindMapDeleteBtn) {
    els.mindMapDeleteBtn.disabled = presentationMode || !state.mindMap || isCollabActive();
    els.mindMapDeleteBtn.title = isCollabActive()
      ? "共同作業中はマインドマップを削除できません"
      : "現在のマインドマップを削除";
  }
  if (els.mindMapNodeSettingsBtn) els.mindMapNodeSettingsBtn.disabled = presentationMode || !selected;
  const newMapBlockedByCollab = isCollabActive();
  if (els.mindMapNewBtn) {
    els.mindMapNewBtn.disabled = presentationMode || newMapBlockedByCollab;
    els.mindMapNewBtn.title = newMapBlockedByCollab ? "共同作業中は新しいマインドマップを追加できません" : "新規マップ";
  }
  if (els.mindMapSideNewBtn) {
    els.mindMapSideNewBtn.disabled = presentationMode || newMapBlockedByCollab;
    els.mindMapSideNewBtn.title = newMapBlockedByCollab ? "共同作業中は新しいマインドマップを追加できません" : "新規マップ";
  }
  if (els.mindMapTemplateBtn) els.mindMapTemplateBtn.disabled = presentationMode;
  updateMindMapUndoButton();

  els.mindMapLinks.innerHTML = "";
  els.mindMapNodes.innerHTML = "";

  for (const node of visibleNodes) {
    const pos = layout.get(node.id);
    if (!pos) continue;
    const parent = node.parent_id ? getMindMapNode(node.parent_id) : null;
    const parentPos = parent ? layout.get(parent.id) : null;
    if (parent && parentPos) {
      const linkColor = getMindMapLinkColor(parent, node);
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("class", "mindmap-link");
      path.dataset.child = node.id;
      path.style.setProperty("--mindmap-link-color", linkColor);
      setMindMapLinkPath(path, parentPos, pos);
      els.mindMapLinks.appendChild(path);

      const hitPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      hitPath.setAttribute("class", "mindmap-link-hit");
      hitPath.dataset.child = node.id;
      setMindMapLinkPath(hitPath, parentPos, pos);
      hitPath.addEventListener("contextmenu", e => {
        e.preventDefault();
        e.stopPropagation();
        if (presentationMode) return;
        showMindMapLinkCtxMenu(e.clientX, e.clientY, node.id);
      });
      els.mindMapLinks.appendChild(hitPath);
    }

    const nodeBtn = document.createElement("button");
    nodeBtn.type = "button";
    nodeBtn.className = `mindmap-node${node.parent_id === null ? " is-root" : ""}${node.id === state.mindMapSelectedId ? " is-selected" : ""}${node.collapsed ? " is-collapsed" : ""}`;
    nodeBtn.dataset.id = node.id;
    nodeBtn.style.left = `${pos.x}px`;
    nodeBtn.style.top = `${pos.y}px`;
    applyMindMapNodeStyles(nodeBtn, node);
    setMindMapNodeButtonContent(nodeBtn, node);

    let expandBtn = null;
    const descendantCount = countMindMapDescendants(node.id);
    if (descendantCount > 0 && (node.collapsed || presentationMode)) {
      expandBtn = document.createElement("button");
      expandBtn.type = "button";
      expandBtn.className = `mindmap-node-count${node.collapsed ? "" : " is-collapse-control"}`;
      expandBtn.dataset.id = node.id;
      expandBtn.title = node.collapsed
        ? `非表示の子ノード ${descendantCount}件を表示`
        : `子ノード ${descendantCount}件を隠す`;
      expandBtn.setAttribute(
        "aria-label",
        node.collapsed
          ? `「${node.title || "トピック"}」の子ノード ${descendantCount}件を表示`
          : `「${node.title || "トピック"}」の子ノード ${descendantCount}件を隠す`
      );
      expandBtn.textContent = node.collapsed
        ? (descendantCount > 99 ? "99+" : String(descendantCount))
        : "−";
      expandBtn.style.left = `${pos.x + MINDMAP_NODE_HALF_W + MINDMAP_ADD_CHILD_OFFSET}px`;
      expandBtn.style.top = `${pos.y}px`;
      expandBtn.addEventListener("pointerdown", e => e.stopPropagation());
      expandBtn.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        toggleMindMapChildren(node.id);
      });
      expandBtn.addEventListener("contextmenu", e => {
        e.preventDefault();
        e.stopPropagation();
        showMindMapCtxMenu(e.clientX, e.clientY, node.id);
      });
    }

    let addBtn = null;
    if (!presentationMode && !node.collapsed) {
      addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "mindmap-add-child-btn";
      addBtn.dataset.id = node.id;
      addBtn.title = "子ノードを追加";
      addBtn.setAttribute("aria-label", `「${node.title || "トピック"}」に子ノードを追加`);
      addBtn.textContent = "+";
      addBtn.style.left = `${pos.x + MINDMAP_NODE_HALF_W + MINDMAP_ADD_CHILD_OFFSET}px`;
      addBtn.style.top = `${pos.y}px`;
      addBtn.addEventListener("pointerdown", e => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        setPointerCaptureSafe(addBtn, e.pointerId);
        state.mindMapNodeDrag = null;
        state.mindMapLinkDrag = { nodeId: node.id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false };
      });
      addBtn.addEventListener("pointermove", e => {
        const drag = state.mindMapLinkDrag;
        if (!drag || drag.nodeId !== node.id || drag.pointerId !== e.pointerId) return;
        if (!drag.moved) {
          if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 6) return;
          drag.moved = true;
        }
        showMindMapRubberBand(drag.startX, drag.startY, e.clientX, e.clientY);
        setMindMapLinkTargetHighlight(e.clientX, e.clientY, node.id);
      });
      addBtn.addEventListener("pointerup", e => {
        const drag = state.mindMapLinkDrag;
        if (!drag || drag.nodeId !== node.id || drag.pointerId !== e.pointerId) return;
        const wasMoved = drag.moved;
        state.mindMapLinkDrag = null;
        releasePointerCaptureSafe(addBtn, e.pointerId);
        hideMindMapRubberBand();
        clearMindMapLinkTargetHighlight();
        if (!wasMoved) {
          addMindMapNode(node.id);
        } else {
          const targetEl = document.elementFromPoint(e.clientX, e.clientY)?.closest(".mindmap-node, .mindmap-node-count");
          const targetId = targetEl?.dataset.id;
          if (targetId && targetId !== node.id) addMindMapExtraLink(node.id, targetId);
        }
      });
      addBtn.addEventListener("pointercancel", e => {
        const drag = state.mindMapLinkDrag;
        if (!drag || drag.nodeId !== node.id || drag.pointerId !== e.pointerId) return;
        state.mindMapLinkDrag = null;
        releasePointerCaptureSafe(addBtn, e.pointerId);
        hideMindMapRubberBand();
        clearMindMapLinkTargetHighlight();
      });
      addBtn.addEventListener("lostpointercapture", e => {
        const drag = state.mindMapLinkDrag;
        if (!drag || drag.nodeId !== node.id || drag.pointerId !== e.pointerId) return;
        state.mindMapLinkDrag = null;
        hideMindMapRubberBand();
        clearMindMapLinkTargetHighlight();
      });
    }

    nodeBtn.addEventListener("click", e => {
      e.stopPropagation();
      selectMindMapNode(node.id);
    });
    nodeBtn.addEventListener("dblclick", e => {
      e.stopPropagation();
      if (presentationMode) return;
      startMindMapNodeEdit(node.id);
    });
    nodeBtn.addEventListener("contextmenu", e => {
      e.preventDefault();
      e.stopPropagation();
      showMindMapCtxMenu(e.clientX, e.clientY, node.id);
    });
    nodeBtn.addEventListener("keydown", e => {
      if (e.key === "Enter" && !presentationMode) {
        e.preventDefault();
        startMindMapNodeEdit(node.id);
      }
      if (!presentationMode && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        deleteSelectedMindMapNode();
      }
    });
    nodeBtn.addEventListener("pointerdown", e => {
      if (presentationMode || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      setPointerCaptureSafe(nodeBtn, e.pointerId);
      const start = layout.get(node.id) ?? { x: 0, y: 0 };
      state.mindMapLinkDrag = null;
      state.mindMapNodeDrag = {
        id: node.id,
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: start.x,
        startY: start.y,
        moved: false,
      };
    });
    nodeBtn.addEventListener("pointermove", e => {
      const drag = state.mindMapNodeDrag;
      if (!drag || drag.id !== node.id || drag.pointerId !== e.pointerId) return;
      const dx = (e.clientX - drag.startClientX) / state.mindMapZoom;
      const dy = (e.clientY - drag.startClientY) / state.mindMapZoom;
      if (!drag.moved) {
        if (Math.hypot(e.clientX - drag.startClientX, e.clientY - drag.startClientY) < 3) return;
        drag.moved = true;
        nodeBtn.classList.add("is-dragging");
      }
      const x = drag.startX + dx;
      const y = drag.startY + dy;
      layout.set(node.id, { x, y });
      nodeBtn.style.left = `${x}px`;
      nodeBtn.style.top = `${y}px`;
      if (addBtn) {
        addBtn.style.left = `${x + MINDMAP_NODE_HALF_W + MINDMAP_ADD_CHILD_OFFSET}px`;
        addBtn.style.top = `${y}px`;
      }
      if (expandBtn) {
        expandBtn.style.left = `${x + MINDMAP_NODE_HALF_W + MINDMAP_ADD_CHILD_OFFSET}px`;
        expandBtn.style.top = `${y}px`;
      }
      updateMindMapLinksFor(node.id, layout);
    });
    nodeBtn.addEventListener("pointerup", e => {
      const drag = state.mindMapNodeDrag;
      if (!drag || drag.id !== node.id || drag.pointerId !== e.pointerId) return;
      state.mindMapNodeDrag = null;
      nodeBtn.classList.remove("is-dragging");
      releasePointerCaptureSafe(nodeBtn, e.pointerId);
      if (drag.moved) {
        const finalPos = layout.get(node.id);
        if (finalPos) {
          pushMindMapUndoSnapshot();
          node.x = finalPos.x;
          node.y = finalPos.y;
          scheduleMindMapSave();
        }
      }
    });
    nodeBtn.addEventListener("pointercancel", e => {
      const drag = state.mindMapNodeDrag;
      if (!drag || drag.id !== node.id || drag.pointerId !== e.pointerId) return;
      state.mindMapNodeDrag = null;
      nodeBtn.classList.remove("is-dragging");
      releasePointerCaptureSafe(nodeBtn, e.pointerId);
      if (drag.moved) renderMindMap();
    });
    nodeBtn.addEventListener("lostpointercapture", e => {
      const drag = state.mindMapNodeDrag;
      if (!drag || drag.id !== node.id || drag.pointerId !== e.pointerId) return;
      state.mindMapNodeDrag = null;
      nodeBtn.classList.remove("is-dragging");
      if (drag.moved) renderMindMap();
    });
    els.mindMapNodes.appendChild(nodeBtn);
    if (expandBtn) els.mindMapNodes.appendChild(expandBtn);
    if (addBtn) els.mindMapNodes.appendChild(addBtn);
  }

  for (const link of (state.mindMap.extra_links || [])) {
    const fromPos = layout.get(link.from_id);
    const toPos = layout.get(link.to_id);
    if (!fromPos || !toPos) continue;
    const extraPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    extraPath.setAttribute("class", "mindmap-extra-link");
    extraPath.dataset.from = link.from_id;
    extraPath.dataset.to = link.to_id;
    setMindMapLinkPath(extraPath, fromPos, toPos);
    els.mindMapLinks.appendChild(extraPath);
    const hitPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    hitPath.setAttribute("class", "mindmap-extra-link-hit");
    hitPath.dataset.from = link.from_id;
    hitPath.dataset.to = link.to_id;
    setMindMapLinkPath(hitPath, fromPos, toPos);
    hitPath.addEventListener("contextmenu", e => {
      e.preventDefault();
      e.stopPropagation();
      if (presentationMode) return;
      showMindMapExtraLinkCtxMenu(e.clientX, e.clientY, link.from_id, link.to_id);
    });
    els.mindMapLinks.appendChild(hitPath);
  }

  applyMindMapTransform();
}

function selectMindMapNode(id) {
  if (!getMindMapNode(id)) return;
  state.mindMapSelectedId = id;
  renderMindMap();
  setCollabPresence("mindmap");
  if (!isMindMapPresentationMode()) scheduleMindMapSave();
}

function startMindMapNodeEdit(nodeId) {
  if (isMindMapPresentationMode()) return;
  const node = getMindMapNode(nodeId);
  if (!node) return;
  if (state.mindMapSelectedId !== nodeId) {
    state.mindMapSelectedId = nodeId;
    renderMindMap();
  }
  const nodeBtn = els.mindMapNodes.querySelector(`.mindmap-node[data-id="${nodeId}"]`);
  if (!nodeBtn || nodeBtn.classList.contains("is-editing")) return;

  clearTimeout(state.mindMapSaveTimer);
  state.mindMapInlineEditNodeId = nodeId;
  els.mindMapStatus.textContent = "編集中...";
  setCollabPresence("mindmap-node-title", { immediate: true });

  const input = document.createElement("input");
  input.type = "text";
  input.className = `mindmap-node-edit${node.parent_id === null ? " is-root" : ""}`;
  input.maxLength = 80;
  input.value = node.title || "";
  input.style.left = nodeBtn.style.left;
  input.style.top = nodeBtn.style.top;

  let finished = false;
  let isComposing = false;
  const finish = commit => {
    if (finished) return;
    finished = true;
    if (commit) {
      const nextTitle = (input.value.trim() || "トピック").slice(0, 80);
      if (nextTitle !== (node.title || "トピック")) {
        pushMindMapUndoSnapshot();
      }
      node.title = nextTitle;
      mirrorSourceNodeTitleToMindMap(node);
      setMindMapNodeButtonContent(nodeBtn, node);
      if (state.mindMapSelectedId === nodeId) {
        els.mindMapNodeTitleInput.value = node.title;
      }
      scheduleMindMapSave();
    }
    nodeBtn.classList.remove("is-editing");
    state.mindMapInlineEditNodeId = null;
    input.remove();
    setCollabPresence("mindmap");
  };
  input.addEventListener("compositionstart", () => { isComposing = true; });
  input.addEventListener("compositionend", () => { isComposing = false; });
  input.addEventListener("blur", () => finish(true));
  input.addEventListener("keydown", e => {
    e.stopPropagation();
    if (e.key === "Enter" && !isImeComposing(e, isComposing)) {
      e.preventDefault();
      finish(true);
    } else if (e.key === "Escape" && !isImeComposing(e, isComposing)) {
      e.preventDefault();
      finish(false);
    }
  });
  input.addEventListener("pointerdown", e => e.stopPropagation());

  nodeBtn.classList.add("is-editing");
  els.mindMapNodes.appendChild(input);
  input.focus();
  input.select();
}

function createNewRootNode(clientX, clientY) {
  if (!state.mindMap || isMindMapPresentationMode()) return;
  const rect = els.mindMapCanvas.getBoundingClientRect();
  const layout = calculateMindMapLayout();
  pushMindMapUndoSnapshot();
  preserveVisibleMindMapPositions(layout);
  const desiredPos = {
    x: (clientX - rect.left - state.mindMapPanX) / state.mindMapZoom,
    y: (clientY - rect.top - state.mindMapPanY) / state.mindMapZoom,
  };
  const node = {
    id: makeId(),
    parent_id: null,
    title: "新しいトピック",
    order: nextMindMapOrder(null),
    x: desiredPos.x,
    y: desiredPos.y,
    collapsed: false,
    fill_color: null,
    border_color: null,
    link_color: null,
    memo: "",
  };
  const safePos = findNonOverlappingMindMapPosition(node, desiredPos, layout);
  node.x = safePos.x;
  node.y = safePos.y;
  state.mindMap.nodes.push(node);
  state.mindMapSelectedId = node.id;
  renderMindMap();
  scheduleMindMapSave();
  requestAnimationFrame(() => startMindMapNodeEdit(node.id));
}

function addMindMapNode(parentId) {
  if (isMindMapPresentationMode()) return;
  const parent = getMindMapNode(parentId);
  if (!parent) return;
  pushMindMapUndoSnapshot();
  const layout = calculateMindMapLayout();
  const parentPos = layout.get(parent.id) ?? {
    x: Number.isFinite(parent.x) ? parent.x : MINDMAP_CENTER_X,
    y: Number.isFinite(parent.y) ? parent.y : MINDMAP_CENTER_Y,
  };
  const siblings = getMindMapChildren(parent.id);
  preserveVisibleMindMapPositions(layout);
  parent.collapsed = false;
  const node = {
    id: makeId(),
    parent_id: parent.id,
    title: "新しいトピック",
    order: nextMindMapOrder(parent.id),
    x: parentPos.x + MINDMAP_X_GAP,
    y: parentPos.y,
    fill_color: null,
    border_color: null,
    link_color: null,
    memo: "",
  };
  if (siblings.length > 0) {
    const lastSibling = siblings[siblings.length - 1];
    const bounds = getMindMapVisibleSubtreeVerticalBounds(lastSibling.id, layout);
    node.y = bounds.maxY + MINDMAP_ALIGN_SUBTREE_GAP + estimateMindMapNodeHeight(node) / 2;
  }
  const safePos = findNonOverlappingMindMapPosition(node, { x: node.x, y: node.y }, layout);
  node.x = safePos.x;
  node.y = safePos.y;
  state.mindMap.nodes.push(node);
  state.mindMapSelectedId = node.id;
  renderMindMap();
  scheduleMindMapSave();
  requestAnimationFrame(() => startMindMapNodeEdit(node.id));
}


function addMindMapExtraLink(fromId, toId) {
  if (!state.mindMap || isMindMapPresentationMode() || fromId === toId) return;
  const toNode = getMindMapNode(toId);
  const fromNode = getMindMapNode(fromId);
  if (toNode?.parent_id === fromId || fromNode?.parent_id === toId) return;
  if ((state.mindMap.extra_links || []).some(l => l.from_id === fromId && l.to_id === toId)) return;
  pushMindMapUndoSnapshot();
  state.mindMap.extra_links = [...(state.mindMap.extra_links || []), { from_id: fromId, to_id: toId }];
  renderMindMap();
  scheduleMindMapSave();
}

function removeMindMapExtraLink(fromId, toId) {
  if (!state.mindMap || isMindMapPresentationMode()) return;
  pushMindMapUndoSnapshot();
  state.mindMap.extra_links = (state.mindMap.extra_links || []).filter(
    l => !(l.from_id === fromId && l.to_id === toId)
  );
  renderMindMap();
  scheduleMindMapSave();
}

function showMindMapRubberBand(x1, y1, x2, y2) {
  let el = document.getElementById("mindMapRubberBand");
  if (!el) {
    el = document.createElement("div");
    el.id = "mindMapRubberBand";
    el.className = "mindmap-rubber-band";
    document.body.appendChild(el);
  }
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  el.style.left = `${x1}px`;
  el.style.top = `${y1}px`;
  el.style.width = `${len}px`;
  el.style.transform = `rotate(${angle}deg)`;
  el.hidden = false;
}

function hideMindMapRubberBand() {
  const el = document.getElementById("mindMapRubberBand");
  if (el) el.hidden = true;
}

function setMindMapLinkTargetHighlight(clientX, clientY, excludeId) {
  clearMindMapLinkTargetHighlight();
  const el = document.elementFromPoint(clientX, clientY)?.closest(".mindmap-node");
  if (el && el.dataset.id !== excludeId) el.classList.add("is-link-target");
}

function clearMindMapLinkTargetHighlight() {
  els.mindMapNodes.querySelectorAll(".mindmap-node.is-link-target").forEach(el => {
    el.classList.remove("is-link-target");
  });
}

function setPointerCaptureSafe(element, pointerId) {
  try {
    element?.setPointerCapture?.(pointerId);
  } catch (_) {
    // Dragging can still continue while the pointer stays over the element.
  }
}

function releasePointerCaptureSafe(element, pointerId) {
  try {
    if (element?.hasPointerCapture?.(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
  } catch (_) {
    // Pointer capture may already be gone if the browser canceled the pointer.
  }
}

function getMindMapSubtreeBranches(nodeId) {
  const subtreeIds = collectMindMapSubtreeIds(nodeId);
  return getMindMapNodes().filter(node => (
    subtreeIds.has(node.id) && getMindMapChildren(node.id).length > 0
  ));
}

function toggleMindMapChildren(nodeId) {
  const node = getMindMapNode(nodeId);
  if (!node) return;
  const hiddenCount = countMindMapDescendants(node.id);
  if (hiddenCount === 0) {
    showToast("表示を切り替える子ノードがありません。");
    return;
  }

  pushMindMapUndoSnapshot();
  const willExpand = node.collapsed;
  node.collapsed = !node.collapsed;
  if (willExpand && !alignMindMapVisibleChildrenOfParent(node, { avoidExternalOverlaps: true })) {
    avoidMindMapExpandedChildrenOverlaps(node.id);
  }
  state.mindMapSelectedId = node.id;
  renderMindMap();
  scheduleMindMapSave();
  showToast(node.collapsed ? `子ノード ${hiddenCount}件を隠しました。` : "子ノードを表示しました。");
}

function collapseMindMapSubtree(nodeId) {
  const node = getMindMapNode(nodeId);
  if (!node) return;
  const hiddenCount = countMindMapDescendants(node.id);
  if (hiddenCount === 0) {
    showToast("折りたためる配下ノードがありません。");
    return;
  }

  const branches = getMindMapSubtreeBranches(node.id);
  if (branches.every(branch => branch.collapsed)) {
    showToast("配下はすでに折りたたまれています。");
    return;
  }

  pushMindMapUndoSnapshot();
  branches.forEach(branch => { branch.collapsed = true; });
  state.mindMapSelectedId = node.id;
  renderMindMap();
  scheduleMindMapSave();
  showToast(`配下のノード ${hiddenCount}件をすべて折りたたみました。`);
}

function estimateMindMapNodeHeight(node) {
  const text = String(node?.title || "トピック");
  const weightedLength = Array.from(text).reduce((sum, ch) => (
    sum + (/[\x00-\x7F]/.test(ch) ? 0.55 : 1)
  ), 0);
  const lines = Math.max(1, Math.ceil(weightedLength / 8.5));
  const minHeight = node?.parent_id === null ? 66 : 54;
  return Math.max(minHeight, 24 + lines * 21) + MINDMAP_ALIGN_NODE_SAFETY_Y;
}

function getMindMapNodePosition(node, layout) {
  if (!node) return null;
  const layoutPos = layout.get(node.id);
  if (layoutPos) return layoutPos;
  if (Number.isFinite(node.x) && Number.isFinite(node.y)) return { x: node.x, y: node.y };
  return null;
}

function getMindMapSubtreeBounds(nodeId, layout) {
  const ids = collectMindMapSubtreeIds(nodeId);
  let minY = Infinity;
  let maxY = -Infinity;

  for (const id of ids) {
    const node = getMindMapNode(id);
    const pos = getMindMapNodePosition(node, layout);
    if (!node || !pos || !isMindMapNodeVisible(node)) continue;
    const rect = getMindMapNodeCollisionRect(node, pos);
    minY = Math.min(minY, rect.top);
    maxY = Math.max(maxY, rect.bottom);
  }

  const target = getMindMapNode(nodeId);
  const targetPos = getMindMapNodePosition(target, layout) ?? { x: MINDMAP_CENTER_X, y: MINDMAP_CENTER_Y };
  if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
    const rect = getMindMapNodeCollisionRect(target, targetPos);
    minY = rect.top;
    maxY = rect.bottom;
  }

  return {
    ids,
    height: Math.max(estimateMindMapNodeHeight(target), maxY - minY),
    targetOffsetY: targetPos.y - minY,
    targetPos,
  };
}

function createMindMapChildAlignPlans(children, parentPos, layout) {
  const groups = children.map((node, index) => ({
    node,
    index,
    ...getMindMapSubtreeBounds(node.id, layout),
  }));
  const totalHeight = groups.reduce((sum, group) => sum + group.height, 0)
    + MINDMAP_ALIGN_SUBTREE_GAP * (groups.length - 1);
  let cursorY = parentPos.y - totalHeight / 2;

  return groups.map(group => {
    const targetY = cursorY + group.targetOffsetY;
    const plan = {
      ...group,
      targetX: parentPos.x + MINDMAP_X_GAP,
      targetY,
      dx: parentPos.x + MINDMAP_X_GAP - group.targetPos.x,
      dy: targetY - group.targetPos.y,
    };
    cursorY += group.height + MINDMAP_ALIGN_SUBTREE_GAP;
    return plan;
  });
}

function getMindMapAlignPlanCollisionRects(plan, layout) {
  const rects = [];
  for (const id of plan.ids) {
    const node = getMindMapNode(id);
    const pos = getMindMapNodePosition(node, layout);
    if (!node || !pos || !isMindMapNodeVisible(node)) continue;
    rects.push(getMindMapNodeCollisionRect(node, {
      x: pos.x + plan.dx,
      y: pos.y + plan.dy,
    }));
  }
  return rects;
}

function shiftMindMapAlignPlan(plan, dy) {
  plan.targetY += dy;
  plan.dy += dy;
}

function resolveMindMapChildAlignPlanOverlaps(plans, layout, initialRects = []) {
  const placedRects = [...initialRects];

  for (const plan of plans) {
    let rects = getMindMapAlignPlanCollisionRects(plan, layout);

    for (let i = 0; i < 80; i += 1) {
      let shiftY = 0;
      for (const rect of rects) {
        for (const placed of placedRects) {
          if (mindMapRectsOverlap(rect, placed)) {
            shiftY = Math.max(shiftY, placed.bottom - rect.top + 1);
          }
        }
      }
      if (shiftY <= 0) break;
      shiftMindMapAlignPlan(plan, shiftY);
      rects = getMindMapAlignPlanCollisionRects(plan, layout);
    }

    placedRects.push(...rects);
  }

  return plans;
}

function createMindMapCurrentSubtreeShiftPlans(nodes, layout) {
  return nodes.map((node, index) => {
    const pos = getMindMapNodePosition(node, layout) ?? { x: MINDMAP_CENTER_X, y: MINDMAP_CENTER_Y };
    return {
      node,
      index,
      ids: collectMindMapSubtreeIds(node.id),
      targetX: pos.x,
      targetY: pos.y,
      targetPos: pos,
      dx: 0,
      dy: 0,
    };
  });
}

function getMindMapAlignPlanMovingIds(plans) {
  const ids = new Set();
  plans.forEach(plan => {
    plan.ids.forEach(id => {
      const node = getMindMapNode(id);
      if (node && isMindMapNodeVisible(node)) ids.add(id);
    });
  });
  return ids;
}

function applyMindMapSubtreeShiftPlans(plans, layout, options = {}) {
  const updateOrder = Boolean(options.updateOrder);
  let changed = false;
  for (const plan of plans) {
    if (Math.abs(plan.dx) >= 0.5 || Math.abs(plan.dy) >= 0.5) {
      changed = true;
      for (const id of plan.ids) {
        const node = getMindMapNode(id);
        const pos = getMindMapNodePosition(node, layout);
        if (!node || !pos) continue;
        node.x = pos.x + plan.dx;
        node.y = pos.y + plan.dy;
      }
    }

    if (updateOrder) {
      const nextOrder = (plan.index + 1) * 1000;
      if (plan.node.order !== nextOrder) changed = true;
      if (Number.isFinite(plan.targetX) && Number.isFinite(plan.targetY)) {
        if (plan.node.x !== plan.targetX || plan.node.y !== plan.targetY) changed = true;
        plan.node.x = plan.targetX;
        plan.node.y = plan.targetY;
      }
      plan.node.order = nextOrder;
    }
  }
  return changed;
}

function avoidMindMapExpandedChildrenOverlaps(nodeId) {
  const children = getMindMapChildren(nodeId).filter(isMindMapNodeVisible);
  if (children.length === 0) return false;

  const layout = calculateMindMapLayout();
  const plans = createMindMapCurrentSubtreeShiftPlans(children, layout);
  const movingIds = getMindMapAlignPlanMovingIds(plans);
  const externalRects = getVisibleMindMapCollisionRects(layout, movingIds);

  resolveMindMapChildAlignPlanOverlaps(plans, layout, externalRects);
  return applyMindMapSubtreeShiftPlans(plans, layout);
}

function alignMindMapVisibleChildrenOfParent(parent, options = {}) {
  if (!parent) return false;
  const children = getMindMapChildren(parent.id).filter(isMindMapNodeVisible);
  if (children.length < 2) return false;

  const layout = calculateMindMapLayout();
  const parentPos = layout.get(parent.id) ?? {
    x: Number.isFinite(parent.x) ? parent.x : MINDMAP_CENTER_X,
    y: Number.isFinite(parent.y) ? parent.y : MINDMAP_CENTER_Y,
  };
  const plans = createMindMapChildAlignPlans(children, parentPos, layout);
  const movingIds = getMindMapAlignPlanMovingIds(plans);
  const externalRects = options.avoidExternalOverlaps
    ? getVisibleMindMapCollisionRects(layout, movingIds)
    : [];

  resolveMindMapChildAlignPlanOverlaps(plans, layout, externalRects);
  applyMindMapSubtreeShiftPlans(plans, layout, { updateOrder: true });
  return true;
}

function alignMindMapChildNodes() {
  if (isMindMapPresentationMode()) return;
  const selected = getMindMapNode(state.mindMapSelectedId);
  const { parent, nodes } = getMindMapAlignTarget(selected);
  if (!parent || nodes.length < 2) {
    showToast("整列できる子ノードがありません。");
    return;
  }

  pushMindMapUndoSnapshot();
  alignMindMapVisibleChildrenOfParent(parent);
  renderMindMap();
  scheduleMindMapSave();
  showToast("子ノードを整列しました。");
}

function collectMindMapSubtreeIds(nodeId) {
  const ids = new Set([nodeId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of getMindMapNodes()) {
      if (ids.has(node.parent_id) && !ids.has(node.id)) {
        ids.add(node.id);
        changed = true;
      }
    }
  }
  return ids;
}

async function deleteSelectedMindMapNode() {
  if (isMindMapPresentationMode()) return;
  const selected = getMindMapNode(state.mindMapSelectedId);
  if (!selected) return;
  if (selected.parent_id === null && getMindMapNodes().filter(n => n.parent_id === null).length <= 1) {
    showToast("中心テーマは削除できません。");
    return;
  }
  const ok = await showConfirm(`「${selected.title}」と子ノードを削除しますか？`);
  if (!ok) return;
  pushMindMapUndoSnapshot();
  const ids = collectMindMapSubtreeIds(selected.id);
  const removesSyncRoot = Boolean(
    state.mindMap.sync_enabled
    && state.mindMap.source_node_id
    && ids.has(state.mindMap.source_node_id)
  );
  if (removesSyncRoot) await unlinkMindMap(state.mindMap.id);
  state.mindMap.nodes = getMindMapNodes().filter(node => !ids.has(node.id));
  state.mindMap.extra_links = (state.mindMap.extra_links || []).filter(l => !ids.has(l.from_id) && !ids.has(l.to_id));
  state.mindMapSelectedId = selected.parent_id;
  renderMindMap();
  scheduleMindMapSave();
  showToast(removesSyncRoot ? "同期を解除してノードを削除しました。" : "ノードを削除しました。");
}

function formatListDate(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return m ? `${m[1]}/${m[2]}/${m[3]} ${m[4]}:${m[5]}` : "";
}

async function createNewMindMap() {
  if (isMindMapPresentationMode()) return;
  if (blockNewMindMapInCollab()) return;
  if (state.mindMap) await saveMindMapNow();
  const map = createDefaultMindMap();
  const previous = state.mindMap;
  state.mindMap = map;
  state.mindMapSelectedId = map.selected_node_id;
  try {
    await mindMapsCollection().doc(map.id).set(serializeMindMap());
  } catch (e) {
    state.mindMap = previous;
    state.mindMapSelectedId = previous?.selected_node_id ?? null;
    showToast(e.message);
    return;
  }
  state.mindMapCentered = false;
  state.mindMapList.unshift(mapListEntryFromMindMap(map));
  clearMindMapUndoStack();
  closeMindMapListPanel();
  renderMindMap();
  centerMindMap();
  els.mindMapStatus.textContent = mindMapSavedStatus(map);
  els.mindMapTitleInput.focus();
  els.mindMapTitleInput.select();
  showToast("新しいマインドマップを作成しました。");
}

async function switchMindMap(id) {
  if (!state.mindMap || state.mindMap.id === id) {
    closeMindMapListPanel();
    return;
  }
  await saveMindMapNow();
  els.mindMapStatus.textContent = "読み込み中...";
  try {
    const doc = await mindMapsCollection().doc(id).get();
    if (!doc.exists) {
      state.mindMapList = state.mindMapList.filter(m => m.id !== id);
      renderMindMapList();
      showToast("マインドマップが見つかりませんでした。");
      return;
    }
    state.mindMap = normalizeMindMap(doc.data(), doc.id);
    state.mindMapSelectedId = state.mindMap.selected_node_id;
    state.mindMapCentered = false;
    clearMindMapUndoStack();
    renderMindMap();
    centerMindMap();
    els.mindMapStatus.textContent = mindMapSavedStatus(state.mindMap);
  } catch (e) {
    showToast(e.message);
  }
  closeMindMapListPanel();
}

async function convertMindMapListEntryToNotes(id) {
  if (!id) return;
  if (state.mindMap?.id !== id) await switchMindMap(id);
  if (state.mindMap?.id !== id) return;
  await convertCurrentMindMapToNotes();
}

function removeMindMapFromStateAfterLinkedDelete(id) {
  state.mindMapList = state.mindMapList.filter(map => map.id !== id);
  if (state.mindMap?.id === id) {
    clearTimeout(state.mindMapSaveTimer);
    state.mindMap = null;
    state.mindMapSelectedId = null;
    state.mindMapLoaded = false;
    clearMindMapUndoStack();
  }
  renderMindMapList();
}

async function deleteMindMap(id) {
  if (isMindMapPresentationMode()) return;
  // 共同ルームは1つの共有コンテンツ（親メモやマインドマップ）を扱う設計のため、
  // 共同作業中はどのマインドマップも削除できないようにする。
  if (isCollabActive()) {
    showToast("共同作業中はマインドマップを削除できません。");
    return;
  }
  let targetMap;
  try {
    targetMap = await getMindMapById(id);
  } catch (e) {
    showToast(e.message);
    return;
  }
  const target = state.mindMapList.find(map => map.id === id);
  const title = targetMap?.title || target?.title || "新しいマインドマップ";
  const sourceNoteId = targetMap?.sync_enabled ? targetMap.source_note_id : null;
  let deleteLinkedNotes = false;
  if (sourceNoteId) {
    const decision = await showSyncedDeleteConfirm(
      `「${title}」はメモと同期中です。同期先も削除しますか？`,
      "マップだけ削除",
    );
    if (decision === false) return;
    deleteLinkedNotes = decision === true;
    if (deleteLinkedNotes && getNotes().some(note => note.id === sourceNoteId)) {
      if (!await ensureNoteAccess(sourceNoteId)) return;
    }
  } else {
    const ok = await showConfirm(`「${title}」を削除しますか？`, "削除");
    if (!ok) return;
  }

  const linkedSourceNote = sourceNoteId
    ? getNotes().find(note => note.id === sourceNoteId) || null
    : null;
  let linkedNoteSnapshot = null;
  try {
    if (deleteLinkedNotes) {
      linkedNoteSnapshot = snapshotDeletedNotes(sourceNoteId);
      const deleteIds = linkedNoteSnapshot.notes.map(note => note.id);
      await deleteNoteDocumentsWithMindMaps(deleteIds, [id]);
      removeDeletedNotesFromState(deleteIds, linkedSourceNote?.parent_id ?? null);
    } else {
      await unlinkMindMap(id);
      await mindMapsCollection().doc(id).delete();
    }
  } catch (e) {
    showToast(e.message);
    return;
  }
  const deletedMessage = deleteLinkedNotes
    ? "マインドマップと同期先のメモを削除しました。"
    : "マインドマップを削除しました。";
  state.mindMapList = state.mindMapList.filter(m => m.id !== id);
  if (state.mindMap?.id === id) {
    clearTimeout(state.mindMapSaveTimer);
    const next = state.mindMapList[0];
    if (!next) {
      state.mindMap = null;
      state.mindMapSelectedId = null;
      state.mindMapLoaded = false;
      clearMindMapUndoStack();
      renderMindMapList();
      await closeMindMapPanel();
      showToast(deletedMessage);
      return;
    }
    try {
      const doc = await mindMapsCollection().doc(next.id).get();
      state.mindMap = normalizeMindMap(doc.data(), doc.id);
    } catch {
      state.mindMap = createDefaultMindMap(next.id);
    }
    state.mindMapSelectedId = state.mindMap.selected_node_id;
    state.mindMapCentered = false;
    clearMindMapUndoStack();
    renderMindMap();
    centerMindMap();
    els.mindMapStatus.textContent = mindMapSavedStatus(state.mindMap);
  }
  renderMindMapList();
  showToast(deletedMessage);
}

async function renameMindMapAndSync(id, title) {
  let map;
  if (state.mindMap?.id === id) {
    state.mindMap.title = title;
    mirrorMindMapTitleToSourceNode(title);
    await saveMindMapNow();
    return;
  }

  const doc = await mindMapsCollection().doc(id).get();
  if (!doc.exists) return;
  map = normalizeMindMap(doc.data(), doc.id);
  map.title = title;
  map.updated_at = nowIso();
  if (map.sync_enabled && map.source_node_id) {
    const sourceNode = map.nodes.find(node => node.id === map.source_node_id);
    if (sourceNode?.parent_id === null) sourceNode.title = title;
  }
  await mindMapsCollection().doc(id).set(map, { merge: true });
  if (map.sync_enabled) await syncLinkedNotesFromMindMap(map);
}

// Safari/Chromeのタブ一覧のように、マインドマップもカード形式で並べて一目で探せるようにする。
// 縦一列のリストだった「マインドマップ一覧」を置き換える表示方法（親メモのグリッドと同じ形）。
function renderMindMapList() {
  if (!els.mindMapGridItems) return;
  els.mindMapGridItems.innerHTML = "";
  const presentationMode = isMindMapPresentationMode();

  if (state.mindMapList.length === 0) {
    const empty = document.createElement("p");
    empty.className = "note-grid-empty";
    empty.textContent = "マインドマップはまだありません。";
    els.mindMapGridItems.appendChild(empty);
    return;
  }

  state.mindMapList.forEach(entry => {
    const card = document.createElement("div");
    card.className = `note-grid-card${entry.id === state.mindMap?.id ? " is-active" : ""}`;
    card.dataset.id = entry.id;
    if (entry.sync_enabled && entry.source_note_id) applySyncPairStyle(card, entry.id);

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "note-grid-card-open";
    openBtn.dataset.action = "switch";

    const titleRow = document.createElement("span");
    titleRow.className = "note-grid-card-title-row";

    const title = document.createElement("span");
    title.className = "note-grid-card-title";
    title.textContent = entry.title || "新しいマインドマップ";
    titleRow.appendChild(title);
    if (entry.sync_enabled && entry.source_note_id) {
      titleRow.appendChild(createSyncPairBadge(
        entry.id,
        entry.source_note_title
          ? `メモ「${entry.source_note_title}」と同期中`
          : "メモと同期中",
      ));
    }
    openBtn.appendChild(titleRow);

    const date = document.createElement("span");
    date.className = "note-grid-card-date";
    date.textContent = formatListDate(entry.updated_at);
    openBtn.appendChild(date);
    card.appendChild(openBtn);

    const actions = document.createElement("div");
    actions.className = "note-grid-card-actions";
    actions.hidden = presentationMode;

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "note-grid-card-icon-btn danger";
    deleteBtn.dataset.action = "delete";
    deleteBtn.title = isCollabActive() ? "共同作業中はマインドマップを削除できません" : "削除";
    deleteBtn.setAttribute("aria-label", "削除");
    deleteBtn.textContent = "🗑";
    deleteBtn.disabled = state.mindMapList.length <= 1 || isCollabActive();
    actions.appendChild(deleteBtn);

    card.appendChild(actions);
    card.addEventListener("contextmenu", e => {
      e.preventDefault();
      e.stopPropagation();
      if (presentationMode) return;
      showMindMapListCtxMenu(e.clientX, e.clientY, entry.id);
    });
    els.mindMapGridItems.appendChild(card);
  });
}

function openMindMapListPanel() {
  if (!els.mindMapGridOverlay) return;
  renderMindMapList();
  els.mindMapGridOverlay.hidden = false;
  document.body.classList.add("has-management-open");
  els.mindMapListBtn.setAttribute("aria-expanded", "true");
}

function closeMindMapListPanel() {
  if (!els.mindMapGridOverlay || els.mindMapGridOverlay.hidden) return;
  els.mindMapGridOverlay.hidden = true;
  document.body.classList.remove("has-management-open");
  els.mindMapListBtn.setAttribute("aria-expanded", "false");
}

function positionMindMapFloatingSettingsPanel(panel, button) {
  if (!panel || !button || panel.hidden) return;

  const gap = 8;
  const edge = 8;
  const rect = button.getBoundingClientRect();
  const panelWidth = panel.offsetWidth;
  const panelHeight = panel.offsetHeight;
  const maxLeft = Math.max(edge, window.innerWidth - panelWidth - edge);
  const maxTop = Math.max(edge, window.innerHeight - panelHeight - edge);
  let left = rect.right - panelWidth;
  let top = rect.bottom + gap;

  left = Math.min(maxLeft, Math.max(edge, left));
  if (top > maxTop) {
    const above = rect.top - panelHeight - gap;
    top = above >= edge ? above : maxTop;
  }

  panel.style.left = `${left}px`;
  panel.style.top = `${Math.max(edge, top)}px`;
}

function positionMindMapSettingsPanel() {
  positionMindMapFloatingSettingsPanel(els.mindMapSettingsPanel, els.mindMapSettingsBtn);
}

function positionMemoSettingsPanel() {
  positionMindMapFloatingSettingsPanel(els.memoSettingsPanel, els.memoSettingsBtn);
}

function positionMindMapNodeSettingsPanel() {
  if (els.mindMapNodeSettingsPanel?.classList.contains("is-memo-fullscreen")) return;
  positionMindMapFloatingSettingsPanel(els.mindMapNodeSettingsPanel, els.mindMapNodeSettingsBtn);
}

function setMindMapMemoFullscreen(open) {
  const canOpen = Boolean(open) &&
    !els.mindMapNodeSettingsPanel?.hidden &&
    !isMindMapPresentationMode() &&
    Boolean(getMindMapNode(state.mindMapSelectedId));
  els.mindMapNodeSettingsPanel?.classList.toggle("is-memo-fullscreen", canOpen);
  document.body.classList.toggle("has-mindmap-memo-fullscreen", canOpen);
  if (els.mindMapMemoLargeBtn) {
    els.mindMapMemoLargeBtn.setAttribute("aria-pressed", String(canOpen));
    els.mindMapMemoLargeBtn.hidden = canOpen;
  }
  if (els.mindMapNodeSettingsClose) {
    els.mindMapNodeSettingsClose.setAttribute("aria-label", canOpen ? "元のサイズに戻す" : "ノード設定を閉じる");
    els.mindMapNodeSettingsClose.title = canOpen ? "元のサイズに戻す（Esc）" : "閉じる";
  }
  if (canOpen) {
    closeMindMapColorControls();
    requestAnimationFrame(() => els.mindMapNodeMemoInput?.focus());
  } else if (!els.mindMapNodeSettingsPanel?.hidden) {
    positionMindMapNodeSettingsPanel();
  }
}

function toggleMindMapMemoFullscreen() {
  setMindMapMemoFullscreen(!els.mindMapNodeSettingsPanel?.classList.contains("is-memo-fullscreen"));
}

function openMindMapSettingsPanel() {
  closeMindMapNodeSettingsPanel();
  closeMindMapListPanel();
  hideMindMapCtxMenu();
  if (els.accountMenu) els.accountMenu.hidden = true;
  els.mindMapSettingsPanel.hidden = false;
  els.mindMapSettingsBtn.setAttribute("aria-expanded", "true");
  positionMindMapSettingsPanel();
}

function closeMindMapSettingsPanel() {
  if (!els.mindMapSettingsPanel) return;
  els.mindMapSettingsPanel.hidden = true;
  els.mindMapSettingsBtn?.setAttribute("aria-expanded", "false");
}

function toggleMindMapSettingsPanel() {
  if (els.mindMapSettingsPanel.hidden) openMindMapSettingsPanel();
  else closeMindMapSettingsPanel();
}

function openMindMapNodeSettingsPanel() {
  if (isMindMapPresentationMode()) return;
  if (!getMindMapNode(state.mindMapSelectedId)) return;
  closeMindMapSettingsPanel();
  closeMindMapListPanel();
  hideMindMapCtxMenu();
  if (els.accountMenu) els.accountMenu.hidden = true;
  els.mindMapNodeSettingsPanel.hidden = false;
  els.mindMapNodeSettingsBtn.setAttribute("aria-expanded", "true");
  positionMindMapNodeSettingsPanel();
}

function closeMindMapNodeSettingsPanel() {
  if (!els.mindMapNodeSettingsPanel) return;
  setMindMapMemoFullscreen(false);
  closeMindMapColorControls();
  els.mindMapNodeSettingsPanel.hidden = true;
  els.mindMapNodeSettingsBtn?.setAttribute("aria-expanded", "false");
}

function handleMindMapNodeSettingsClose() {
  if (els.mindMapNodeSettingsPanel?.classList.contains("is-memo-fullscreen")) {
    setMindMapMemoFullscreen(false);
    return;
  }
  closeMindMapNodeSettingsPanel();
}

function toggleMindMapNodeSettingsPanel() {
  if (els.mindMapNodeSettingsPanel.hidden) openMindMapNodeSettingsPanel();
  else closeMindMapNodeSettingsPanel();
}

async function openMindMapPanel() {
  try {
    closeMindMapSettingsPanel();
    closeMindMapNodeSettingsPanel();
    closeMobileMenu();
    closeTemplatesPanel();
    hideCtxMenu();
    hideMediaCtxMenu();
    if (els.accountMenu) els.accountMenu.hidden = true;
    await saveCurrentEditorNow();
    els.appShell.hidden = true;
    els.mindMapOverlay.hidden = false;
    await loadMindMap();
    renderMindMap();
    setCollabPresence("mindmap", { immediate: true });
    requestAnimationFrame(() => {
      if (!state.mindMapCentered) centerMindMap();
      else applyMindMapTransform();
    });
  } catch (e) {
    els.mindMapOverlay.hidden = true;
    els.appShell.hidden = false;
    showToast(e?.message || "マインドマップを開けませんでした。");
  }
}

async function closeMindMapPanel() {
  if (els.mindMapOverlay.hidden) return;
  if (els.mindMapOverlay.classList.contains("is-large-view")) setMindMapLargeView(false);
  if (isMindMapPresentationMode()) setMindMapPresentationMode(false);
  closeMindMapSettingsPanel();
  closeMindMapNodeSettingsPanel();
  els.mindMapOverlay.hidden = true;
  els.appShell.hidden = false;
  closeMindMapListPanel();
  closeMindMapTemplatesPanel();
  closeMindMapAiPanel();
  hideMindMapCtxMenu();
  if (state.mindMap) await saveMindMapNow();
  renderTree();
  renderEditor();
  setCollabPresence("viewing", { immediate: true });
}

function mirrorMindMapTitleToSourceNode(title) {
  if (!state.mindMap?.sync_enabled || !state.mindMap.source_node_id) return;
  const sourceNode = getMindMapNode(state.mindMap.source_node_id);
  if (!sourceNode || sourceNode.parent_id !== null) return;
  sourceNode.title = String(title || "中心テーマ").slice(0, 80);
  if (state.mindMapSelectedId === sourceNode.id && els.mindMapNodeTitleInput) {
    els.mindMapNodeTitleInput.value = sourceNode.title;
  }
  const nodeEl = els.mindMapNodes.querySelector(`.mindmap-node[data-id="${sourceNode.id}"]`);
  if (nodeEl) setMindMapNodeButtonContent(nodeEl, sourceNode);
}

function mirrorSourceNodeTitleToMindMap(node) {
  if (!state.mindMap?.sync_enabled || !node || node.id !== state.mindMap.source_node_id) return;
  if (node.parent_id !== null) return;
  state.mindMap.title = String(node.title || "新しいマインドマップ").slice(0, 80);
  if (els.mindMapTitleInput) els.mindMapTitleInput.value = state.mindMap.title;
}

function updateSelectedMindMapTitle(value) {
  if (isMindMapPresentationMode()) return;
  const selected = getMindMapNode(state.mindMapSelectedId);
  if (!selected) return;
  selected.title = String(value ?? "").slice(0, 80);
  mirrorSourceNodeTitleToMindMap(selected);
  const nodeEl = els.mindMapNodes.querySelector(`.mindmap-node[data-id="${selected.id}"]`);
  if (nodeEl) setMindMapNodeButtonContent(nodeEl, selected);
  scheduleMindMapSave();
}

function updateSelectedMindMapColor(prop, value) {
  if (isMindMapPresentationMode()) return;
  const selected = getMindMapNode(state.mindMapSelectedId);
  const color = normalizeMindMapColor(value);
  if (!selected || !color) return;
  selected[prop] = color;
  renderMindMap();
  scheduleMindMapSave();
}

function openMindMapNativeColorPicker(input) {
  if (!input || input.disabled) return;
  try {
    if (typeof input.showPicker === "function") input.showPicker();
    else input.click();
  } catch (_) {
    input.click();
  }
}

function createMindMapColorSwatch(option, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "mindmap-color-swatch";
  button.dataset.color = option.value;
  button.style.setProperty("--mindmap-swatch-color", option.value);
  button.setAttribute("aria-label", `${option.label}を選択`);
  button.setAttribute("aria-pressed", "false");

  button.addEventListener("click", e => onClick(e, option.value, option));
  return button;
}

function renderMindMapColorPalettes() {
  getMindMapColorControls().forEach(control => {
    if (!control.palette) return;
    control.palette.innerHTML = "";
    MINDMAP_COLOR_PALETTE.forEach(option => {
      const button = createMindMapColorSwatch(option, (e, color) => {
        e.stopPropagation();
        beginMindMapEditUndo();
        updateSelectedMindMapColor(control.prop, color);
        endMindMapEditUndo();
      });
      control.palette.appendChild(button);
    });
  });
}

function renderMindMapContextColorPalettes() {
  els.mindMapContextMenu.querySelectorAll("[data-mindmap-context-color-palette]").forEach(palette => {
    palette.innerHTML = "";
    const prop = palette.dataset.mindmapContextColorPalette;
    MINDMAP_COLOR_PALETTE.forEach(option => {
      const button = createMindMapColorSwatch(option, (e, color) => {
        e.stopPropagation();
        const node = getMindMapNode(state.mindMapContextNodeId);
        if (!node) return;
        state.mindMapSelectedId = node.id;
        beginMindMapEditUndo();
        updateSelectedMindMapColor(prop, color);
        endMindMapEditUndo();
        updateMindMapContextColorPaletteState(getMindMapNode(node.id));
      });
      palette.appendChild(button);
    });
  });

  if (!els.mindMapLinkContextPalette) return;
  els.mindMapLinkContextPalette.innerHTML = "";
  MINDMAP_COLOR_PALETTE.forEach(option => {
    const button = createMindMapColorSwatch(option, (e, color) => {
      e.stopPropagation();
      const child = getMindMapNode(state.mindMapContextLinkNodeId);
      if (!child || !child.parent_id) return;
      state.mindMapSelectedId = child.id;
      pushMindMapUndoSnapshot();
      child.link_color = color;
      renderMindMap();
      scheduleMindMapSave();
      updateMindMapLinkContextPaletteState(getMindMapNode(child.id));
    });
    els.mindMapLinkContextPalette.appendChild(button);
  });
}

function bindMindMapColorControl(control) {
  const trigger = control.button?.querySelector(".mindmap-color-current-trigger");
  trigger?.addEventListener("click", e => {
    e.stopPropagation();
    if (control.button.getAttribute("aria-disabled") === "true") return;
    const shouldOpen = Boolean(control.palette?.hidden);
    closeMindMapColorControls(control.button);
    setMindMapColorControlOpen(control, shouldOpen);
  });
}

function setMindMapColorControlOpen(control, open) {
  if (!control?.button || !control.palette) return;
  const canOpen = open && control.button.getAttribute("aria-disabled") !== "true";
  const trigger = control.button.querySelector(".mindmap-color-current-trigger");
  control.palette.hidden = !canOpen;
  control.button.classList.toggle("is-open", canOpen);
  if (trigger) trigger.setAttribute("aria-expanded", String(canOpen));
}

function closeMindMapColorControls(exceptButton = null) {
  getMindMapColorControls().forEach(control => {
    if (control.button !== exceptButton) setMindMapColorControlOpen(control, false);
  });
}

function positionMindMapMenu(menu, x, y) {
  if (!menu) return;
  menu.hidden = false;
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  const mw = menu.offsetWidth;
  const mh = menu.offsetHeight;
  if (x + mw > window.innerWidth) menu.style.left = `${window.innerWidth - mw - 6}px`;
  if (y + mh > window.innerHeight) menu.style.top = `${window.innerHeight - mh - 6}px`;
}

function fitMindMapMenuToViewport(menu) {
  if (!menu || menu.hidden) return;
  const x = Number.parseFloat(menu.style.left) || 0;
  const y = Number.parseFloat(menu.style.top) || 0;
  positionMindMapMenu(menu, x, y);
}

function positionMindMapCtxMenu(x, y) {
  positionMindMapMenu(els.mindMapContextMenu, x, y);
}

function positionMindMapLinkCtxMenu(x, y) {
  positionMindMapMenu(els.mindMapLinkContextMenu, x, y);
}

function showMindMapListCtxMenu(x, y, mapId) {
  if (isMindMapPresentationMode()) return;
  if (!state.mindMapList.some(entry => entry.id === mapId)) return;

  hideCtxMenu();
  hideMediaCtxMenu();
  hideMindMapCtxMenu();
  if (els.accountMenu) els.accountMenu.hidden = true;

  state.mindMapListContextMapId = mapId;
  positionMindMapMenu(els.mindMapListContextMenu, x, y);
}

function showMindMapCtxMenu(x, y, nodeId) {
  const node = getMindMapNode(nodeId);
  if (!node) return;

  hideCtxMenu();
  hideMediaCtxMenu();
  closeMindMapListPanel();
  if (els.accountMenu) els.accountMenu.hidden = true;
  if (els.mindMapListContextMenu) els.mindMapListContextMenu.hidden = true;
  if (els.mindMapLinkContextMenu) els.mindMapLinkContextMenu.hidden = true;
  state.mindMapContextLinkNodeId = null;
  state.mindMapListContextMapId = null;

  state.mindMapContextNodeId = nodeId;
  state.mindMapSelectedId = nodeId;
  renderMindMap();

  const menu = els.mindMapContextMenu;
  const alignTarget = getMindMapAlignTarget(node);
  const hiddenCount = countMindMapDescendants(node.id);
  const toggleBtn = menu.querySelector('[data-mindmap-action="toggle-children"]');
  const collapseSubtreeBtn = menu.querySelector('[data-mindmap-action="collapse-subtree"]');
  const alignBtn = menu.querySelector('[data-mindmap-action="align"]');
  const undoBtn = menu.querySelector('[data-mindmap-action="undo"]');
  const deleteBtn = menu.querySelector('[data-mindmap-action="delete"]');
  if (toggleBtn) {
    toggleBtn.disabled = hiddenCount === 0;
    toggleBtn.textContent = node.collapsed ? "▸　子を表示" : "▾　子を隠す";
  }
  if (collapseSubtreeBtn) {
    collapseSubtreeBtn.disabled = hiddenCount === 0 ||
      getMindMapSubtreeBranches(node.id).every(branch => branch.collapsed);
  }
  if (alignBtn) alignBtn.disabled = !canAlignMindMapChildren(alignTarget.parent);
  if (undoBtn) undoBtn.disabled = state.mindMapUndoStack.length === 0;
  const isOnlyRoot = node.parent_id === null && getMindMapNodes().filter(n => n.parent_id === null).length <= 1;
  if (deleteBtn) deleteBtn.disabled = isOnlyRoot;
  updateMindMapContextColorPaletteState(node);
  closeMindMapContextColorPalettes();

  positionMindMapCtxMenu(x, y);
}

function showMindMapLinkCtxMenu(x, y, childId) {
  if (isMindMapPresentationMode()) return;
  const child = getMindMapNode(childId);
  const parent = child?.parent_id ? getMindMapNode(child.parent_id) : null;
  if (!child || !parent) return;

  hideCtxMenu();
  hideMediaCtxMenu();
  closeMindMapListPanel();
  if (els.accountMenu) els.accountMenu.hidden = true;
  if (els.mindMapListContextMenu) els.mindMapListContextMenu.hidden = true;
  els.mindMapContextMenu.hidden = true;
  state.mindMapContextNodeId = null;
  state.mindMapListContextMapId = null;

  state.mindMapContextLinkNodeId = childId;
  state.mindMapSelectedId = childId;
  renderMindMap();
  updateMindMapLinkContextPaletteState(getMindMapNode(childId));
  closeMindMapContextColorPalettes();
  positionMindMapLinkCtxMenu(x, y);
}

function showMindMapExtraLinkCtxMenu(x, y, fromId, toId) {
  if (isMindMapPresentationMode()) return;
  hideMindMapCtxMenu();
  hideCtxMenu();
  hideMediaCtxMenu();
  closeMindMapListPanel();
  if (els.accountMenu) els.accountMenu.hidden = true;
  state.mindMapContextExtraLink = { from_id: fromId, to_id: toId };
  positionMindMapMenu(els.mindMapExtraLinkContextMenu, x, y);
}

function hideMindMapCtxMenu() {
  els.mindMapContextMenu.hidden = true;
  if (els.mindMapCanvasContextMenu) els.mindMapCanvasContextMenu.hidden = true;
  if (els.mindMapExtraLinkContextMenu) els.mindMapExtraLinkContextMenu.hidden = true;
  if (els.mindMapListContextMenu) els.mindMapListContextMenu.hidden = true;
  if (els.mindMapLinkContextMenu) els.mindMapLinkContextMenu.hidden = true;
  closeMindMapContextColorPalettes();
  state.mindMapContextNodeId = null;
  state.mindMapContextLinkNodeId = null;
  state.mindMapContextExtraLink = null;
  state.mindMapListContextMapId = null;
}

let _tooltipHideTimer = null;

function updateMindMapMemoPreviewToggle() {
  const button = els.mindMapMemoPreviewToggle;
  if (!button) return;
  const enabled = state.mindMapMemoPreviewEnabled;
  button.setAttribute("aria-checked", String(enabled));
  button.title = enabled ? "メモプレビューをオフにする" : "メモプレビューをオンにする";
  const label = button.querySelector(".mindmap-setting-state");
  if (label) label.textContent = enabled ? "オン" : "オフ";
}

function setMindMapMemoPreviewEnabled(enabled) {
  state.mindMapMemoPreviewEnabled = Boolean(enabled);
  updateMindMapMemoPreviewToggle();
  if (!state.mindMapMemoPreviewEnabled) hideMindMapMemoTooltip(true);
}

function updateMindMapPresentationToggle() {
  const button = els.mindMapPresentationToggle;
  if (!button) return;
  // 実際にホストが発表モードをオンにしたかどうかだけを表示する
  // （閲覧専用ゲストの制限と混同しないように、生のフラグを見る）。
  const enabled = Boolean(state.mindMapPresentationMode);
  button.setAttribute("aria-checked", String(enabled));
  button.title = enabled ? "発表モードをオフにする" : "発表モードをオンにする";
  const label = button.querySelector(".mindmap-setting-state");
  if (label) label.textContent = enabled ? "オン" : "オフ";
}

function setMindMapPresentationMode(enabled) {
  state.mindMapPresentationMode = Boolean(enabled);
  els.mindMapOverlay.classList.toggle("is-presentation-mode", state.mindMapPresentationMode);
  updateMindMapPresentationToggle();
  hideMindMapCtxMenu();
  closeMindMapTemplatesPanel();
  hideMindMapMemoTooltip(true);
  state.mindMapNodeDrag = null;
  state.mindMapLinkDrag = null;
  hideMindMapRubberBand();
  clearMindMapLinkTargetHighlight();
  if (state.mindMapPresentationMode) closeMindMapNodeSettingsPanel();
  renderMindMapList();
  renderMindMap();
}

function setMindMapLargeView(open) {
  const shouldOpen = Boolean(open) && !els.mindMapOverlay.hidden;
  els.mindMapOverlay.classList.toggle("is-large-view", shouldOpen);
  els.mindMapLargeBtn?.setAttribute("aria-pressed", String(shouldOpen));
  if (els.mindMapLargeBtn) {
    els.mindMapLargeBtn.setAttribute(
      "aria-label",
      shouldOpen ? "大画面表示を終了" : "大画面でマインドマップを表示"
    );
    els.mindMapLargeBtn.title = shouldOpen
      ? "大画面表示を終了（Esc）"
      : "大画面でマインドマップを表示";
    setButtonContent(els.mindMapLargeBtn, shouldOpen ? "×" : "⛶", shouldOpen ? "元に戻す" : "大画面");
  }
  closeMindMapSettingsPanel();
  closeMindMapNodeSettingsPanel();
  closeMindMapListPanel();
  hideMindMapCtxMenu();
  requestAnimationFrame(() => {
    if (!els.mindMapOverlay.hidden) centerMindMap();
  });
}

function toggleMindMapLargeView() {
  setMindMapLargeView(!els.mindMapOverlay.classList.contains("is-large-view"));
}

let _tooltipNodeId = null;

function showMindMapMemoTooltip(nodeBtn, memo) {
  if (!state.mindMapMemoPreviewEnabled || !els.mindMapMemoTooltip || !memo) return;
  clearTimeout(_tooltipHideTimer);
  _tooltipNodeId = nodeBtn.dataset.id ?? null;
  els.mindMapMemoTooltip.dataset.nodeId = _tooltipNodeId || "";
  els.mindMapMemoTooltip.textContent = memo;
  els.mindMapMemoTooltip.title = "クリックするとノード設定の大画面メモを開きます";
  els.mindMapMemoTooltip.setAttribute("role", "button");
  els.mindMapMemoTooltip.setAttribute("tabindex", "0");
  els.mindMapMemoTooltip.setAttribute("aria-label", "ノード設定の大画面メモを開く");
  els.mindMapMemoTooltip.hidden = false;
  positionMindMapMemoTooltip(nodeBtn);
}

function hideMindMapMemoTooltip(immediate = false) {
  if (!els.mindMapMemoTooltip) return;
  clearTimeout(_tooltipHideTimer);
  if (immediate) {
    els.mindMapMemoTooltip.hidden = true;
    els.mindMapMemoTooltip.removeAttribute("data-node-id");
    _tooltipNodeId = null;
    return;
  }
  _tooltipHideTimer = setTimeout(() => {
    if (els.mindMapMemoTooltip) {
      els.mindMapMemoTooltip.hidden = true;
      els.mindMapMemoTooltip.removeAttribute("data-node-id");
    }
    _tooltipNodeId = null;
  }, 80);
}

function positionMindMapMemoTooltip(nodeBtn) {
  const tt = els.mindMapMemoTooltip;
  if (!tt || tt.hidden) return;
  const r = nodeBtn.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  tt.style.left = "";
  tt.style.right = "";
  tt.style.top = "";
  tt.style.bottom = "";
  const ttW = tt.offsetWidth || 260;
  const ttH = tt.offsetHeight || 80;
  const gap = 10;
  let left = r.left + r.width / 2 - ttW / 2;
  if (left + ttW > vw - gap) left = vw - gap - ttW;
  if (left < gap) left = gap;
  let top = r.top - ttH - gap;
  if (top < gap) top = r.bottom + gap;
  tt.style.left = left + "px";
  tt.style.top = top + "px";
}

function openMindMapNodeMemoFullscreen(nodeId) {
  if (isMindMapPresentationMode()) return;
  const node = getMindMapNode(nodeId);
  if (!node) return;

  hideMindMapMemoTooltip(true);
  state.mindMapSelectedId = node.id;
  renderMindMap();
  openMindMapNodeSettingsPanel();
  setMindMapMemoFullscreen(true);
}

els.mindMapBtn.addEventListener("click", openMindMapPanel);
els.mindMapClose.addEventListener("click", closeMindMapPanel);
els.mindMapTitleInput.addEventListener("focus", () => setCollabPresence("mindmap-title", { immediate: true }));
els.mindMapTitleInput.addEventListener("input", () => {
  if (!state.mindMap || isMindMapPresentationMode()) return;
  setCollabPresence("mindmap-title");
  beginMindMapEditUndo();
  state.mindMap.title = (els.mindMapTitleInput.value || "新しいマインドマップ").slice(0, 80);
  mirrorMindMapTitleToSourceNode(state.mindMap.title);
  scheduleMindMapSave();
});
els.mindMapTitleInput.addEventListener("blur", () => {
  if (!state.mindMap || isMindMapPresentationMode()) return;
  state.mindMap.title = (els.mindMapTitleInput.value.trim() || "新しいマインドマップ").slice(0, 80);
  mirrorMindMapTitleToSourceNode(state.mindMap.title);
  els.mindMapTitleInput.value = state.mindMap.title;
  endMindMapEditUndo();
  scheduleMindMapSave();
  setCollabPresence("mindmap");
});
els.mindMapNodeTitleInput.addEventListener("focus", () => setCollabPresence("mindmap-node-title", { immediate: true }));
els.mindMapNodeTitleInput.addEventListener("compositionstart", () => {
  _isMindMapNodeTitleComposing = true;
});
els.mindMapNodeTitleInput.addEventListener("compositionend", e => {
  _isMindMapNodeTitleComposing = false;
  if (isMindMapPresentationMode()) return;
  setCollabPresence("mindmap-node-title");
  beginMindMapEditUndo();
  updateSelectedMindMapTitle(e.currentTarget.value);
});
els.mindMapNodeTitleInput.addEventListener("input", e => {
  if (isMindMapPresentationMode()) return;
  if (isImeComposing(e, _isMindMapNodeTitleComposing)) return;
  setCollabPresence("mindmap-node-title");
  beginMindMapEditUndo();
  updateSelectedMindMapTitle(e.currentTarget.value);
});
els.mindMapNodeTitleInput.addEventListener("blur", () => {
  if (isMindMapPresentationMode()) return;
  const selected = getMindMapNode(state.mindMapSelectedId);
  if (!selected) {
    endMindMapEditUndo();
    setCollabPresence("mindmap");
    return;
  }
  selected.title = (els.mindMapNodeTitleInput.value.trim() || "トピック").slice(0, 80);
  mirrorSourceNodeTitleToMindMap(selected);
  els.mindMapNodeTitleInput.value = selected.title;
  endMindMapEditUndo();
  renderMindMap();
  scheduleMindMapSave();
  setCollabPresence("mindmap");
});
els.mindMapNodeTitleInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !isImeComposing(e, _isMindMapNodeTitleComposing)) {
    e.preventDefault();
    els.mindMapNodeTitleInput.blur();
  }
});
els.mindMapNodeMemoInput?.addEventListener("focus", () => setCollabPresence("mindmap-node-memo", { immediate: true }));
els.mindMapNodeMemoInput?.addEventListener("input", () => {
  if (isMindMapPresentationMode()) return;
  const selected = getMindMapNode(state.mindMapSelectedId);
  if (!selected) return;
  setCollabPresence("mindmap-node-memo");
  beginMindMapEditUndo();
  selected.memo = els.mindMapNodeMemoInput.value;
  const nodeEl = els.mindMapNodes.querySelector(`.mindmap-node[data-id="${selected.id}"]`);
  if (nodeEl) setMindMapNodeButtonContent(nodeEl, selected);
  scheduleMindMapSave();
});
els.mindMapNodeMemoInput?.addEventListener("blur", () => {
  endMindMapEditUndo();
  setCollabPresence("mindmap");
});
els.mindMapNodes?.addEventListener("mouseover", e => {
  const nodeBtn = e.target.closest(".mindmap-node");
  if (!nodeBtn) return;
  const node = getMindMapNode(nodeBtn.dataset.id);
  if (state.mindMapMemoPreviewEnabled && node?.memo) {
    showMindMapMemoTooltip(nodeBtn, node.memo);
  } else {
    hideMindMapMemoTooltip();
  }
});
els.mindMapNodes?.addEventListener("mouseout", e => {
  const nodeBtn = e.target.closest(".mindmap-node");
  if (nodeBtn && !nodeBtn.contains(e.relatedTarget)) {
    hideMindMapMemoTooltip();
  }
});
els.mindMapMemoTooltip?.addEventListener("pointerdown", e => {
  e.stopPropagation();
});
els.mindMapMemoTooltip?.addEventListener("click", e => {
  e.preventDefault();
  e.stopPropagation();
  openMindMapNodeMemoFullscreen(els.mindMapMemoTooltip.dataset.nodeId || _tooltipNodeId);
});
els.mindMapMemoTooltip?.addEventListener("keydown", e => {
  if (e.key !== "Enter" && e.key !== " ") return;
  e.preventDefault();
  e.stopPropagation();
  openMindMapNodeMemoFullscreen(els.mindMapMemoTooltip.dataset.nodeId || _tooltipNodeId);
});
els.mindMapMemoTooltip?.addEventListener("mouseenter", () => clearTimeout(_tooltipHideTimer));
els.mindMapMemoTooltip?.addEventListener("mouseleave", () => hideMindMapMemoTooltip());
renderMindMapColorPalettes();
renderMindMapContextColorPalettes();
getMindMapColorControls().forEach(bindMindMapColorControl);
els.mindMapAddChildBtn?.addEventListener("click", () => addMindMapNode(state.mindMapSelectedId));
els.mindMapAlignChildrenBtn?.addEventListener("click", alignMindMapChildNodes);
els.mindMapDeleteNodeBtn?.addEventListener("click", deleteSelectedMindMapNode);
els.mindMapNodeSettingsBtn?.addEventListener("click", e => {
  e.stopPropagation();
  toggleMindMapNodeSettingsPanel();
});
els.mindMapNodeSettingsClose?.addEventListener("click", handleMindMapNodeSettingsClose);
els.mindMapMemoLargeBtn?.addEventListener("click", e => {
  e.stopPropagation();
  toggleMindMapMemoFullscreen();
});
els.mindMapSettingsBtn?.addEventListener("click", e => {
  e.stopPropagation();
  toggleMindMapSettingsPanel();
});
els.mindMapSettingsClose?.addEventListener("click", closeMindMapSettingsPanel);
els.mindMapMemoPreviewToggle?.addEventListener("click", () => {
  setMindMapMemoPreviewEnabled(!state.mindMapMemoPreviewEnabled);
});
els.mindMapPresentationToggle?.addEventListener("click", () => {
  setMindMapPresentationMode(!state.mindMapPresentationMode);
});
updateMindMapMemoPreviewToggle();
updateMindMapPresentationToggle();
els.mindMapUndoBtn.addEventListener("click", undoMindMapLastChange);
els.mindMapToNoteBtn?.addEventListener("click", () => {
  closeMindMapSettingsPanel();
  convertCurrentMindMapToNotes();
});
els.mindMapContextMenu.addEventListener("click", async e => {
  const colorToggle = e.target.closest("[data-mindmap-context-color-toggle]");
  if (colorToggle) {
    if (isMindMapPresentationMode()) return;
    e.stopPropagation();
    toggleMindMapContextColorPalette(colorToggle.dataset.mindmapContextColorToggle);
    return;
  }

  const btn = e.target.closest("[data-mindmap-action]");
  if (!btn || btn.disabled) return;

  const action = btn.dataset.mindmapAction;
  const presentationAction = ["toggle-children", "collapse-subtree", "center"].includes(action);
  if (isMindMapPresentationMode() && !presentationAction) return;
  const nodeId = state.mindMapContextNodeId;
  hideMindMapCtxMenu();
  if (!getMindMapNode(nodeId)) return;

  state.mindMapSelectedId = nodeId;
  switch (action) {
    case "rename":
      startMindMapNodeEdit(nodeId);
      break;
    case "add-child":
      addMindMapNode(nodeId);
      break;
    case "convert-note":
      await convertCurrentMindMapToNotes(nodeId);
      break;
    case "toggle-children":
      toggleMindMapChildren(nodeId);
      break;
    case "collapse-subtree":
      collapseMindMapSubtree(nodeId);
      break;
    case "align":
      alignMindMapChildNodes();
      break;
    case "undo":
      await undoMindMapLastChange();
      break;
    case "center":
      centerMindMap();
      break;
    case "delete":
      renderMindMap();
      await deleteSelectedMindMapNode();
      break;
  }
});
els.mindMapLinkContextMenu?.addEventListener("click", e => {
  if (isMindMapPresentationMode()) return;
  const colorToggle = e.target.closest("[data-mindmap-link-context-color-toggle]");
  if (!colorToggle) return;
  e.stopPropagation();
  toggleMindMapLinkContextColorPalette();
});
els.mindMapNewBtn.addEventListener("click", () => {
  closeMindMapSettingsPanel();
  createNewMindMap();
});
els.mindMapDeleteBtn?.addEventListener("click", async () => {
  closeMindMapSettingsPanel();
  if (state.mindMap?.id) await deleteMindMap(state.mindMap.id);
});
els.downloadMapPngBtn?.addEventListener("click", () => { closeMindMapSettingsPanel(); downloadMindMapAsPng(); });
els.downloadMapSvgBtn?.addEventListener("click", () => { closeMindMapSettingsPanel(); downloadMindMapAsSvg(); });
els.downloadMapPdfBtn?.addEventListener("click", () => { closeMindMapSettingsPanel(); downloadMindMapAsPdf(); });
els.mindMapLargeBtn?.addEventListener("click", toggleMindMapLargeView);
els.mindMapSideNewBtn?.addEventListener("click", createNewMindMap);
els.mindMapListBtn.addEventListener("click", () => {
  if (els.mindMapGridOverlay?.hidden) openMindMapListPanel();
  else closeMindMapListPanel();
});
els.mindMapGridClose?.addEventListener("click", closeMindMapListPanel);
els.mindMapGridOverlay?.addEventListener("click", e => {
  if (e.target === els.mindMapGridOverlay) closeMindMapListPanel();
});
els.mindMapGridItems?.addEventListener("click", e => {
  const item = e.target.closest(".note-grid-card");
  if (!item || item.classList.contains("is-editing")) return;
  const id = item.dataset.id;
  const action = e.target.closest("[data-action]")?.dataset.action;
  if (isMindMapPresentationMode() && action && action !== "switch") return;
  if (action === "delete") {
    e.stopPropagation();
    deleteMindMap(id);
  } else {
    switchMindMap(id);
  }
});
els.mindMapListContextMenu?.addEventListener("click", async e => {
  if (isMindMapPresentationMode()) return;
  const btn = e.target.closest("[data-mindmap-list-action]");
  if (!btn || btn.disabled) return;
  const action = btn.dataset.mindmapListAction;
  const id = state.mindMapListContextMapId;
  hideMindMapCtxMenu();
  if (action === "convert-note") await convertMindMapListEntryToNotes(id);
});
els.mindMapCenterBtn?.addEventListener("click", centerMindMap);
els.mindMapZoomOutBtn.addEventListener("click", () => setMindMapZoom(state.mindMapZoom - 0.12));
els.mindMapZoomInBtn.addEventListener("click", () => setMindMapZoom(state.mindMapZoom + 0.12));
els.mindMapCanvas.addEventListener("wheel", e => {
  e.preventDefault();
  const rect = els.mindMapCanvas.getBoundingClientRect();
  setMindMapZoom(
    state.mindMapZoom + (e.deltaY < 0 ? 0.08 : -0.08),
    { x: e.clientX - rect.left, y: e.clientY - rect.top },
  );
}, { passive: false });
els.mindMapCanvas.addEventListener("pointerdown", e => {
  if (e.button !== 0 || e.target.closest(".mindmap-node, .mindmap-node-edit, .mindmap-link-hit")) return;
  els.mindMapCanvas.setPointerCapture(e.pointerId);
  state.mindMapPanning = {
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    panX: state.mindMapPanX,
    panY: state.mindMapPanY,
  };
  els.mindMapCanvas.classList.add("is-panning");
});
els.mindMapCanvas.addEventListener("contextmenu", e => {
  if (isMindMapPresentationMode()) {
    e.preventDefault();
    hideMindMapCtxMenu();
    return;
  }
  if (e.target.closest(".mindmap-node, .mindmap-link-hit, .mindmap-extra-link-hit")) return;
  const extraHit = document.elementsFromPoint(e.clientX, e.clientY)
    .find(el => el.classList.contains("mindmap-extra-link-hit"));
  if (extraHit) {
    e.preventDefault();
    showMindMapExtraLinkCtxMenu(e.clientX, e.clientY, extraHit.dataset.from, extraHit.dataset.to);
    return;
  }
  e.preventDefault();
  hideMindMapCtxMenu();
  if (els.mindMapCanvasContextMenu) {
    state.mindMapCanvasContextPos = { x: e.clientX, y: e.clientY };
    positionMindMapMenu(els.mindMapCanvasContextMenu, e.clientX, e.clientY);
  }
});
els.mindMapCanvasContextMenu?.addEventListener("click", e => {
  if (isMindMapPresentationMode()) return;
  const btn = e.target.closest("[data-canvas-action]");
  if (!btn) return;
  els.mindMapCanvasContextMenu.hidden = true;
  const ctxPos = state.mindMapCanvasContextPos;
  state.mindMapCanvasContextPos = null;
  if (btn.dataset.canvasAction === "add-root-child") {
    createNewRootNode(ctxPos?.x ?? window.innerWidth / 2, ctxPos?.y ?? window.innerHeight / 2);
  }
});
els.mindMapExtraLinkContextMenu?.addEventListener("click", e => {
  if (isMindMapPresentationMode()) return;
  const btn = e.target.closest("[data-extra-link-action]");
  if (!btn) return;
  const link = state.mindMapContextExtraLink;
  els.mindMapExtraLinkContextMenu.hidden = true;
  state.mindMapContextExtraLink = null;
  if (btn.dataset.extraLinkAction === "delete" && link) {
    removeMindMapExtraLink(link.from_id, link.to_id);
  }
});
els.mindMapCanvas.addEventListener("pointermove", e => {
  const pan = state.mindMapPanning;
  if (!pan || pan.pointerId !== e.pointerId) return;
  hideMindMapMemoTooltip();
  state.mindMapPanX = pan.panX + e.clientX - pan.startX;
  state.mindMapPanY = pan.panY + e.clientY - pan.startY;
  applyMindMapTransform();
});
function finishMindMapPan(e) {
  if (!state.mindMapPanning || state.mindMapPanning.pointerId !== e.pointerId) return;
  state.mindMapPanning = null;
  els.mindMapCanvas.classList.remove("is-panning");
}
els.mindMapCanvas.addEventListener("pointerup", finishMindMapPan);
els.mindMapCanvas.addEventListener("pointercancel", finishMindMapPan);
window.addEventListener("resize", () => {
  if (!els.mindMapOverlay.hidden && !state.mindMapCentered) centerMindMap();
  if (els.editorArea.classList.contains("is-large-editor")) syncNoteHeadHeight();
  positionMemoSettingsPanel();
  positionMindMapSettingsPanel();
  positionMindMapNodeSettingsPanel();
  positionMemoFormatPanel();
});

function resetMindMapState() {
  clearTimeout(state.mindMapSaveTimer);
  closeMindMapSettingsPanel();
  closeMindMapNodeSettingsPanel();
  state.mindMap = null;
  state.mindMapList = [];
  state.mindMapLoaded = false;
  state.mindMapSelectedId = null;
  state.mindMapContextNodeId = null;
  state.mindMapContextLinkNodeId = null;
  state.mindMapUndoStack = [];
  state.mindMapEditSnapshot = null;
  state.isApplyingMindMapUndo = false;
  state.mindMapSaveTimer = null;
  state.mindMapZoom = 1;
  state.mindMapPanX = 0;
  state.mindMapPanY = 0;
  state.mindMapCentered = false;
  state.mindMapPanning = null;
  state.mindMapNodeDrag = null;
  state.mindMapLinkDrag = null;
  state.mindMapPresentationMode = false;
  els.mindMapOverlay.classList.remove("is-presentation-mode");
  els.mindMapOverlay.classList.remove("is-large-view");
  if (els.mindMapLargeBtn) {
    els.mindMapLargeBtn.setAttribute("aria-pressed", "false");
    els.mindMapLargeBtn.setAttribute("aria-label", "大画面でマインドマップを表示");
    els.mindMapLargeBtn.title = "大画面でマインドマップを表示";
    setButtonContent(els.mindMapLargeBtn, "⛶", "大画面");
  }
  els.mindMapOverlay.hidden = true;
  if (els.mindMapGridOverlay && !els.mindMapGridOverlay.hidden) {
    els.mindMapGridOverlay.hidden = true;
    document.body.classList.remove("has-management-open");
  }
  els.mindMapContextMenu.hidden = true;
  if (els.mindMapLinkContextMenu) els.mindMapLinkContextMenu.hidden = true;
  els.mindMapLinks.innerHTML = "";
  els.mindMapNodes.innerHTML = "";
  updateMindMapPresentationToggle();
  updateMindMapUndoButton();
}

// ── Media ─────────────────────────────────────────────────────────────────────

const INLINE_IMAGE_MAX_EDGE = 1280;
const INLINE_IMAGE_TARGET_BYTES = 450 * 1024;

function mediaFileName(file, fallback = "image.png") {
  return file?.name || fallback;
}

function mediaFileExtension(file, fallback = "bin") {
  return (mediaFileName(file).match(/\.([^.\/]+)$/)?.[1] || fallback).toLowerCase();
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("画像の読み込みに失敗しました。"));
    reader.readAsDataURL(blob);
  });
}

function loadImageForInline(file) {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像の読み込みに失敗しました。"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("画像の変換に失敗しました。")), type, quality);
  });
}

async function createInlineImageDataUrl(file) {
  if (file.type === "image/gif") return blobToDataUrl(file);

  const image = await loadImageForInline(file);
  const sourceW = image.naturalWidth || image.width;
  const sourceH = image.naturalHeight || image.height;
  if (!sourceW || !sourceH) return blobToDataUrl(file);

  let scale = Math.min(1, INLINE_IMAGE_MAX_EDGE / Math.max(sourceW, sourceH));
  let quality = 0.84;
  let blob = null;

  for (let i = 0; i < 5; i += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sourceW * scale));
    canvas.height = Math.max(1, Math.round(sourceH * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
    if (blob.size <= INLINE_IMAGE_TARGET_BYTES || scale <= 0.45) break;
    if (quality > 0.68) quality = Math.max(0.68, quality - 0.08);
    else scale *= 0.82;
  }

  return blobToDataUrl(blob || file);
}

async function uploadFileToStorage(file) {
  const ext = mediaFileExtension(file);
  const mediaId = makeId();
  const storagePath = `${mediaStoragePrefix()}/${mediaId}.${ext}`;
  const fileRef = storage.ref(storagePath);
  await fileRef.put(file, { contentType: file.type });
  return {
    id:            mediaId,
    filename:      storagePath,
    original_name: mediaFileName(file),
    mime_type:     file.type,
    created_at:    nowIso(),
    storagePath,
    downloadURL:   await fileRef.getDownloadURL(),
  };
}

async function addUploadedMediaItem(noteId, note, item) {
  const updates = { media: [...(note.media ?? []), item], updated_at: nowIso() };
  await notesCollection().doc(noteId).set(updates, { merge: true });
  Object.assign(note, updates);
}

function replaceMediaElementSource(figure, item) {
  if (!figure?.isConnected) return false;
  const media = figure.querySelector(".inline-media");
  if (!media) return false;
  media.addEventListener(media.tagName === "VIDEO" ? "loadedmetadata" : "load", () => scheduleMediaCaretSync(), { once: true });
  media.src = item.downloadURL;
  if (media.tagName === "IMG") {
    media.alt = item.original_name;
    figure.dataset.originalSrc = item.downloadURL;
    figure.dataset.originalAlt = item.original_name || "";
  }
  return true;
}

async function uploadMedia(noteId, files) {
  const note = state.data.notes.find(n => n.id === noteId);
  if (!note) return;

  for (const file of [...files]) {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      showToast(`${mediaFileName(file, "ファイル")}: 画像・動画ファイルのみ添付できます。`);
      continue;
    }
    try {
      if (file.type.startsWith("image/")) {
        const inlineItem = {
          id:            makeId(),
          filename:      mediaFileName(file),
          original_name: mediaFileName(file),
          mime_type:     file.type || "image/jpeg",
          created_at:    nowIso(),
          storagePath:   null,
          downloadURL:   await createInlineImageDataUrl(file),
        };
        const figure = insertMediaElement(inlineItem);
        showToast("画像を追加しました。");

        if (!STORAGE_ENABLED) continue;
        try {
          const uploadedItem = await uploadFileToStorage(file);
          await addUploadedMediaItem(noteId, note, uploadedItem);
          if (replaceMediaElementSource(figure, uploadedItem)) scheduleSave();
        } catch (uploadErr) {
          showToast("Storage保存に失敗したため、画像を本文に埋め込みました。");
        }
        continue;
      }

      if (!STORAGE_ENABLED) {
        showToast("動画の添付に必要なStorage設定が見つかりません。");
        continue;
      }
      const item = await uploadFileToStorage(file);
      await addUploadedMediaItem(noteId, note, item);
      insertMediaElement(item);
      showToast("動画を追加しました。");
    } catch (e) { showToast(`${mediaFileName(file, "ファイル")}: ${e.message}`); }
  }
}

function createMediaCaretAnchor() {
  const anchor = document.createElement("span");
  anchor.className = "media-caret-anchor";
  anchor.appendChild(document.createTextNode("\u200b"));
  return anchor;
}

function createMediaTextLine() {
  return createMediaCaretAnchor();
}

// 画像の実際の高さが変わるたび（読み込み完了・サイズ変更・トリミング・ウィンドウ幅変更など）に
// 隣接するキャレットの高さを追従させる。rAF や load イベント頼みの一回限りの同期だけでは
// 画像サイズ確定前に高さ 0 で同期されてしまい、キャレットが画像とずれたままになることがあるため。
const mediaFigureResizeObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    const figure = entry.target;
    if (!isMediaFigureReady(figure)) continue;
    const height = figure.getBoundingClientRect().height;
    if (height <= 0) continue;
    const px = `${Math.round(height)}px`;
    for (const dir of ["previousSibling", "nextSibling"]) {
      const sibling = getMediaBoundarySibling(figure, dir);
      if (isMediaCaretAnchor(sibling)) sibling.style.setProperty("--media-caret-height", px);
    }
  }
});

function lockInlineMediaDrag(root = els.contentInput) {
  root.querySelectorAll(".inline-media-figure").forEach(figure => {
    figure.contentEditable = "false";
    figure.draggable = false;
    figure.setAttribute("draggable", "false");
    mediaFigureResizeObserver.observe(figure);
  });
  root.querySelectorAll(".inline-media").forEach(media => {
    media.draggable = false;
    media.setAttribute("draggable", "false");
    media.addEventListener("load", () => scheduleMediaCaretSync(root), { once: true });
    media.addEventListener("loadedmetadata", () => scheduleMediaCaretSync(root), { once: true });
    if ((media.tagName === "IMG" && media.complete) ||
        (media.tagName === "VIDEO" && media.readyState > 0)) {
      scheduleMediaCaretSync(root);
    }
  });
}

function isEmptyMediaTextLine(node) {
  return node?.classList?.contains("media-text-line") &&
    !node.textContent.replace(/\u200b/g, "").trim() &&
    !node.querySelector("img, video");
}

function isMediaCaretAnchor(node) {
  return node?.classList?.contains("media-caret-anchor");
}

function isInlineMediaFigure(node) {
  return node?.nodeType === Node.ELEMENT_NODE &&
    node.classList.contains("inline-media-figure");
}

function isIgnorableMediaBoundaryNode(node) {
  return node?.nodeType === Node.TEXT_NODE &&
    !node.nodeValue.replace(/\u200b/g, "").trim();
}

function getMediaBoundarySibling(node, direction) {
  let cur = node[direction];
  while (cur && isIgnorableMediaBoundaryNode(cur)) cur = cur[direction];
  return cur;
}

function isEmptyMediaCaretAnchor(node) {
  return isMediaCaretAnchor(node) &&
    !node.textContent.replace(/\u200b/g, "").trim() &&
    !node.querySelector("img, video");
}

function getAdjacentMediaFigure(anchor) {
  const prev = getMediaBoundarySibling(anchor, "previousSibling");
  if (isInlineMediaFigure(prev)) {
    return prev;
  }
  const next = getMediaBoundarySibling(anchor, "nextSibling");
  if (isInlineMediaFigure(next)) {
    return next;
  }
  return null;
}

// 画像/動画が読み込み済みで実寸が確定しているかどうか。読み込み前は figure の高さが
// 0 や 1px などの仮の値になることがあり、ここで弾かないとその仮の値が
// --media-caret-height に焼き付いて二度と正しい高さに直らなくなる。
function isMediaFigureReady(figure) {
  const media = figure.querySelector("img, video");
  if (!media) return false;
  return media.tagName === "IMG"
    ? media.complete && media.naturalWidth > 0
    : media.readyState > 0 && media.videoWidth > 0;
}

function syncMediaCaretAnchor(anchor) {
  const figure = getAdjacentMediaFigure(anchor);
  if (!figure) return false;
  if (isMediaFigureReady(figure)) {
    const height = figure.getBoundingClientRect().height;
    if (height > 0) {
      anchor.style.setProperty("--media-caret-height", `${Math.round(height)}px`);
    }
  }
  anchor.classList.add("is-empty-media-caret");
  return true;
}

function clearActiveMediaCaret(root = els.contentInput) {
  root.querySelectorAll(".media-caret-anchor.is-active-media-caret")
    .forEach(anchor => anchor.classList.remove("is-active-media-caret"));
}

function setActiveMediaCaret(anchor) {
  clearActiveMediaCaret();
  if (anchor && isEmptyMediaCaretAnchor(anchor) && syncMediaCaretAnchor(anchor)) {
    anchor.classList.add("is-active-media-caret");
  }
}

function updateActiveMediaCaretFromSelection() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    clearActiveMediaCaret();
    return;
  }
  const range = selection.getRangeAt(0);
  const container = range.startContainer;
  const anchor = container.nodeType === Node.ELEMENT_NODE
    ? container.closest?.(".media-caret-anchor")
    : container.parentElement?.closest?.(".media-caret-anchor");
  if (anchor && els.contentInput.contains(anchor)) {
    setActiveMediaCaret(anchor);
  } else {
    clearActiveMediaCaret();
  }
}

function syncMediaCaretAnchors(root = els.contentInput) {
  root.querySelectorAll(".media-caret-anchor").forEach(anchor => {
    if (isEmptyMediaCaretAnchor(anchor)) syncMediaCaretAnchor(anchor);
  });
}

function scheduleMediaCaretSync(root = els.contentInput) {
  requestAnimationFrame(() => {
    syncMediaCaretAnchors(root);
    updateActiveMediaCaretFromSelection();
    requestAnimationFrame(() => {
      syncMediaCaretAnchors(root);
      updateActiveMediaCaretFromSelection();
    });
  });
}

function normalizeMediaCaretAnchors(root = els.contentInput) {
  root.querySelectorAll(".media-text-line").forEach(line => {
    if (isEmptyMediaTextLine(line)) {
      line.replaceWith(createMediaCaretAnchor());
    } else {
      line.classList.remove("media-text-line", "is-empty-media-line");
    }
  });

  root.querySelectorAll(".media-caret-anchor").forEach(anchor => {
    // \u7a7a\u72b6\u614b\u306e contenteditable \u8981\u7d20\u306b Chrome \u304c <br> \u3092\u633f\u5165\u3059\u308b\u3053\u3068\u304c\u3042\u308a\u3001
    // (br, 0) \u306f\u30ad\u30e3\u30ec\u30c3\u30c8\u4f4d\u7f6e\u3068\u3057\u3066\u4e0d\u5b89\u5b9a\u306a\u305f\u3081 \u200b \u306b\u7f6e\u304d\u63db\u3048\u3066\u304a\u304f\u3002
    anchor.querySelectorAll("br").forEach(br => br.remove());
    if (!anchor.firstChild) anchor.appendChild(document.createTextNode("\u200b"));
    if (!isEmptyMediaCaretAnchor(anchor)) {
      anchor.classList.remove("media-caret-anchor", "is-empty-media-caret", "is-active-media-caret");
      anchor.style.removeProperty("--media-caret-height");
      return;
    }
    if (!syncMediaCaretAnchor(anchor)) anchor.remove();
  });
}

function placeCaretInMediaCaretAnchor(anchor) {
  if (!anchor) return;
  els.contentInput.focus();
  anchor.querySelectorAll("br").forEach(br => br.remove());
  if (!anchor.firstChild) anchor.appendChild(document.createTextNode("\u200b"));
  setActiveMediaCaret(anchor);
  try {
    const range = document.createRange();
    range.setStart(anchor.firstChild, 0);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  } catch (_) {
    // Some embedded browser layers can fail range placement; keep the visible caret.
  }
  requestAnimationFrame(() => setActiveMediaCaret(anchor));
}

function placeCaretInMediaTextLine(line) {
  placeCaretInMediaCaretAnchor(line);
}

function getMediaBoundaryChild(parent, offset, direction) {
  let index = direction === "before" ? offset - 1 : offset;
  while (index >= 0 && index < parent.childNodes.length) {
    const node = parent.childNodes[index];
    if (!isIgnorableMediaBoundaryNode(node)) return node;
    index += direction === "before" ? -1 : 1;
  }
  return null;
}

function nodeHasVisibleEditorContent(node) {
  if (!node) return false;
  if (node.nodeType === Node.TEXT_NODE) {
    return !!node.nodeValue.replace(/\u200b/g, "").trim();
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  if (isMediaCaretAnchor(node)) return false;
  if (isInlineMediaFigure(node) || node.matches?.("img, video")) return true;
  return !!node.textContent.replace(/\u200b/g, "").trim() ||
    !!node.querySelector?.("img, video, .inline-media-figure");
}

function isCaretAtStartOfEditorBlock(range) {
  let node = range.startContainer;
  let offset = range.startOffset;

  if (node.nodeType === Node.TEXT_NODE) {
    if (node.nodeValue.slice(0, offset).replace(/\u200b/g, "").trim()) return false;
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    for (let i = 0; i < offset; i++) {
      if (nodeHasVisibleEditorContent(node.childNodes[i])) return false;
    }
  }

  while (node && node !== els.contentInput) {
    let prev = node.previousSibling;
    while (prev) {
      if (nodeHasVisibleEditorContent(prev)) return false;
      prev = prev.previousSibling;
    }
    node = node.parentNode;
  }

  return true;
}

function getTopLevelEditorNode(node) {
  while (node && node.parentNode && node.parentNode !== els.contentInput) {
    node = node.parentNode;
  }
  return node && node.parentNode === els.contentInput ? node : null;
}

function getPreviousMediaFigureForRange(range) {
  const topNode = range.startContainer === els.contentInput
    ? getMediaBoundaryChild(els.contentInput, range.startOffset, "before")
    : getTopLevelEditorNode(range.startContainer);
  if (!topNode) return null;

  let prev = getMediaBoundarySibling(topNode, "previousSibling");
  if (isMediaCaretAnchor(prev)) prev = getMediaBoundarySibling(prev, "previousSibling");
  return isInlineMediaFigure(prev) ? prev : null;
}

function rememberMediaCaretRepair(e) {
  state.pendingMediaCaretFigure = null;
  if (e.key !== "Backspace" && e.key !== "Delete") return;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return;
  const range = selection.getRangeAt(0);
  if (!els.contentInput.contains(range.startContainer) && range.startContainer !== els.contentInput) return;
  if (!isCaretAtStartOfEditorBlock(range)) return;
  state.pendingMediaCaretFigure = getPreviousMediaFigureForRange(range);
}

function ensureAnchorAfterFigure(figure) {
  if (!figure) return null;
  let next = getMediaBoundarySibling(figure, "nextSibling");
  if (!isMediaCaretAnchor(next)) {
    figure.insertAdjacentElement("afterend", createMediaCaretAnchor());
    next = figure.nextElementSibling;
  }
  syncMediaCaretAnchor(next);
  return next;
}

function ensureAnchorBeforeFigure(figure) {
  if (!figure) return null;
  let prev = getMediaBoundarySibling(figure, "previousSibling");
  if (!isMediaCaretAnchor(prev)) {
    figure.insertAdjacentElement("beforebegin", createMediaCaretAnchor());
    prev = figure.previousElementSibling;
  }
  syncMediaCaretAnchor(prev);
  return prev;
}

function placeCaretBesideFigure(figure, side) {
  const anchor = side === "before"
    ? ensureAnchorBeforeFigure(figure)
    : ensureAnchorAfterFigure(figure);
  placeCaretInMediaCaretAnchor(anchor);
}

function getMediaSideFromPoint(figure, clientX) {
  if (!figure) return null;
  const rect = figure.getBoundingClientRect();
  const edge = Math.min(28, Math.max(14, rect.width * 0.08));
  if (clientX <= rect.left + edge) return "before";
  if (clientX >= rect.right - edge) return "after";
  return null;
}

function getMediaFigureNearPoint(clientX, clientY) {
  const maxDistance = 18;
  for (const figure of els.contentInput.querySelectorAll(".inline-media-figure")) {
    const rect = figure.getBoundingClientRect();
    if (clientY < rect.top || clientY > rect.bottom) continue;
    if (Math.abs(clientX - rect.left) <= maxDistance) return { figure, side: "before" };
    if (Math.abs(clientX - rect.right) <= maxDistance) return { figure, side: "after" };
  }
  return null;
}

function restorePendingMediaCaret() {
  const figure = state.pendingMediaCaretFigure;
  state.pendingMediaCaretFigure = null;
  if (!figure?.isConnected) return false;
  const anchor = ensureAnchorAfterFigure(figure);
  placeCaretInMediaCaretAnchor(anchor);
  return true;
}

function repairMediaCaretAfterEdit() {
  ensureMediaTextLines();
  if (restorePendingMediaCaret()) return;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  if (range.startContainer !== els.contentInput) return;

  const before = getMediaBoundaryChild(els.contentInput, range.startOffset, "before");
  if (!isInlineMediaFigure(before)) return;

  const anchor = ensureAnchorAfterFigure(before);
  placeCaretInMediaCaretAnchor(anchor);
}

function assignMissingMediaIds(root = els.contentInput) {
  root.querySelectorAll(".inline-media-figure").forEach(figure => {
    if (!figure.dataset.mediaId) figure.dataset.mediaId = makeId();
  });
}

function ensureMediaTextLines() {
  lockInlineMediaDrag();
  assignMissingMediaIds();
  normalizeMediaCaretAnchors();
  els.contentInput.querySelectorAll(".inline-media-figure").forEach(figure => {
    const prev = getMediaBoundarySibling(figure, "previousSibling");
    if (!isMediaCaretAnchor(prev) && (!prev || isInlineMediaFigure(prev))) {
      figure.insertAdjacentElement("beforebegin", createMediaCaretAnchor());
    }

    const next = getMediaBoundarySibling(figure, "nextSibling");
    if (!isMediaCaretAnchor(next) && (!next || isInlineMediaFigure(next))) {
      figure.insertAdjacentElement("afterend", createMediaCaretAnchor());
    }
  });
  scheduleMediaCaretSync();
}

// 画像の左右のキャレットアンカーは幅8pxしかなく、画像の隣に文字を詰め込む
// 場所ではない。ここに文字を打ち始めたら、画像から見て外側＝前のアンカー
// なら上の行末、後ろのアンカーなら下の行頭へキャレットを移動してから
// 入力させる。
function placeCaretAtDivEdge(div, edge) {
  const range = document.createRange();
  if (edge === "start") {
    const first = div.firstChild;
    if (first && first.nodeType === Node.TEXT_NODE) range.setStart(first, 0);
    else range.setStart(div, 0);
  } else {
    const last = div.lastChild;
    if (last && last.nodeType === Node.TEXT_NODE) range.setStart(last, last.length);
    else range.setStart(div, div.childNodes.length);
  }
  range.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function redirectMediaCaretTyping() {
  const anchor = els.contentInput.querySelector(".media-caret-anchor.is-active-media-caret");
  if (!anchor) return false;

  const prev = getMediaBoundarySibling(anchor, "previousSibling");
  const next = getMediaBoundarySibling(anchor, "nextSibling");

  let outerSibling, insertSide, edge;
  if (isInlineMediaFigure(next)) {
    outerSibling = prev;
    insertSide = "beforebegin";
    edge = "end";
  } else if (isInlineMediaFigure(prev)) {
    outerSibling = next;
    insertSide = "afterend";
    edge = "start";
  } else {
    return false;
  }

  let target = outerSibling;
  if (!target || target.tagName !== "DIV") {
    target = document.createElement("div");
    anchor.insertAdjacentElement(insertSide, target);
  }

  clearActiveMediaCaret();
  placeCaretAtDivEdge(target, edge);
  return true;
}

function insertMediaElement(item) {
  const url     = item.downloadURL;
  const isVideo = item.mime_type.startsWith("video/") ||
                  /\.(mp4|mov|avi|webm|m4v|mkv)$/i.test(item.filename);

  const figure = document.createElement("figure");
  figure.className       = "inline-media-figure";
  figure.contentEditable = "false";
  figure.draggable       = false;
  if (!isVideo) {
    figure.dataset.originalSrc = url;
    figure.dataset.originalAlt = item.original_name || "";
  }

  const mediaEl = document.createElement(isVideo ? "video" : "img");
  mediaEl.src       = url;
  mediaEl.className = "inline-media";
  mediaEl.draggable = false;
  mediaEl.addEventListener(isVideo ? "loadedmetadata" : "load", () => scheduleMediaCaretSync(), { once: true });
  if (isVideo) { mediaEl.controls = true; mediaEl.preload = "metadata"; }
  else         { mediaEl.alt = item.original_name; }

  figure.appendChild(mediaEl);

  const sel = window.getSelection();
  const hasCursor = sel && sel.rangeCount > 0 &&
    els.contentInput.contains(sel.getRangeAt(0).commonAncestorContainer);
  if (hasCursor) {
    const range = sel.getRangeAt(0);
    const insertionPoint = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer.closest?.(".media-text-line, .media-caret-anchor")
      : range.commonAncestorContainer.parentElement?.closest?.(".media-text-line, .media-caret-anchor");
    if (isEmptyMediaTextLine(insertionPoint) || isEmptyMediaCaretAnchor(insertionPoint)) {
      insertionPoint.replaceWith(figure);
    } else {
      range.deleteContents();
      range.collapse(false);
      range.insertNode(figure);
    }
  } else {
    els.contentInput.appendChild(figure);
  }

  ensureMediaTextLines();
  const line = isMediaCaretAnchor(figure.nextElementSibling)
    ? figure.nextElementSibling
    : createMediaCaretAnchor();
  if (!line.isConnected) figure.insertAdjacentElement("afterend", line);
  try {
    placeCaretInMediaCaretAnchor(line);
  } catch (_) { els.contentInput.focus(); }

  figure.scrollIntoView({ behavior: "smooth", block: "nearest" });
  updateEmptyState();
  scheduleSave();
  return figure;
}

// ── ライトボックス ─────────────────────────────────────────────────────────────

function openLightbox(imgEl) {
  els.lightboxImg.src = imgEl.src;
  els.lightboxImg.alt = imgEl.alt ?? "";
  els.lightboxOverlay.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  els.lightboxOverlay.hidden = true;
  els.lightboxImg.src        = "";
  document.body.style.overflow = "";
}

els.lightboxOverlay.addEventListener("click", e => {
  if (e.target === els.lightboxOverlay || e.target === els.lightboxImg) closeLightbox();
});
els.lightboxClose.addEventListener("click", closeLightbox);

// ── 画像編集モーダル ─────────────────────────────────────────────────────────

const HANDLE_HIT  = 16;
const HANDLE_SIZE = 10;

const _crop = {
  figure:    null,
  imgEl:     null,   // DOM <img>（src 更新用）
  canvasImg: null,   // キャンバス描画用の Image オブジェクト
  editCanvas: null,  // 画像本体
  inkCanvas:  null,  // ペンで描いた線
  inkStrokes: [],    // 一筆ごとのペン線
  currentStroke: null,
  mode:      "pen",
  scale:     1,
  rect:      { x: 0, y: 0, w: 100, h: 100 },
  drag:      null,   // { type, startX, startY, initRect }
  lastPoint: null,
  brushPreviewPoint: null,
  history:   [],
  penColor: "#ef4444",
  penSize:  8,
  eraserType: "pixel",
  ready:     false,
  confirming: false,
  sessionId: 0,
};

function updateCropConfirmState() {
  if (!els.cropOk) return;
  els.cropOk.disabled = !_crop.ready || _crop.confirming;
  els.cropOk.textContent = _crop.confirming
    ? "処理中..."
    : (_crop.ready ? "確定" : "読み込み中...");

  if (els.cropTitle) els.cropTitle.textContent = "画像編集";
  if (els.cropHint) {
    els.cropHint.textContent = _crop.mode === "crop"
      ? "ドラッグで範囲選択 / Enter または 確定でトリミング"
      : _crop.mode === "eraser"
        ? (_crop.eraserType === "object"
          ? "オブジェクト消しゴムで触れた一筆をまとめて消せます"
          : "消しゴムでペンの線だけ消せます")
        : "ペンで画像に直接書き込めます";
  }

  const modeButtons = [
    [els.imageEditPenBtn, "pen"],
    [els.imageEditEraserBtn, "eraser"],
    [els.imageEditCropBtn, "crop"],
  ];
  modeButtons.forEach(([button, mode]) => {
    if (!button) return;
    const active = _crop.mode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    button.disabled = !_crop.ready || _crop.confirming;
  });

  [
    els.imageEditRotateLeftBtn,
    els.imageEditRotateRightBtn,
    els.imageEditFlipHBtn,
    els.imageEditFlipVBtn,
  ].forEach(button => {
    if (button) button.disabled = !_crop.ready || _crop.confirming;
  });
  if (els.imageEditUndoBtn) {
    els.imageEditUndoBtn.disabled = !_crop.ready || _crop.confirming || _crop.history.length === 0;
  }

  const canRestore = Boolean(_crop.figure?.dataset?.originalSrc);
  if (els.imageEditRestoreBtn) {
    els.imageEditRestoreBtn.hidden = !canRestore;
    els.imageEditRestoreBtn.disabled = !_crop.ready || _crop.confirming || !canRestore;
  }

  const isBrushMode = _crop.mode === "pen" || _crop.mode === "eraser";
  if (els.imageEditPenColorWrap) els.imageEditPenColorWrap.hidden = _crop.mode !== "pen";
  if (els.imageEditEraserTypeWrap) {
    els.imageEditEraserTypeWrap.hidden = _crop.mode !== "eraser";
    els.imageEditEraserTypeWrap.querySelectorAll("[data-eraser-type]").forEach(button => {
      const active = button.dataset.eraserType === _crop.eraserType;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
      button.disabled = !_crop.ready || _crop.confirming;
    });
  }
  if (els.imageEditPenSizeWrap) els.imageEditPenSizeWrap.hidden = !isBrushMode;
  updateImageEditColorSwatches();
}

function mediaSrcForStorage(imgEl) {
  return imgEl?.currentSrc || imgEl?.src || imgEl?.getAttribute?.("src") || "";
}

function rememberOriginalImageSource(figure, imgEl) {
  if (!figure || !imgEl || figure.dataset.originalSrc) return;
  figure.dataset.originalSrc = mediaSrcForStorage(imgEl);
  figure.dataset.originalAlt = imgEl.alt || "";
}

function setImageEditMode(mode) {
  _crop.mode = mode === "crop" || mode === "eraser" ? mode : "pen";
  _crop.drag = null;
  _crop.lastPoint = null;
  _crop.brushPreviewPoint = null;
  updateCropConfirmState();
  drawCropCanvas();
}

function updateImageEditColorSwatches() {
  els.imageEditPenColorWrap?.querySelectorAll("[data-pen-color]").forEach(button => {
    const active = button.dataset.penColor?.toLowerCase() === _crop.penColor.toLowerCase();
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function setImageEditPenColor(color) {
  if (!/^#[0-9a-f]{6}$/i.test(color || "")) return;
  _crop.penColor = color;
  updateImageEditColorSwatches();
}

function setImageEditEraserType(type) {
  _crop.eraserType = type === "object" ? "object" : "pixel";
  if (_crop.eraserType !== "pixel") _crop.brushPreviewPoint = null;
  updateCropConfirmState();
  drawCropCanvas();
}

function cloneImageEditCanvas(canvas = _crop.editCanvas) {
  if (!canvas) return null;
  const clone = document.createElement("canvas");
  clone.width = canvas.width;
  clone.height = canvas.height;
  clone.getContext("2d").drawImage(canvas, 0, 0);
  return clone;
}

function cloneImageEditStrokes(strokes = _crop.inkStrokes) {
  return (strokes || []).map(stroke => ({
    canvas: cloneImageEditCanvas(stroke.canvas),
  })).filter(stroke => stroke.canvas);
}

function createBlankImageEditInkCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function pushImageEditHistory() {
  if (!_crop.editCanvas) return;
  const snapshot = {
    editCanvas: cloneImageEditCanvas(_crop.editCanvas),
    inkCanvas: cloneImageEditCanvas(_crop.inkCanvas),
    inkStrokes: cloneImageEditStrokes(),
    rect: { ..._crop.rect },
  };
  _crop.history.push(snapshot);
  if (_crop.history.length > 30) _crop.history.shift();
  updateCropConfirmState();
}

function undoImageEditStep() {
  const snapshot = _crop.history.pop();
  if (!snapshot || _crop.confirming) {
    updateCropConfirmState();
    return;
  }
  replaceImageEditCanvas(snapshot.editCanvas, snapshot.inkCanvas, snapshot.rect, snapshot.inkStrokes);
  updateCropConfirmState();
}

function _cropClientToCanvas(e) {
  const c = els.cropCanvas;
  const r = c.getBoundingClientRect();
  const src = e.touches ? e.touches[0] : e;
  return {
    x: (src.clientX - r.left) * (c.width  / r.width),
    y: (src.clientY - r.top)  * (c.height / r.height),
  };
}

function _cropHitType(px, py) {
  const { x, y, w, h } = _crop.rect;
  const H = HANDLE_HIT;
  if (Math.abs(px - x)     < H && Math.abs(py - y)     < H) return "nw";
  if (Math.abs(px - x - w) < H && Math.abs(py - y)     < H) return "ne";
  if (Math.abs(px - x)     < H && Math.abs(py - y - h) < H) return "sw";
  if (Math.abs(px - x - w) < H && Math.abs(py - y - h) < H) return "se";
  if (px > x && px < x + w && py > y && py < y + h) return "move";
  return "new";
}

function _cropIsFullSelection() {
  const W = els.cropCanvas.width;
  const H = els.cropCanvas.height;
  const { x, y, w, h } = _crop.rect;
  return Math.abs(x) < 1 &&
    Math.abs(y) < 1 &&
    Math.abs(w - W) < 1 &&
    Math.abs(h - H) < 1;
}

function _cropClamp({ x, y, w, h }) {
  const W = els.cropCanvas.width, H = els.cropCanvas.height;
  x = Math.max(0, x); y = Math.max(0, y);
  w = Math.max(4, w); h = Math.max(4, h);
  if (x + w > W) w = W - x;
  if (y + h > H) h = H - y;
  return { x, y, w, h };
}

function getImageEditCanvasScale() {
  const rect = els.cropCanvas.getBoundingClientRect();
  return els.cropCanvas.width / Math.max(1, rect.width || els.cropCanvas.width);
}

function fitImageEditCanvasToViewport() {
  const canvas = els.cropCanvas;
  const wrap = canvas?.parentElement;
  if (!canvas || !wrap || !canvas.width || !canvas.height || els.cropOverlay?.hidden) return;

  const maxW = wrap.clientWidth;
  const maxH = wrap.clientHeight;
  if (!maxW || !maxH) return;

  const scale = Math.min(maxW / canvas.width, maxH / canvas.height);
  canvas.style.width = `${Math.max(1, Math.floor(canvas.width * scale))}px`;
  canvas.style.height = `${Math.max(1, Math.floor(canvas.height * scale))}px`;
}

function drawImageEditEraserPreview(ctx) {
  if (_crop.mode !== "eraser" || _crop.eraserType !== "pixel" || !_crop.brushPreviewPoint) return;
  const radius = Math.max(1, getImageEditPenWidth() / 2);
  const lineWidth = Math.max(1, 2 * getImageEditCanvasScale());
  const { x, y } = _crop.brushPreviewPoint;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = "rgba(15, 23, 42, 0.78)";
  ctx.stroke();
  ctx.setLineDash([lineWidth * 2.5, lineWidth * 2]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
  ctx.stroke();
  ctx.restore();
}

function drawCropCanvas() {
  const canvas = els.cropCanvas;
  const ctx    = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const img = _crop.editCanvas || _crop.canvasImg;   // 専用 Image / 編集キャンバスを使用
  if (!img) return;

  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0, W, H);
  if (_crop.inkCanvas) ctx.drawImage(_crop.inkCanvas, 0, 0, W, H);
  drawImageEditEraserPreview(ctx);
  if (_crop.mode !== "crop") return;

  const { x, y, w, h } = _crop.rect;

  // 外側を暗く
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.rect(x, y, w, h);
  ctx.fill("evenodd");
  ctx.restore();

  // 選択範囲の画像を再描画（明るく見せる）
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, 0, 0, W, H);
  ctx.restore();

  // 枠線
  ctx.strokeStyle = "#fff";
  ctx.lineWidth   = 1.5;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  // 三分割線
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth   = 0.75;
  ctx.beginPath();
  for (const t of [1/3, 2/3]) {
    ctx.moveTo(x + w * t, y);     ctx.lineTo(x + w * t, y + h);
    ctx.moveTo(x,         y + h * t); ctx.lineTo(x + w, y + h * t);
  }
  ctx.stroke();

  // コーナーハンドル
  ctx.fillStyle  = "#fff";
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur  = 4;
  const hs = HANDLE_SIZE;
  [[x, y], [x + w - hs, y], [x, y + h - hs], [x + w - hs, y + h - hs]].forEach(([hx, hy]) => {
    ctx.fillRect(hx, hy, hs, hs);
  });
  ctx.shadowBlur = 0;
}

function loadImageForEditorSource(src) {
  const fetchOptions = /^https?:/i.test(src) ? { cache: "no-store" } : {};
  return fetch(src, fetchOptions)
    .then(r => r.blob())
    .then(blob => {
      if (blob.size === 0) throw new Error("画像データが空です");
      return new Promise((resolve, reject) => {
        const objUrl = URL.createObjectURL(blob);
        const img    = new Image();
        img.onload  = () => { URL.revokeObjectURL(objUrl); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error("デコード失敗")); };
        img.src = objUrl;
      });
    });
}

function canvasFromImageSource(source) {
  const width = source.naturalWidth || source.width;
  const height = source.naturalHeight || source.height;
  if (!width || !height) throw new Error("画像サイズが0です");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(source, 0, 0, width, height);
  return canvas;
}

function composeImageEditCanvas() {
  if (!_crop.editCanvas) return null;
  const canvas = document.createElement("canvas");
  canvas.width = _crop.editCanvas.width;
  canvas.height = _crop.editCanvas.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(_crop.editCanvas, 0, 0);
  if (_crop.inkCanvas) ctx.drawImage(_crop.inkCanvas, 0, 0);
  return canvas;
}

function rebuildImageEditInkCanvasFromStrokes() {
  if (!_crop.editCanvas) return;
  const canvas = createBlankImageEditInkCanvas(_crop.editCanvas.width, _crop.editCanvas.height);
  const ctx = canvas.getContext("2d");
  _crop.inkStrokes.forEach(stroke => {
    if (stroke.canvas) ctx.drawImage(stroke.canvas, 0, 0);
  });
  _crop.inkCanvas = canvas;
}

function replaceImageEditCanvas(canvas, inkCanvas = null, rect = null, inkStrokes = null) {
  _crop.editCanvas = canvas;
  _crop.inkCanvas = inkCanvas || createBlankImageEditInkCanvas(canvas.width, canvas.height);
  _crop.inkStrokes = cloneImageEditStrokes(inkStrokes || []);
  _crop.currentStroke = null;
  els.cropCanvas.width = canvas.width;
  els.cropCanvas.height = canvas.height;
  fitImageEditCanvasToViewport();
  _crop.scale = 1;
  _crop.rect = rect
    ? _cropClamp(rect)
    : { x: 0, y: 0, w: canvas.width, h: canvas.height };
  _crop.drag = null;
  _crop.lastPoint = null;
  _crop.brushPreviewPoint = null;
  drawCropCanvas();
  updateCropConfirmState();
}

function openImageEditor(figure, initialMode = "pen") {
  const imgEl = figure.querySelector("img.inline-media");
  if (!imgEl) return;

  _crop.figure    = figure;
  _crop.imgEl     = imgEl;
  _crop.canvasImg = null;
  _crop.editCanvas = null;
  _crop.inkCanvas = null;
  _crop.inkStrokes = [];
  _crop.currentStroke = null;
  _crop.history = [];
  _crop.brushPreviewPoint = null;
  _crop.mode      = initialMode === "crop" ? "crop" : "pen";
  _crop.ready     = false;
  _crop.confirming = false;
  const sessionId = ++_crop.sessionId;
  updateCropConfirmState();

  // ① モーダルを先に開く（hidden な要素内のキャンバスへの描画は
  //    ブラウザによって無視されることがあるため、先に表示してから描画する）
  els.cropCanvas.width  = 10;
  els.cropCanvas.height = 10;
  els.cropOverlay.hidden = false;

  // ② cache:'no-store' で 304 を完全に回避し、常にフルボディを取得する。
  //    fetch が 304 を返すとボディが空になり blob が空 → canvas が黒くなる。
  //    Blob → ObjectURL → Image.onload 経路は CORS タント・デコード未完了も回避できる。
  loadImageForEditorSource(mediaSrcForStorage(imgEl))
    .then(img => {
      if (sessionId !== _crop.sessionId || els.cropOverlay.hidden) return;
      _crop.canvasImg = img;
      _crop.ready = true;
      replaceImageEditCanvas(canvasFromImageSource(img));
      updateCropConfirmState();
      drawCropCanvas();
    })
    .catch(err => {
      if (sessionId !== _crop.sessionId) return;
      closeCropModal();
      showToast("画像の読み込みに失敗しました: " + err.message);
    });
}

function openCropModal(figure) {
  openImageEditor(figure, "crop");
}

function closeCropModal() {
  els.cropOverlay.hidden = true;
  if (_crop.canvasImg instanceof ImageBitmap) _crop.canvasImg.close();
  _crop.figure    = null;
  _crop.imgEl     = null;
  _crop.canvasImg = null;
  _crop.editCanvas = null;
  _crop.inkCanvas = null;
  _crop.inkStrokes = [];
  _crop.currentStroke = null;
  _crop.drag      = null;
  _crop.lastPoint = null;
  _crop.history   = [];
  _crop.ready     = false;
  _crop.confirming = false;
  _crop.sessionId += 1;
  updateCropConfirmState();
}

function getImageEditPenWidth() {
  const size = Number(els.imageEditPenSize?.value || _crop.penSize || 8);
  return Math.max(1, size * getImageEditCanvasScale());
}

function createImageEditStrokeCanvas() {
  if (!_crop.inkCanvas) return null;
  return createBlankImageEditInkCanvas(_crop.inkCanvas.width, _crop.inkCanvas.height);
}

function beginImageEditStroke() {
  const canvas = createImageEditStrokeCanvas();
  if (!canvas) return null;
  const stroke = { canvas };
  _crop.inkStrokes.push(stroke);
  _crop.currentStroke = stroke;
  return stroke;
}

function drawImageEditBrushLineOnCanvas(canvas, from, to, { eraser = false } = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (eraser) ctx.globalCompositeOperation = "destination-out";
  ctx.strokeStyle = eraser ? "rgba(0,0,0,1)" : _crop.penColor;
  ctx.lineWidth = getImageEditPenWidth();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  if (from.x === to.x && from.y === to.y) {
    ctx.beginPath();
    ctx.arc(to.x, to.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  }
  ctx.restore();
}

function drawImageEditPenLine(from, to) {
  if (!_crop.inkCanvas) return;
  const isPixelEraser = _crop.mode === "eraser" && _crop.eraserType === "pixel";

  drawImageEditBrushLineOnCanvas(_crop.inkCanvas, from, to, { eraser: isPixelEraser });
  if (_crop.mode === "pen") {
    drawImageEditBrushLineOnCanvas(_crop.currentStroke?.canvas, from, to);
  } else if (isPixelEraser) {
    _crop.inkStrokes.forEach(stroke => {
      drawImageEditBrushLineOnCanvas(stroke.canvas, from, to, { eraser: true });
    });
  }
  drawCropCanvas();
}

function findImageEditInkPixelNear(point, imageData, radius) {
  const { width, height, data } = imageData;
  const cx = Math.max(0, Math.min(width - 1, Math.round(point.x)));
  const cy = Math.max(0, Math.min(height - 1, Math.round(point.y)));
  const r = Math.max(1, Math.ceil(radius));
  const r2 = r * r;
  let bestIndex = -1;
  let bestDist = Infinity;

  for (let y = Math.max(0, cy - r); y <= Math.min(height - 1, cy + r); y += 1) {
    for (let x = Math.max(0, cx - r); x <= Math.min(width - 1, cx + r); x += 1) {
      const dx = x - point.x;
      const dy = y - point.y;
      const dist = dx * dx + dy * dy;
      if (dist > r2 || dist >= bestDist) continue;
      const index = y * width + x;
      if (data[index * 4 + 3] === 0) continue;
      bestIndex = index;
      bestDist = dist;
    }
  }
  return bestIndex;
}

function findImageEditStrokeIndexAt(point) {
  const radius = Math.max(4, getImageEditPenWidth() / 2);
  for (let i = _crop.inkStrokes.length - 1; i >= 0; i -= 1) {
    const canvas = _crop.inkStrokes[i]?.canvas;
    if (!canvas) continue;
    const imageData = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
    if (findImageEditInkPixelNear(point, imageData, radius) >= 0) return i;
  }
  return -1;
}

function eraseImageEditInkObjectAt(point) {
  const index = findImageEditStrokeIndexAt(point);
  if (index < 0) return false;
  _crop.inkStrokes.splice(index, 1);
  rebuildImageEditInkCanvasFromStrokes();
  drawCropCanvas();
  return true;
}

function rotateImageEditSourceCanvas(src, direction) {
  const dst = document.createElement("canvas");
  dst.width = src.height;
  dst.height = src.width;
  const ctx = dst.getContext("2d");
  ctx.save();
  ctx.translate(dst.width / 2, dst.height / 2);
  ctx.rotate((direction > 0 ? 90 : -90) * Math.PI / 180);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  ctx.restore();
  return dst;
}

function flipImageEditSourceCanvas(src, axis) {
  const dst = document.createElement("canvas");
  dst.width = src.width;
  dst.height = src.height;
  const ctx = dst.getContext("2d");
  ctx.save();
  ctx.translate(axis === "x" ? dst.width : 0, axis === "y" ? dst.height : 0);
  ctx.scale(axis === "x" ? -1 : 1, axis === "y" ? -1 : 1);
  ctx.drawImage(src, 0, 0);
  ctx.restore();
  return dst;
}

function cropImageEditSourceCanvas(src, x, y, w, h) {
  const dst = document.createElement("canvas");
  dst.width = w;
  dst.height = h;
  dst.getContext("2d").drawImage(src, x, y, w, h, 0, 0, w, h);
  return dst;
}

function rotateImageEditCanvas(direction) {
  if (!_crop.editCanvas) return;
  pushImageEditHistory();
  const src = _crop.editCanvas;
  const dst = rotateImageEditSourceCanvas(src, direction);

  const ink = _crop.inkCanvas || createBlankImageEditInkCanvas(src.width, src.height);
  const nextInk = rotateImageEditSourceCanvas(ink, direction);
  const nextStrokes = _crop.inkStrokes.map(stroke => ({
    canvas: rotateImageEditSourceCanvas(stroke.canvas, direction),
  }));

  replaceImageEditCanvas(dst, nextInk, null, nextStrokes);
}

function flipImageEditCanvas(axis) {
  if (!_crop.editCanvas) return;
  pushImageEditHistory();
  const src = _crop.editCanvas;
  const dst = flipImageEditSourceCanvas(src, axis);

  const ink = _crop.inkCanvas || createBlankImageEditInkCanvas(src.width, src.height);
  const nextInk = flipImageEditSourceCanvas(ink, axis);
  const nextStrokes = _crop.inkStrokes.map(stroke => ({
    canvas: flipImageEditSourceCanvas(stroke.canvas, axis),
  }));

  replaceImageEditCanvas(dst, nextInk, null, nextStrokes);
}

function getImageEditCropBounds() {
  if (_crop.mode !== "crop" || !_crop.editCanvas) return { ok: true, changed: false };
  const src = _crop.editCanvas;
  const x = Math.max(0, Math.round(_crop.rect.x));
  const y = Math.max(0, Math.round(_crop.rect.y));
  const w = Math.min(src.width - x, Math.round(_crop.rect.w));
  const h = Math.min(src.height - y, Math.round(_crop.rect.h));
  if (w < 2 || h < 2) return { ok: false, changed: false };
  const changed = !(x === 0 && y === 0 && w === src.width && h === src.height);
  return { ok: true, changed, x, y, w, h };
}

function applyImageEditCropSelection(bounds = getImageEditCropBounds()) {
  if (!bounds.ok) return { ok: false, changed: false };
  if (!bounds.changed || !_crop.editCanvas) return { ok: true, changed: false };
  const { x, y, w, h } = bounds;
  const src = _crop.editCanvas;

  const dst = cropImageEditSourceCanvas(src, x, y, w, h);

  const inkSrc = _crop.inkCanvas || createBlankImageEditInkCanvas(src.width, src.height);
  const inkDst = cropImageEditSourceCanvas(inkSrc, x, y, w, h);
  const nextStrokes = _crop.inkStrokes.map(stroke => ({
    canvas: cropImageEditSourceCanvas(stroke.canvas, x, y, w, h),
  }));
  replaceImageEditCanvas(dst, inkDst, null, nextStrokes);
  return { ok: true, changed: true };
}

function confirmCropWithinEditor() {
  const bounds = getImageEditCropBounds();
  if (!bounds.ok) {
    showToast("範囲が小さすぎます。");
    return false;
  }
  if (!bounds.changed) {
    showToast("トリミング範囲を選択してください。");
    return false;
  }

  pushImageEditHistory();
  const result = applyImageEditCropSelection(bounds);
  if (!result.ok) {
    showToast("範囲が小さすぎます。");
    return false;
  }
  setImageEditMode("pen");
  showToast("トリミングしました。");
  return true;
}

async function loadOriginalIntoImageEditor() {
  const originalSrc = _crop.figure?.dataset?.originalSrc || "";
  if (!originalSrc) {
    showToast("元画像が残っていません。");
    return;
  }
  if (_crop.confirming) return;
  const ok = await showConfirm("現在の編集内容を破棄して元画像を読み込みますか？", "元画像に戻す");
  if (!ok) return;

  _crop.confirming = true;
  updateCropConfirmState();
  try {
    const img = await loadImageForEditorSource(originalSrc);
    _crop.canvasImg = img;
    pushImageEditHistory();
    replaceImageEditCanvas(canvasFromImageSource(img));
    setImageEditMode("pen");
    showToast("元画像を読み込みました。");
  } catch (err) {
    showToast("元画像の読み込みに失敗しました: " + err.message);
  } finally {
    _crop.confirming = false;
    updateCropConfirmState();
  }
}

// ポインターイベント（マウス + タッチ共通）
els.cropCanvas.addEventListener("pointerdown", e => {
  if (!_crop.ready) return;
  e.preventDefault();
  els.cropCanvas.setPointerCapture(e.pointerId);
  const { x, y } = _cropClientToCanvas(e);
  if (_crop.mode === "pen" || _crop.mode === "eraser") {
    _crop.brushPreviewPoint = { x, y };
    pushImageEditHistory();
    _crop.drag = { type: "brush" };
    _crop.lastPoint = { x, y };
    if (_crop.mode === "pen") beginImageEditStroke();
    if (_crop.mode === "eraser" && _crop.eraserType === "object") {
      eraseImageEditInkObjectAt(_crop.lastPoint);
      return;
    }
    drawImageEditPenLine(_crop.lastPoint, _crop.lastPoint);
    return;
  }
  let type = _cropHitType(x, y);
  if (type === "move" && _cropIsFullSelection()) type = "new";
  _crop.drag = { type, startX: x, startY: y, initRect: { ..._crop.rect } };
});

els.cropCanvas.addEventListener("pointermove", e => {
  if (!_crop.ready) return;
  const { x, y } = _cropClientToCanvas(e);
  if (_crop.mode === "eraser" && _crop.eraserType === "pixel") {
    _crop.brushPreviewPoint = { x, y };
    if (!_crop.drag) drawCropCanvas();
  } else if (_crop.brushPreviewPoint) {
    _crop.brushPreviewPoint = null;
    if (!_crop.drag) drawCropCanvas();
  }

  if (!_crop.drag) {
    // カーソル形状を変える
    if (_crop.mode === "pen" || _crop.mode === "eraser") {
      els.cropCanvas.style.cursor = "crosshair";
      return;
    }
    const cursors = { nw: "nw-resize", ne: "ne-resize", sw: "sw-resize", se: "se-resize", move: "move", new: "crosshair" };
    els.cropCanvas.style.cursor = cursors[_cropHitType(x, y)] ?? "crosshair";
    return;
  }
  e.preventDefault();
  if (_crop.drag.type === "brush") {
    const point = { x, y };
    _crop.brushPreviewPoint = _crop.mode === "eraser" && _crop.eraserType === "pixel" ? point : null;
    if (_crop.mode === "eraser" && _crop.eraserType === "object") {
      eraseImageEditInkObjectAt(point);
      _crop.lastPoint = point;
      return;
    }
    drawImageEditPenLine(_crop.lastPoint || point, point);
    _crop.lastPoint = point;
    return;
  }
  const dx = x - _crop.drag.startX;
  const dy = y - _crop.drag.startY;
  const r  = _crop.drag.initRect;
  const W  = els.cropCanvas.width, H = els.cropCanvas.height;

  let nr;
  switch (_crop.drag.type) {
    case "new": {
      const lx = Math.min(_crop.drag.startX, x);
      const ly = Math.min(_crop.drag.startY, y);
      nr = _cropClamp({ x: lx, y: ly, w: Math.abs(dx) || 4, h: Math.abs(dy) || 4 });
      break;
    }
    case "move": {
      const nx = Math.max(0, Math.min(r.x + dx, W - r.w));
      const ny = Math.max(0, Math.min(r.y + dy, H - r.h));
      nr = { x: nx, y: ny, w: r.w, h: r.h };
      break;
    }
    case "nw": nr = _cropClamp({ x: r.x + dx, y: r.y + dy, w: r.w - dx, h: r.h - dy }); break;
    case "ne": nr = _cropClamp({ x: r.x,      y: r.y + dy, w: r.w + dx, h: r.h - dy }); break;
    case "sw": nr = _cropClamp({ x: r.x + dx, y: r.y,      w: r.w - dx, h: r.h + dy }); break;
    case "se": nr = _cropClamp({ x: r.x,      y: r.y,      w: r.w + dx, h: r.h + dy }); break;
    default:   nr = _crop.rect;
  }
  _crop.rect = nr;
  drawCropCanvas();
});

els.cropCanvas.addEventListener("pointerup",     () => { _crop.drag = null; _crop.lastPoint = null; _crop.currentStroke = null; });
els.cropCanvas.addEventListener("pointercancel", () => { _crop.drag = null; _crop.lastPoint = null; _crop.currentStroke = null; _crop.brushPreviewPoint = null; drawCropCanvas(); });
els.cropCanvas.addEventListener("pointerleave", () => {
  if (_crop.drag) return;
  _crop.brushPreviewPoint = null;
  drawCropCanvas();
});
window.addEventListener("resize", () => {
  if (!els.cropOverlay || els.cropOverlay.hidden) return;
  fitImageEditCanvasToViewport();
  drawCropCanvas();
});

async function confirmCrop() {
  if (_crop.confirming) return;
  if (!_crop.ready || !_crop.editCanvas) {
    showToast("画像の読み込みが終わってから確定してください。");
    return;
  }
  if (_crop.mode === "crop") {
    confirmCropWithinEditor();
    return;
  }

  const { figure, imgEl } = _crop;
  if (!figure || !imgEl) return;
  _crop.confirming = true;
  updateCropConfirmState();

  pushUndoSnapshot(snapshotFromEditor(getSelectedNote()?.id));
  rememberOriginalImageSource(figure, imgEl);

  try {
    const outputCanvas = composeImageEditCanvas();
    const blob = await canvasToBlob(outputCanvas, "image/png");
    const editedUrl = await blobToDataUrl(blob);

    imgEl.addEventListener("load", () => scheduleMediaCaretSync(), { once: true });
    imgEl.src = editedUrl;
    imgEl.alt = _crop.mode === "crop" ? "cropped.png" : "edited.png";
    scheduleMediaCaretSync();

    scheduleSave();
    closeCropModal();
    showToast("画像を編集しました。");
  } catch (err) {
    _crop.confirming = false;
    updateCropConfirmState();
    showToast("画像編集に失敗しました: " + err.message);
  }
}

els.cropOk    .addEventListener("click", confirmCrop);
els.cropCancel.addEventListener("click", closeCropModal);
els.cropOverlay.addEventListener("click", e => {
  if (e.target === els.cropOverlay) closeCropModal();
});
document.addEventListener("keydown", e => {
  if (e.key !== "Enter" || isImeComposing(e)) return;
  if (!els.cropOverlay || els.cropOverlay.hidden) return;
  if (els.confirmOverlay?.classList.contains("open")) return;
  if (e.target === els.cropCancel) return;
  const tag = e.target?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  e.preventDefault();
  e.stopImmediatePropagation();
  void confirmCrop();
}, true);
els.imageEditPenBtn?.addEventListener("click", () => setImageEditMode("pen"));
els.imageEditEraserBtn?.addEventListener("click", () => setImageEditMode("eraser"));
els.imageEditCropBtn?.addEventListener("click", () => setImageEditMode("crop"));
els.imageEditUndoBtn?.addEventListener("click", undoImageEditStep);
els.imageEditRotateLeftBtn?.addEventListener("click", () => rotateImageEditCanvas(-1));
els.imageEditRotateRightBtn?.addEventListener("click", () => rotateImageEditCanvas(1));
els.imageEditFlipHBtn?.addEventListener("click", () => flipImageEditCanvas("x"));
els.imageEditFlipVBtn?.addEventListener("click", () => flipImageEditCanvas("y"));
els.imageEditRestoreBtn?.addEventListener("click", loadOriginalIntoImageEditor);
els.imageEditPenColorWrap?.addEventListener("click", e => {
  const button = e.target.closest("[data-pen-color]");
  if (!button) return;
  setImageEditPenColor(button.dataset.penColor);
});
els.imageEditPenSize?.addEventListener("input", e => {
  _crop.penSize = Number(e.target.value || _crop.penSize || 8);
  drawCropCanvas();
});
els.imageEditEraserTypeWrap?.addEventListener("click", e => {
  const button = e.target.closest("[data-eraser-type]");
  if (!button) return;
  setImageEditEraserType(button.dataset.eraserType);
});

// ── メディアコンテキストメニュー ──────────────────────────────────────────────

function showMediaCtxMenu(x, y, figure) {
  state.mediaCmFigure = figure;
  const isImage = !!figure.querySelector("img.inline-media");
  if (els.mediaSizeSection) els.mediaSizeSection.hidden = !isImage;

  const menu = els.mediaContextMenu;
  menu.hidden = false;
  menu.style.left = `${x}px`;
  menu.style.top  = `${y}px`;
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  if (x + mw > window.innerWidth)  menu.style.left = `${window.innerWidth  - mw - 6}px`;
  if (y + mh > window.innerHeight) menu.style.top  = `${window.innerHeight - mh - 6}px`;
}

function hideMediaCtxMenu() {
  els.mediaContextMenu.hidden = true;
  state.mediaCmFigure = null;
}

// クリップボードへ書き込めるのは image/png のみのブラウザが多いため、
// 元画像が PNG でなければ canvas 経由で PNG に変換する。
async function fetchImageAsPngBlob(src) {
  const res = await fetch(src);
  const blob = await res.blob();
  if (blob.type === "image/png") return blob;

  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("画像の読み込みに失敗しました。"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext("2d").drawImage(image, 0, 0);
    return await new Promise((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("PNG変換に失敗しました。")), "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function copyFigureImageToClipboard(figure) {
  const img = figure.querySelector("img.inline-media");
  if (!img) {
    showToast("コピーできる画像がありません。");
    return;
  }
  if (!navigator.clipboard || !window.ClipboardItem) {
    showToast("このブラウザは画像のコピーに対応していません。");
    return;
  }
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": fetchImageAsPngBlob(img.src) })
    ]);
    showToast("画像をコピーしました。");
  } catch (err) {
    showToast("画像のコピーに失敗しました: " + err.message);
  }
}

els.mediaContextMenu.addEventListener("click", e => {
  const btn = e.target.closest("[data-media-action], [data-size]");
  if (!btn || !state.mediaCmFigure) return;

  const action = btn.dataset.mediaAction;

  if (action === "copy") {
    const figure = state.mediaCmFigure;
    hideMediaCtxMenu();
    copyFigureImageToClipboard(figure);
    return;
  }

  if (action === "size" || btn.dataset.size) {
    const figure = state.mediaCmFigure;
    pushUndoSnapshot(snapshotFromNote(getSelectedNote()));
    figure.dataset.size = btn.dataset.size;
    ensureAnchorAfterFigure(figure);
    scheduleMediaCaretSync();
    hideMediaCtxMenu();
    scheduleSave();
    return;
  }

  if (action === "edit") {
    const figure = state.mediaCmFigure;
    hideMediaCtxMenu();
    openImageEditor(figure, "pen");
    return;
  }

  if (action === "trim") {
    const figure = state.mediaCmFigure;
    hideMediaCtxMenu();
    openCropModal(figure);
    return;
  }

  if (action === "delete") {
    const figure = state.mediaCmFigure;
    pushUndoSnapshot(snapshotFromNote(getSelectedNote()));
    hideMediaCtxMenu();
    figure.remove();
    normalizeMediaCaretAnchors();
    updateEmptyState();
    scheduleSave();
    return;
  }
});

// ── contenteditable イベント委任 ──────────────────────────────────────────────

els.contentInput.addEventListener("pointerdown", e => {
  if (e.button !== 0) return;
  const memoLink = getMemoLinkFromTarget(e.target);
  if (!memoLink || !els.contentInput.contains(memoLink)) return;
  const href = normalizeMemoLinkHref(memoLink.getAttribute("href") || memoLink.href);
  if (!href || !shouldOpenMemoLinkFromClick(e)) return;
  e.preventDefault();
  e.stopPropagation();
  openMemoLink(href);
}, { capture: true });

els.contentInput.addEventListener("click", e => {
  const memoLink = getMemoLinkFromTarget(e.target);
  if (memoLink && els.contentInput.contains(memoLink)) {
    const href = normalizeMemoLinkHref(memoLink.getAttribute("href") || memoLink.href);
    e.preventDefault();
    if (href && shouldOpenMemoLinkFromClick(e) && !recentlyOpenedMemoLink(href)) {
      openMemoLink(href);
    }
    return;
  }

  const caretAnchor = e.target.closest(".media-caret-anchor");
  if (caretAnchor) {
    placeCaretInMediaCaretAnchor(caretAnchor);
    return;
  }

  const figure = e.target.closest(".inline-media-figure");
  if (figure) {
    const side = getMediaSideFromPoint(figure, e.clientX);
    if (side) {
      e.preventDefault();
      placeCaretBesideFigure(figure, side);
      return;
    }
  }

  const nearby = getMediaFigureNearPoint(e.clientX, e.clientY);
  if (nearby) {
    placeCaretBesideFigure(nearby.figure, nearby.side);
    return;
  }

  clearActiveMediaCaret();

  // 画像クリック → ライトボックスで表示
  if (e.target.classList.contains("inline-media") && e.target.tagName === "IMG") {
    e.preventDefault();
    openLightbox(e.target);
  }
});

// 右クリック → メディアコンテキストメニュー
els.contentInput.addEventListener("contextmenu", e => {
  const figure = e.target.closest(".inline-media-figure");
  if (!figure) return;
  e.preventDefault(); e.stopPropagation();
  hideCtxMenu();
  showMediaCtxMenu(e.clientX, e.clientY, figure);
});

els.contentInput.addEventListener("dragstart", e => {
  if (!e.target.closest(".inline-media-figure")) return;
  e.preventDefault();
  e.stopPropagation();
});

els.contentInput.addEventListener("dragover", e => {
  if (e.dataTransfer.types.includes("Files")) return;
  e.preventDefault();
});

els.contentInput.addEventListener("drop", e => {
  if (e.dataTransfer.types.includes("Files")) return;
  e.preventDefault();
  e.stopPropagation();
});

// ── ツリーコンテキストメニュー ────────────────────────────────────────────────

function showCtxMenu(x, y, noteId) {
  state.contextNoteId = noteId;
  const note  = getNotes().find(n => n.id === noteId);
  const accessLocked = Boolean(note) && isNoteAccessLocked(note.id);
  const readOnly = isGuestReadOnly();
  els.contextMenu.querySelectorAll("[data-action]").forEach(button => {
    if (readOnly && button.dataset.action !== "open-lock") {
      button.disabled = true;
      button.title = "ホストが閲覧専用に設定しています";
      return;
    }
    button.disabled = accessLocked
      && button.dataset.action !== "toggle-lock"
      && button.dataset.action !== "open-lock";
  });
  const pinBtn = els.contextMenu.querySelector('[data-action="toggle-pin"]');
  if (pinBtn) {
    const canPin = note?.parent_id === null && !isCollabActive();
    pinBtn.hidden = !canPin;
    pinBtn.textContent = note?.pinned ? "📌　ピン留めを解除" : "📌　ピン留め";
  }
  const checkItem = els.contextMenu.querySelector('[data-action="toggle-check"]');
  if (checkItem) {
    checkItem.textContent = note?.checked ? "✓　チェックを外す" : "✓　チェックする";
  }
  const todoBtn = els.contextMenu.querySelector('[data-action="add-todo"]');
  if (todoBtn) {
    const added = Boolean(note && getTodoForNote(note.id));
    todoBtn.classList.toggle("ctx-item-added", added);
    if (added) {
      todoBtn.textContent = "✓　TODO追加済み";
      todoBtn.disabled = true;
      todoBtn.title = "このメモはTODOに追加済みです";
    } else {
      todoBtn.textContent = "📋　TODOに追加";
      todoBtn.disabled = accessLocked || readOnly;
      todoBtn.title = readOnly ? "ホストが閲覧専用に設定しています" : "";
    }
  }
  const siblingTopBtn = els.contextMenu.querySelector('[data-action="move-sibling-top"]');
  if (siblingTopBtn) {
    siblingTopBtn.hidden = false;
  }
  const siblingBottomBtn = els.contextMenu.querySelector('[data-action="move-sibling-bottom"]');
  if (siblingBottomBtn) {
    siblingBottomBtn.hidden = false;
  }
  const syncBtn = els.contextMenu.querySelector('[data-action="convert-mindmap"]');
  if (syncBtn) {
    const isSynced = Boolean(note?.linked_mindmap_id);
    const blockedByCollab = isCollabActive() && note?.parent_id !== null;
    const blockedByGuestOnly = isCollabActive() && state.collabRoomRole !== "host";
    if (isSynced) {
      const mapTitle = state.mindMapList?.find(m => m.id === note.linked_mindmap_id)?.title;
      syncBtn.textContent = `✓　同期済み${mapTitle ? `「${mapTitle}」` : ""}`;
      syncBtn.disabled = true;
      syncBtn.classList.add("ctx-item-synced");
    } else {
      syncBtn.textContent = "⇄　マインドマップと同期";
      syncBtn.disabled = accessLocked || blockedByCollab || blockedByGuestOnly || readOnly;
      syncBtn.title = blockedByCollab
        ? "共同作業中は、共有中の親メモ以外はマインドマップと同期できません"
        : blockedByGuestOnly ? "共同作業中、マインドマップとの同期はホストだけができます" : "";
      syncBtn.classList.remove("ctx-item-synced");
    }
  }
  const openLockBtn = els.contextMenu.querySelector('[data-action="open-lock"]');
  if (openLockBtn) {
    const lockedAndClosed = Boolean(note?.locked) && !state.unlockedNoteIds.has(note?.id);
    openLockBtn.hidden = !lockedAndClosed;
  }
  const lockBtn = els.contextMenu.querySelector('[data-action="toggle-lock"]');
  if (lockBtn) {
    const canManageLock = Boolean(note?.locked) || isLockableParentNote(note);
    // 鍵の解除（既にロック済みのメモを開けるようにする）は許可するが、
    // 共同作業中に新しく鍵をかけると本人以外のパスワードでは開けなくなり
    // 他の参加者が締め出されるため、新規ロックだけは隠す。
    const wouldCreateLock = !note?.locked;
    lockBtn.hidden = !canManageLock || (isCollabActive() && wouldCreateLock);
    lockBtn.disabled = !canManageLock || readOnly;
    lockBtn.textContent = note?.locked ? "🔓　鍵を外す" : "🔒　鍵をかける";
  }
  const relockBtn = els.contextMenu.querySelector('[data-action="relock-note"]');
  if (relockBtn) {
    relockBtn.hidden = !note?.locked || !state.unlockedNoteIds.has(note.id);
    relockBtn.disabled = readOnly;
  }
  const deleteBtn = els.contextMenu.querySelector('[data-action="delete"]');
  if (deleteBtn) {
    const blockedByCollab = isCollabActive() && note?.parent_id === null;
    if (blockedByCollab || readOnly) deleteBtn.disabled = true;
    deleteBtn.title = blockedByCollab ? "共同作業中は親メモを削除できません" : "";
  }
  const renameBtn = els.contextMenu.querySelector('[data-action="rename"]');
  if (renameBtn) {
    const blockedByCollab = !canEditNoteTitle(note);
    if (blockedByCollab || readOnly) renameBtn.disabled = true;
    renameBtn.title = blockedByCollab ? "共同作業中、親メモの名前を変更できるのはホストだけです" : "";
  }
  els.contextMenu.hidden = false;
  els.contextMenu.style.left = `${x}px`;
  els.contextMenu.style.top  = `${y}px`;
  const mw = els.contextMenu.offsetWidth, mh = els.contextMenu.offsetHeight;
  if (x + mw > window.innerWidth)  els.contextMenu.style.left = `${window.innerWidth  - mw - 6}px`;
  if (y + mh > window.innerHeight) els.contextMenu.style.top  = `${window.innerHeight - mh - 6}px`;
}

function hideCtxMenu() { els.contextMenu.hidden = true; state.contextNoteId = null; }

function isPlainEnterKey(e) {
  return (e.key === "Enter" || e.key === "NumpadEnter")
    && !e.ctrlKey
    && !e.metaKey
    && !e.altKey
    && !e.shiftKey
    && !isImeComposing(e);
}

function isTreeRenameBlockedByOverlay() {
  return Boolean(
    els.confirmOverlay?.classList.contains("open") ||
    !els.noteLockOverlay?.hidden ||
    !els.cropOverlay?.hidden ||
    !els.lightboxOverlay?.hidden ||
    !els.templatesOverlay?.hidden ||
    !els.appManagementOverlay?.hidden ||
    !els.mindMapOverlay?.hidden
  );
}

function isTextEntryTarget(target) {
  if (!target) return false;
  const element = target.nodeType === Node.ELEMENT_NODE ? target : target.parentElement;
  const active = document.activeElement;
  return Boolean(
    element?.closest?.("input, textarea, select, [contenteditable='true'], [role='textbox']") ||
    active?.closest?.("input, textarea, select, [contenteditable='true'], [role='textbox']")
  );
}

function getTreeRenameTargetFromEnter(e) {
  if (isTextEntryTarget(e.target)) return null;
  return state.selectedId;
}

function handleTreeRenameEnter(e) {
  if (!isPlainEnterKey(e) || state.isDraggingNote || isTreeRenameBlockedByOverlay()) return false;
  const noteId = getTreeRenameTargetFromEnter(e);
  if (!noteId || isNoteAccessLocked(noteId)) return false;
  const row = els.tree.querySelector(`[data-id="${noteId}"]`);
  if (!row || row.querySelector(".tree-rename-input")) return false;
  e.preventDefault();
  e.stopPropagation();
  startInlineRename(noteId);
  return true;
}

function startInlineRename(noteId) {
  if (isNoteAccessLocked(noteId)) return;
  if (blockIfGuestReadOnly()) return;
  if (blockRootRenameForGuest(getNotes().find(n => n.id === noteId))) return;
  const row = els.tree.querySelector(`[data-id="${noteId}"]`);
  if (!row) {
    if (state.selectedId === noteId) {
      els.titleInput.focus();
      els.titleInput.select();
    }
    return;
  }
  const span = row.querySelector(".tree-title");
  if (!span) return;
  const orig  = span.textContent;
  const input = document.createElement("input");
  input.className = "tree-rename-input";
  input.value = orig;
  span.replaceWith(input);
  input.focus(); input.select();
  let done = false;
  async function commit() {
    if (done) return; done = true;
    const val = input.value.trim() || orig;
    span.textContent = val; input.replaceWith(span);
    if (val !== orig) {
      try {
        pushUndoSnapshot(snapshotFromNote(getNotes().find(n => n.id === noteId)));
        await updateNote(noteId, { title: val });
        showToast("名前を変更しました。");
      }
      catch (e) { showToast(e.message); await loadNotes(); }
    }
  }
  function cancel() { if (done) return; done = true; span.textContent = orig; input.replaceWith(span); }
  input.addEventListener("blur", commit);
  input.addEventListener("click", e => e.stopPropagation());
  input.addEventListener("pointerdown", e => e.stopPropagation());
  input.addEventListener("keydown", e => {
    e.stopPropagation();
    if (e.key === "Enter")  { e.preventDefault(); input.blur(); }
    if (e.key === "Escape") { input.removeEventListener("blur", commit); cancel(); }
  });
}

els.contextMenu.addEventListener("click", async e => {
  const btn = e.target.closest("[data-action]");
  if (!btn || btn.disabled) return;
  const action = btn.dataset.action;
  const id     = state.contextNoteId;
  hideCtxMenu();
  if (!id) return;
  switch (action) {
    case "rename":    startInlineRename(id); break;
    case "add-child": await createNote(id); break;
    case "add-todo": await addNoteToTodoList(id); break;
    case "convert-mindmap": await convertSelectedNoteToMindMap(id); break;
    case "toggle-check": await toggleCheckedNote(id); break;
    case "toggle-pin": await togglePinnedNote(id); break;
    case "move-sibling-top": await moveNoteToSiblingEdge(id, "start"); break;
    case "move-sibling-bottom": await moveNoteToSiblingEdge(id, "end"); break;
    case "open-lock":   await openProtectedNote(id); break;
    case "toggle-lock": await toggleNoteLock(id); break;
    case "relock-note": await relockNote(id); break;
    case "delete":
      state.selectedId = id;
      await deleteSelectedNote();
      break;
  }
});

// ── Global events ─────────────────────────────────────────────────────────────

document.addEventListener("click", e => {
  if (!els.contextMenu.hidden      && !els.contextMenu.contains(e.target))      hideCtxMenu();
  if (!els.mediaContextMenu.hidden && !els.mediaContextMenu.contains(e.target)) hideMediaCtxMenu();
  if (!els.noteChildrenPopover?.hidden && !els.noteChildrenPopover.contains(e.target) && !e.target.closest(".note-grid-card-more")) {
    hideNoteChildrenPopover();
  }
  const clickedMemoFormat = Boolean(
    els.memoFormatBar?.contains(e.target) ||
    els.memoFormatToggleBtn?.contains(e.target)
  );
  if (!clickedMemoFormat) closeMemoFormatPanel();
  const clickedCollabStatus = Boolean(
    els.collabStatusPanel?.contains(e.target) ||
    els.collabStatusBtn?.contains(e.target) ||
    els.mindMapCollabStatusBtn?.contains(e.target)
  );
  if (!els.collabStatusPanel?.hidden && !clickedCollabStatus) {
    closeCollabStatusPanel();
  }
  const clickedMemoSettings = Boolean(
    els.memoSettingsPanel?.contains(e.target) ||
    els.memoSettingsBtn?.contains(e.target)
  );
  if (!els.memoSettingsPanel?.hidden && !clickedMemoSettings) {
    closeMemoSettingsPanel();
  }
  const clickedTextColorControl = els.memoTextColorBtn?.contains(e.target) || els.memoTextColorPalette?.contains(e.target);
  const clickedHighlightControl = els.memoHighlightBtn?.contains(e.target) || els.memoHighlightPalette?.contains(e.target);
  if (!clickedTextColorControl) closeMemoTextColorPalette();
  if (!clickedHighlightControl) closeMemoHighlightPalette();
  if (!e.target.closest(".mindmap-color-current")) closeMindMapColorControls();
  const mindMapMenuOpen = !els.mindMapContextMenu.hidden ||
    Boolean(els.mindMapCanvasContextMenu && !els.mindMapCanvasContextMenu.hidden) ||
    Boolean(els.mindMapExtraLinkContextMenu && !els.mindMapExtraLinkContextMenu.hidden) ||
    Boolean(els.mindMapListContextMenu && !els.mindMapListContextMenu.hidden) ||
    Boolean(els.mindMapLinkContextMenu && !els.mindMapLinkContextMenu.hidden);
  const clickedMindMapMenu = els.mindMapContextMenu.contains(e.target) ||
    Boolean(els.mindMapCanvasContextMenu?.contains(e.target)) ||
    Boolean(els.mindMapExtraLinkContextMenu?.contains(e.target)) ||
    Boolean(els.mindMapListContextMenu?.contains(e.target)) ||
    Boolean(els.mindMapLinkContextMenu?.contains(e.target));
  if (mindMapMenuOpen && !clickedMindMapMenu) hideMindMapCtxMenu();
  const accountButtonClicked = [els.accountBtn, els.mindMapAccountBtn, els.appAccountBtn]
    .filter(Boolean)
    .some(button => button.contains(e.target));
  if (!els.accountMenu.hidden && !els.accountMenu.contains(e.target) && !accountButtonClicked) {
    els.accountMenu.hidden = true;
  }
  const clickedNodeSettings = Boolean(
    els.mindMapNodeSettingsPanel?.contains(e.target) ||
    els.mindMapNodeSettingsBtn?.contains(e.target)
  );
  if (!els.mindMapNodeSettingsPanel?.hidden && !clickedNodeSettings) {
    closeMindMapNodeSettingsPanel();
  }
  const clickedMindMapSettings = Boolean(
    els.mindMapSettingsPanel?.contains(e.target) ||
    els.mindMapSettingsBtn?.contains(e.target)
  );
  if (!els.mindMapSettingsPanel?.hidden && !clickedMindMapSettings) {
    closeMindMapSettingsPanel();
  }
});

document.addEventListener("keydown", e => {
  handleTreeRenameEnter(e);
}, { capture: true });

document.addEventListener("keydown", e => {
  setMemoLinkCursorMode(memoLinkModifierActiveFromKeyEvent(e));

  if (!els.cropOverlay.hidden && (e.key === "Enter" || e.key === "NumpadEnter")) {
    e.preventDefault();
    confirmCrop();
    return;
  }
  if (e.key === "Escape" && !els.noteLockOverlay.hidden) {
    e.preventDefault();
    closeNoteLockPrompt(false);
    return;
  }
  if (e.key === "Escape" && !els.hostTransferOverlay?.hidden) {
    e.preventDefault();
    closeHostTransferDialog();
    return;
  }
  if (e.key === "Escape" && !els.appManagementOverlay?.hidden) {
    e.preventDefault();
    if (
      !els.appHowToDialog?.hidden ||
      !els.appInfoDialog?.hidden ||
      !els.appCollabDialog?.hidden ||
      !els.appAccountDialog?.hidden
    ) showAppManagementHome(true);
    else closeAppManagement();
    return;
  }
  if (e.key === "Escape" && els.mindMapNodeSettingsPanel?.classList.contains("is-memo-fullscreen")) {
    e.preventDefault();
    setMindMapMemoFullscreen(false);
    return;
  }
  if (e.key === "Escape" && !els.memoSettingsPanel?.hidden) {
    e.preventDefault();
    closeMemoSettingsPanel();
    return;
  }
  if (e.key === "Escape" && !els.noteChildrenPopover?.hidden) {
    e.preventDefault();
    hideNoteChildrenPopover();
    return;
  }
  if (e.key === "Escape" && !els.noteGridOverlay?.hidden) {
    e.preventDefault();
    closeNoteGridOverlay();
    return;
  }
  if (e.key === "Escape" && !els.noteHistoryOverlay?.hidden) {
    e.preventDefault();
    closeNoteHistoryOverlay();
    return;
  }
  if (e.key === "Escape" && !els.noteTodoPanel?.hidden) {
    e.preventDefault();
    closeNoteTodoPanel();
    return;
  }
  if (e.key === "Escape" && !els.collabStatusPanel?.hidden) {
    e.preventDefault();
    closeCollabStatusPanel();
    return;
  }
  if (e.key === "Escape" && !els.mindMapGridOverlay?.hidden) {
    e.preventDefault();
    closeMindMapListPanel();
    return;
  }
  const mindMapSettingsOpen = !els.mindMapSettingsPanel?.hidden || !els.mindMapNodeSettingsPanel?.hidden;
  if (e.key === "Escape" && mindMapSettingsOpen) {
    e.preventDefault();
    closeMindMapSettingsPanel();
    closeMindMapNodeSettingsPanel();
    return;
  }
  if (e.key === "Escape" && els.mindMapOverlay?.classList.contains("is-large-view")) {
    e.preventDefault();
    setMindMapLargeView(false);
    return;
  }
  if (e.key === "Escape") {
    closeLightbox();
    closeCropModal();
    closeTemplatesPanel();
    closeMindMapPanel();
    hideCtxMenu();
    hideMediaCtxMenu();
    hideMindMapCtxMenu();
    closeMemoFormatPanel();
    closeMindMapColorControls();
    els.accountMenu.hidden = true;
    closeMobileMenu();
    setLargeEditorOpen(false);
    resolveConfirm(false);
  }
  const isUndo = (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z";
  if (isUndo) {
    e.preventDefault();
    if (!els.mindMapOverlay.hidden) {
      if (!isMindMapPresentationMode()) undoMindMapLastChange();
    } else {
      undoLastChange();
    }
    return;
  }
  const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s";
  if (isSave) {
    e.preventDefault();
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(() => scheduleSave(), 0);
  }
});

document.addEventListener("keyup", e => {
  setMemoLinkCursorMode(memoLinkModifierActiveFromKeyEvent(e));
});

window.addEventListener("blur", () => {
  setMemoLinkCursorMode(false);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) setMemoLinkCursorMode(false);
});

document.addEventListener("dragend", () => {
  if (state.isDraggingNote) suppressTreeClickAfterDrag();
  document.body.classList.remove("is-dragging");
  state.isDraggingNote = false;
  clearTreeDropHighlights();
  stopTreeAutoScroll();
});

document.addEventListener("selectionchange", () => {
  saveMemoFormatSelection();
  updateActiveMediaCaretFromSelection();
});

// ── ボタン / 入力バインド ─────────────────────────────────────────────────────

els.mobileMenuBtn?.addEventListener("click", e => {
  e.stopPropagation();
  toggleMobileMenu();
});
els.mobileMenuCloseBtn?.addEventListener("click", () => {
  closeMobileMenu();
  els.mobileMenuBtn?.focus();
});
els.noteListBtn?.addEventListener("click", e => {
  e.stopPropagation();
  if (els.noteGridOverlay?.hidden) openNoteGridOverlay();
  else closeNoteGridOverlay();
});
els.noteGridClose?.addEventListener("click", closeNoteGridOverlay);
els.noteGridOverlay?.addEventListener("click", e => {
  if (e.target === els.noteGridOverlay) closeNoteGridOverlay();
});
els.noteHistoryBtn?.addEventListener("click", e => {
  e.stopPropagation();
  if (els.noteHistoryOverlay?.hidden) openNoteHistoryOverlay();
  else closeNoteHistoryOverlay();
});
els.noteHistoryClose?.addEventListener("click", closeNoteHistoryOverlay);
els.noteHistoryClearBtn?.addEventListener("click", e => {
  e.stopPropagation();
  clearNoteHistory();
});
els.noteHistoryOverlay?.addEventListener("click", e => {
  if (e.target === els.noteHistoryOverlay) closeNoteHistoryOverlay();
});
els.noteGridItems?.addEventListener("click", e => {
  const item = e.target.closest(".note-grid-card");
  if (!item || item.classList.contains("is-editing")) return;
  const noteId = item.dataset.id;
  const action = e.target.closest("[data-action]")?.dataset.action;
  if (action === "delete") {
    e.stopPropagation();
    void deleteRootNoteFromGrid(noteId);
  } else if (action === "expand") {
    e.stopPropagation();
    showNoteChildrenPopover(e.target.closest("[data-action='expand']"), noteId);
  } else if (action === "open") {
    void openRootNoteFromList(noteId);
  }
});
els.noteTodoBtn?.addEventListener("click", e => {
  e.stopPropagation();
  if (els.noteTodoPanel?.hidden) openNoteTodoPanel();
  else closeNoteTodoPanel();
});
els.noteTodoClose?.addEventListener("click", closeNoteTodoPanel);
els.noteTodoPanel?.addEventListener("click", e => {
  if (e.target === els.noteTodoPanel) closeNoteTodoPanel();
});
els.noteTodoItems?.addEventListener("click", e => {
  const item = e.target.closest(".mindmap-list-item");
  if (!item) return;
  const todoId = item.dataset.id;
  const action = e.target.closest("[data-action]")?.dataset.action;
  if (action === "open-note") {
    e.stopPropagation();
    void openNoteFromTodo(todoId);
  } else if (action === "delete") {
    e.stopPropagation();
    void deleteTodo(todoId);
  } else if (action === "toggle") {
    e.stopPropagation();
    void toggleTodoDone(todoId);
  }
});
els.mobileMenuBackdrop.addEventListener("click", closeMobileMenu);
if (mobileMenuMql.addEventListener) {
  mobileMenuMql.addEventListener("change", e => {
    closeMobileMenu();
    closeNoteGridOverlay();
    closeNoteTodoPanel();
  });
} else {
  mobileMenuMql.addListener(e => {
    closeMobileMenu();
    closeNoteGridOverlay();
    closeNoteTodoPanel();
  });
}
setMobileMenuOpen(false);

els.titleInput.addEventListener("focus", () => setCollabPresence("title", { immediate: true }));
els.titleInput.addEventListener("input", () => {
  setCollabPresence("title");
  scheduleSave();
});
els.titleInput.addEventListener("blur", () => setCollabPresence("viewing"));
els.memoSettingsBtn?.addEventListener("click", e => {
  e.stopPropagation();
  toggleMemoSettingsPanel();
});
els.memoSettingsClose?.addEventListener("click", closeMemoSettingsPanel);
els.downloadNotesPdfBtn?.addEventListener("click", () => { closeMemoSettingsPanel(); downloadNotesAsPdf(); });
els.downloadNotesTxtBtn?.addEventListener("click", () => { closeMemoSettingsPanel(); downloadNotesAsTxt(); });
els.downloadNotesMdBtn?.addEventListener("click", () => { closeMemoSettingsPanel(); downloadNotesAsMarkdown(); });
els.noteToMindMapBtn?.addEventListener("click", () => {
  closeMemoSettingsPanel();
  convertSelectedNoteToMindMap();
});
els.memoTodoBtn?.addEventListener("click", () => {
  if (!state.selectedId) { showToast("先にメモを選択してください。"); return; }
  addNoteToTodoList(state.selectedId);
});
els.checkBtn.addEventListener("click", () => {
  if (!state.selectedId) { showToast("先にメモを選択してください。"); return; }
  toggleCheckedNote(state.selectedId);
});
renderMemoTextColorPalette();
renderMemoHighlightPalette();
setMemoFormatEnabled(false);
els.memoFormatToggleBtn?.addEventListener("pointerdown", e => {
  e.preventDefault();
});
els.memoFormatToggleBtn?.addEventListener("click", e => {
  e.stopPropagation();
  setMemoFormatPanelOpen(Boolean(els.memoFormatBar?.hidden));
});
els.memoFormatBar?.addEventListener("pointerdown", e => {
  if (e.target.closest("button")) e.preventDefault();
});
els.memoTextColorBtn?.addEventListener("click", e => {
  e.stopPropagation();
  closeMemoHighlightPalette();
  setMemoTextColorPaletteOpen(Boolean(els.memoTextColorPalette?.hidden));
});
els.memoHighlightBtn?.addEventListener("click", e => {
  e.stopPropagation();
  closeMemoTextColorPalette();
  setMemoHighlightPaletteOpen(Boolean(els.memoHighlightPalette?.hidden));
});
els.memoStrikeBtn?.addEventListener("click", e => {
  e.stopPropagation();
  closeMemoTextColorPalette();
  closeMemoHighlightPalette();
  applyMemoTextStyle({ strike: !getMemoStrikeForAction() });
});
els.memoSubheadingBtn?.addEventListener("click", e => {
  e.stopPropagation();
  closeMemoTextColorPalette();
  closeMemoHighlightPalette();
  const currentLevel = getMemoHeadingLevelForAction();
  const nextLevel = currentLevel === "subheading" ? "normal" : "subheading";
  applyMemoTextStyle({ headingLevel: nextLevel });
});
els.memoHeadingBtn?.addEventListener("click", e => {
  e.stopPropagation();
  closeMemoTextColorPalette();
  closeMemoHighlightPalette();
  const currentLevel = getMemoHeadingLevelForAction();
  const nextLevel = currentLevel === "heading" ? "normal" : "heading";
  applyMemoTextStyle({ headingLevel: nextLevel });
});

els.contentInput.addEventListener("focus", () => {
  els.contentInput.classList.add("is-focused");
  updateMemoFormatUiFromSelection();
  setCollabPresence("content", { immediate: true });
});
els.contentInput.addEventListener("click", () => {
  els.contentInput.classList.add("is-focused");
  updateMemoFormatUiFromSelection();
  setCollabPresence("content");
});
els.contentInput.addEventListener("blur", () => {
  els.contentInput.classList.remove("is-focused");
  clearActiveMediaCaret();
  setCollabPresence("viewing");
});
els.contentInput.addEventListener("compositionstart", () => { _isComposing = true; redirectMediaCaretTyping(); });
els.contentInput.addEventListener("compositionend",   () => { _isComposing = false; repairMediaCaretAfterEdit(); pruneEmptyMemoHeadingSpanAtCaret(); splitMemoHeadingSpanAtLineBreak(); stripNativeStickyFormatting(); tryApplyMemoHeadingShortcut(); tryApplyMemoStrikeShortcut(); tryApplyMemoColorShortcut(); tryApplyMemoHighlightShortcut(); tryApplyMemoClearFormatShortcut(); scheduleSave(); });
els.contentInput.addEventListener("keydown", rememberMediaCaretRepair);
els.contentInput.addEventListener("keydown", e => {
  if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key.length !== 1) return;
  redirectMediaCaretTyping();
});
els.contentInput.addEventListener("input", e => {
  setCollabPresence("content");
  repairMediaCaretAfterEdit();
  if (!_isComposing) {
    // IME変換中にDOMをいじると、ブラウザ側の変換中下線の管理が崩れて
    // 変換確定後も下線が残ってしまうことがあるため、変換確定後にまとめて行う。
    pruneEmptyMemoHeadingSpanAtCaret();
    splitMemoHeadingSpanAtLineBreak();
    stripNativeStickyFormatting();
    resetStickyHighlightIfLineEmptiedByDeletion(e.inputType);
    tryApplyMemoHeadingShortcut();
    tryApplyMemoStrikeShortcut();
    tryApplyMemoColorShortcut();
    tryApplyMemoHighlightShortcut();
    tryApplyMemoClearFormatShortcut();
  }
  updateEmptyState();
  updateMemoFormatUiFromSelection();
  if (!_isComposing) scheduleSave();
});
els.contentInput.addEventListener("keyup", e => {
  if (e.key === "Backspace" || e.key === "Delete") repairMediaCaretAfterEdit();
  updateMemoFormatUiFromSelection();
});
els.contentInput.addEventListener("scroll", renderCollabCaretFlags);
window.addEventListener("resize", renderCollabCaretFlags);

els.searchInput.addEventListener("input", renderTree);

els.newRootBtn .addEventListener("click", () => createNote(null));
els.undoBtn.addEventListener("click", undoLastChange);
els.noteAiBtn?.addEventListener("click", openNoteAiPanel);
els.noteAiClose?.addEventListener("click", closeNoteAiPanel);
els.noteAiPanel?.addEventListener("click", e => {
  if (e.target === els.noteAiPanel) closeNoteAiPanel();
});
els.noteAiGenerateBtn?.addEventListener("click", generateNoteWithAI);
els.noteAiPrompt?.addEventListener("keydown", e => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); generateNoteWithAI(); }
});
els.deleteBtn.addEventListener("click", () => {
  closeMemoSettingsPanel();
  deleteSelectedNote();
});
els.largeEditorBtn.addEventListener("click", () => {
  closeMemoSettingsPanel();
  toggleLargeEditor();
});

// ── メディア添付 ──────────────────────────────────────────────────────────────

els.mediaBtn.addEventListener("click", () => {
  if (!state.selectedId) { showToast("先にメモを選択してください。"); return; }
  closeMemoSettingsPanel();
  els.mediaInput.click();
});
els.mediaInput.addEventListener("change", e => {
  if (!state.selectedId) return;
  uploadMedia(state.selectedId, e.target.files);
  e.target.value = "";
});

els.editorArea.addEventListener("dragover", e => {
  if (!e.dataTransfer.types.includes("Files")) return;
  e.preventDefault();
  els.editorArea.classList.add("media-drag-over");
});
els.editorArea.addEventListener("dragleave", e => {
  if (!els.editorArea.contains(e.relatedTarget))
    els.editorArea.classList.remove("media-drag-over");
});
els.editorArea.addEventListener("drop", e => {
  if (state.isDraggingNote) { e.preventDefault(); return; }
  if (!e.dataTransfer.files.length) return;
  e.preventDefault();
  els.editorArea.classList.remove("media-drag-over");
  if (!state.selectedId) { showToast("先にメモを選択してください。"); return; }
  uploadMedia(state.selectedId, e.dataTransfer.files);
});

els.contentInput.addEventListener("paste", e => {
  const items      = [...(e.clipboardData?.items ?? [])];
  const mediaItems = items.filter(i => i.type.startsWith("image/") || i.type.startsWith("video/"));
  if (mediaItems.length > 0) {
    e.preventDefault();
    if (!state.selectedId) { showToast("先にメモを選択してください。"); return; }
    uploadMedia(state.selectedId, mediaItems.map(i => i.getAsFile()).filter(Boolean));
    return;
  }
  const text = e.clipboardData.getData("text/plain");
  if (text) {
    e.preventDefault();
    insertLinkedTextAtMemoSelection(text);
  }
});

// ── Auth UI ───────────────────────────────────────────────────────────────────

let authMode = "login";
let authFlowInProgress = false;

const EMAIL_VERIFICATION_REQUIRED =
  "メールアドレスの確認が必要です。送信したメール内のリンクを開いて認証を完了してからログインしてください。メールが届かない場合は迷惑メールフォルダを確認してください。";
const EMAIL_VERIFICATION_SENT =
  "確認メールを送信しました。メール内のリンクで認証を完了してからログインしてください。メールが届かない場合は迷惑メールフォルダを確認してください。";
const EMAIL_DELIVERY_HELP =
  "メールが届かない場合は迷惑メールフォルダを確認してください。";

const AUTH_ERROR_MESSAGES = {
  "auth/email-already-in-use":   "このメールアドレスは既に登録されています。",
  "auth/invalid-email":          "メールアドレスの形式が正しくありません。",
  "auth/user-disabled":          "このアカウントは無効化されています。",
  "auth/user-not-found":         "メールアドレスまたはパスワードが正しくありません。",
  "auth/wrong-password":         "メールアドレスまたはパスワードが正しくありません。",
  "auth/invalid-credential":     "メールアドレスまたはパスワードが正しくありません。",
  "auth/missing-password":       "パスワードを入力してください。",
  "auth/weak-password":          "パスワードは6文字以上で入力してください。",
  "auth/too-many-requests":      "試行回数が多すぎます。しばらくしてからお試しください。",
  "auth/network-request-failed": "通信に失敗しました。ネットワークをご確認ください。",
  "auth/requires-recent-login":  "セキュリティのため、再度ログインしてからお試しください。",
  "auth/unauthorized-continue-uri": "確認メールの戻り先ドメインがFirebaseで許可されていません。管理者はFirebase AuthenticationのAuthorized domainsに現在のドメインを追加してください。",
  "auth/account-exists-with-different-credential": "このメールアドレスは既にパスワードでの登録があります。パスワードでログインしてください。",
  "auth/unauthorized-domain": "このドメインはFirebaseで許可されていません。管理者はFirebase AuthenticationのAuthorized domainsに現在のドメインを追加してください。",
  "auth/popup-blocked": "ポップアップがブロックされました。ブラウザの設定を確認するか、もう一度お試しください。",
};

function translateAuthError(err) {
  return AUTH_ERROR_MESSAGES[err?.code] || err?.message || "エラーが発生しました。";
}

function showAuthError(message) {
  els.authInfo.hidden       = true;
  els.authError.textContent = message;
  els.authError.hidden      = false;
}

function showAuthInfo(message) {
  els.authError.hidden     = true;
  els.authInfo.textContent = message;
  els.authInfo.hidden      = false;
}

function showVerificationStatus(message) {
  els.authVerifyStatus.textContent = message;
  els.authVerifyStatus.hidden = false;
}

function updatePasswordVisibility() {
  els.authPassword.type = els.authShowPassword.checked ? "text" : "password";
}

function showAuthScreen() {
  els.appShell.hidden    = true;
  els.authOverlay.hidden = false;
  els.authDialog.classList.remove("is-verifying");
  els.authVerifyPanel.hidden = true;
  els.authNotConfigured.hidden = true;
  setAuthMode("login");
  if (!window.FIREBASE_READY) {
    els.authNotConfigured.hidden = false;
    els.authFormWrap.hidden      = true;
  }
}

function showApp() {
  els.authOverlay.hidden = true;
  els.appShell.hidden    = false;
}

function showVerificationScreen(user, message = EMAIL_VERIFICATION_REQUIRED) {
  els.appShell.hidden = true;
  els.authOverlay.hidden = false;
  els.authDialog.classList.add("is-verifying");
  els.authNotConfigured.hidden = true;
  els.authFormWrap.hidden = true;
  els.authVerifyPanel.hidden = false;
  els.authTitle.textContent = "アカウント";
  els.authVerifyEmail.textContent = user?.email || "";
  els.authVerifyStatus.hidden = true;
  if (message) showVerificationStatus(message);
}

function setAuthMode(mode) {
  authMode = mode;
  els.authDialog.classList.remove("is-verifying");
  els.authVerifyPanel.hidden = true;
  els.authFormWrap.hidden = false;
  els.authError.hidden = true;
  els.authInfo.hidden  = true;
  els.authTabs.forEach(tab => tab.classList.toggle("active", tab.dataset.authTab === mode));

  if (mode === "forgot") {
    els.authTitle.textContent      = "パスワード再設定";
    els.authPasswordField.hidden   = true;
    els.authPassword.required      = false;
    els.authShowPasswordField.hidden = true;
    els.authShowPassword.checked   = false;
    updatePasswordVisibility();
    els.authRememberField.hidden   = true;
    els.authSubmitBtn.textContent  = "再設定メールを送信";
    els.authForgotLink.hidden      = true;
    els.authBackToLoginLink.hidden = false;
  } else {
    els.authTitle.textContent      = mode === "register" ? "新規登録" : "ログイン";
    els.authPasswordField.hidden   = false;
    els.authPassword.required      = true;
    els.authShowPasswordField.hidden = false;
    els.authRememberField.hidden   = false;
    els.authSubmitBtn.textContent  = mode === "register" ? "登録" : "ログイン";
    els.authForgotLink.hidden      = mode !== "login";
    els.authBackToLoginLink.hidden = true;
  }
}

function applyAuthPersistence() {
  const persistence = els.authRemember.checked
    ? firebase.auth.Auth.Persistence.LOCAL
    : firebase.auth.Auth.Persistence.SESSION;
  return auth.setPersistence(persistence);
}

function emailActionSettings() {
  return {
    url: `${window.location.origin}/`,
    handleCodeInApp: false,
  };
}

function isUnauthorizedContinueUriError(error) {
  return error?.code === "auth/unauthorized-continue-uri";
}

function sendVerificationEmail(user) {
  return user.sendEmailVerification(emailActionSettings()).catch(error => {
    if (isUnauthorizedContinueUriError(error)) {
      return user.sendEmailVerification();
    }
    throw error;
  });
}

function sendPasswordResetEmail(email) {
  return auth.sendPasswordResetEmail(email, emailActionSettings()).catch(error => {
    if (isUnauthorizedContinueUriError(error)) {
      return auth.sendPasswordResetEmail(email);
    }
    throw error;
  });
}

async function resendVerificationSilently(user) {
  if (!user || user.emailVerified) return true;
  try {
    await sendVerificationEmail(user);
    return true;
  } catch (e) {
    if (e?.code === "auth/too-many-requests") return false;
    throw e;
  }
}

function updateAccountUI(user) {
  if (!user) return;
  const needsVerification = !user.emailVerified;
  els.accountMenuName.textContent   = user.displayName || "（表示名未設定）";
  els.accountMenuEmail.textContent  = user.email || "";
  els.accountMenuStatus.textContent = needsVerification ? "⚠️ メール未確認" : "✅ メール確認済み";
  els.resendVerificationBtn.hidden  = !needsVerification;
  els.refreshStatusBtn.hidden       = !needsVerification;
  if (els.appAccountName) els.appAccountName.textContent = user.displayName || "（表示名未設定）";
  if (els.appAccountEmail) els.appAccountEmail.textContent = user.email || "";
  if (els.appAccountStatus) {
    els.appAccountStatus.textContent = needsVerification ? "メール未確認" : "メール確認済み";
  }
  if (els.appAccountResendVerificationBtn) {
    els.appAccountResendVerificationBtn.hidden = !needsVerification;
  }
  if (els.appAccountRefreshStatusBtn) {
    els.appAccountRefreshStatusBtn.hidden = !needsVerification;
  }
}

function showDisplayNameEditor() {
  const user = auth.currentUser;
  els.displayNameInput.value    = user?.displayName || "";
  els.accountMenuName.hidden    = true;
  els.editDisplayNameBtn.hidden = true;
  els.displayNameEditRow.hidden = false;
  els.displayNameInput.focus();
}

function hideDisplayNameEditor() {
  els.displayNameEditRow.hidden = true;
  els.accountMenuName.hidden    = false;
  els.editDisplayNameBtn.hidden = false;
}

async function handleSaveDisplayName() {
  const user = auth.currentUser;
  if (!user) return;
  const name = els.displayNameInput.value.trim();
  els.displayNameSaveBtn.disabled   = true;
  els.displayNameCancelBtn.disabled = true;
  try {
    await user.updateProfile({ displayName: name || null });
    updateAccountUI(user);
    hideDisplayNameEditor();
    showToast("表示名を変更しました。");
  } catch (err) {
    showToast(translateAuthError(err));
  } finally {
    els.displayNameSaveBtn.disabled   = false;
    els.displayNameCancelBtn.disabled = false;
  }
}

async function handleResendVerification() {
  els.accountMenu.hidden = true;
  try {
    const user = auth.currentUser;
    if (!user) return;
    await user.reload();
    if (user.emailVerified) {
      updateAccountUI(user);
      showApp();
      try {
        await loadSignedInWorkspace(user);
      } catch (e) { showToast(e.message); }
      showToast("メール確認済みです。");
      return;
    }
    await sendVerificationEmail(user);
    if (!els.authVerifyPanel.hidden) showVerificationStatus(`確認メールを送信しました。${EMAIL_DELIVERY_HELP}`);
    showToast("確認メールを送信しました。");
  } catch (e) { showToast(translateAuthError(e)); }
}

async function handleRefreshStatus() {
  try {
    const user = auth.currentUser;
    if (!user) return;
    await user.reload();
    updateAccountUI(user);
    if (user.emailVerified) {
      showApp();
      try {
        await loadSignedInWorkspace(user);
      } catch (e) { showToast(e.message); }
      showToast("メール確認済みです。");
    } else {
      showVerificationScreen(user, "まだメール確認が完了していません。メールのリンクを開いてから更新してください。");
      showToast("まだメール確認が完了していません。");
    }
  } catch (e) { showToast(translateAuthError(e)); }
}

async function handleLogout() {
  els.accountMenu.hidden = true;
  state.unlockedNoteIds.clear();
  closeNoteLockPrompt(false);
  try {
    await auth.signOut();
  } catch (e) { showToast(translateAuthError(e)); }
}

async function handleDeleteAccount(e) {
  e?.preventDefault();
  console.log("[deleteAccount] clicked");
  els.accountMenu.hidden = true;

  const ok = await showConfirm(
    "アカウントを削除します。すべてのメモ・メディアが完全に削除され、元に戻せません。本当に削除しますか？",
    "削除する"
  );
  if (!ok) {
    console.log("[deleteAccount] cancelled by user");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    console.error("[deleteAccount] auth.currentUser is null");
    showToast("ログイン情報が確認できません。再度ログインしてください。");
    return;
  }

  els.deleteAccountBtn.disabled = true;
  console.log("[deleteAccount] starting deletion for uid:", user.uid);

  try {
    const userRef = db.collection("users").doc(user.uid);

    console.log("[deleteAccount] deleting users/{uid}/notes ...");
    await deleteCollectionInBatches(userRef.collection("notes"));
    console.log("[deleteAccount] notes deleted");

    console.log("[deleteAccount] deleting users/{uid}/templates ...");
    await deleteCollectionInBatches(userRef.collection("templates"));
    console.log("[deleteAccount] templates deleted");

    console.log("[deleteAccount] deleting users/{uid}/mindmaps ...");
    await deleteCollectionInBatches(userRef.collection("mindmaps"));
    console.log("[deleteAccount] mindmaps deleted");

    console.log("[deleteAccount] deleting users/{uid}/todos ...");
    await deleteCollectionInBatches(userRef.collection("todos"));
    console.log("[deleteAccount] todos deleted");

    console.log("[deleteAccount] deleting users/{uid} document ...");
    await userRef.delete().catch(err => console.warn("[deleteAccount] users/{uid} doc delete error:", err));
    console.log("[deleteAccount] user document deleted");

    console.log("[deleteAccount] deleting auth user ...");
    await user.delete();
    console.log("[deleteAccount] auth user deleted");

    await clearCollabPresence();
    stopWorkspaceSnapshots();
    clearSavedCollabRoom(user.uid);
    state.uid = null;
    state.collabRoomId = null;
    state.collabRoomLabel = "";
    state.collabRoomRole = null;
    resetMindMapState();
    showAuthScreen();
    updateCollabUI();
    showToast("アカウントを削除しました。");
  } catch (err) {
    console.error("[deleteAccount] failed:", err);
    if (err && err.code === "auth/requires-recent-login") {
      showToast("安全のため、もう一度ログインしてからアカウント削除を実行してください。");
    } else {
      showToast(translateAuthError(err));
    }
  } finally {
    els.deleteAccountBtn.disabled = false;
    console.log("[deleteAccount] finished");
  }
}

async function handleDeleteUnverifiedAccount() {
  const ok = await showConfirm(
    "アカウントを削除します。元に戻せません。本当に削除しますか？",
    "削除する"
  );
  if (!ok) return;
  try {
    const user = auth.currentUser;
    if (!user) return;
    await user.delete();
    showToast("アカウントを削除しました。");
  } catch (e) { showToast(translateAuthError(e)); }
}

if (auth) {
  els.authTabs.forEach(tab => {
    tab.addEventListener("click", () => setAuthMode(tab.dataset.authTab));
  });
  els.authShowPassword.addEventListener("change", updatePasswordVisibility);
  els.authForgotLink.addEventListener("click", () => setAuthMode("forgot"));
  els.authBackToLoginLink.addEventListener("click", () => setAuthMode("login"));

  els.authGoogleBtn?.addEventListener("click", async () => {
    els.authError.hidden = true;
    els.authInfo.hidden  = true;
    els.authGoogleBtn.disabled = true;
    authFlowInProgress = true;
    try {
      await applyAuthPersistence();
      await auth.signInWithRedirect(createGoogleAuthProvider());
      // ここから先はGoogleのメールが検証済みなので、確認メール待ち画面には行かず
      // onAuthStateChangedが通常のアプリ起動フローへ進める。
    } catch (err) {
      handleGoogleSignInError(err);
    } finally {
      authFlowInProgress = false;
      els.authGoogleBtn.disabled = false;
    }
  });

  els.authForm.addEventListener("submit", async e => {
    e.preventDefault();
    els.authError.hidden = true;
    els.authInfo.hidden  = true;

    const email    = els.authEmail.value.trim();
    const password = els.authPassword.value;

    els.authSubmitBtn.disabled = true;
    authFlowInProgress = true;
    try {
      if (authMode === "forgot") {
        await sendPasswordResetEmail(email);
        showAuthInfo(`再設定メールを送信しました。${EMAIL_DELIVERY_HELP}`);
      } else {
        await applyAuthPersistence();
        if (authMode === "register") {
          const cred = await auth.createUserWithEmailAndPassword(email, password);
          await sendVerificationEmail(cred.user);
          showVerificationScreen(cred.user, EMAIL_VERIFICATION_SENT);
        } else {
          const cred = await auth.signInWithEmailAndPassword(email, password);
          await cred.user.reload();
          if (!cred.user.emailVerified) {
            const resent = await resendVerificationSilently(cred.user);
            showVerificationScreen(
              cred.user,
              resent
                ? `${EMAIL_VERIFICATION_REQUIRED} 確認メールを再送しました。`
                : `${EMAIL_VERIFICATION_REQUIRED} 確認メールは送信済みです。時間を置いてからもう一度お試しください。`
            );
            return;
          }
        }
      }
    } catch (err) {
      if (auth.currentUser && !auth.currentUser.emailVerified) {
        showVerificationScreen(auth.currentUser, translateAuthError(err));
      } else {
        showAuthError(translateAuthError(err));
      }
    } finally {
      authFlowInProgress = false;
      els.authSubmitBtn.disabled = false;
    }
  });

  els.accountBtn.addEventListener("click", () => openAppAccountFromAnchor(els.accountBtn));
  els.mindMapAccountBtn?.addEventListener("click", () => openAppAccountFromAnchor(els.mindMapAccountBtn));
  els.editDisplayNameBtn.addEventListener("click", showDisplayNameEditor);
  els.displayNameCancelBtn.addEventListener("click", hideDisplayNameEditor);
  els.displayNameSaveBtn.addEventListener("click", handleSaveDisplayName);
  els.displayNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveDisplayName();
    } else if (e.key === "Escape") {
      e.preventDefault();
      hideDisplayNameEditor();
    }
  });
  els.resendVerificationBtn.addEventListener("click", handleResendVerification);
  els.refreshStatusBtn.addEventListener("click", handleRefreshStatus);
  els.logoutBtn.addEventListener("click", handleLogout);
  els.deleteAccountBtn.addEventListener("click", handleDeleteAccount);
  els.appAccountEditDisplayNameBtn?.addEventListener("click", showAppAccountNameEditor);
  els.appAccountDisplayNameCancelBtn?.addEventListener("click", hideAppAccountNameEditor);
  els.appAccountDisplayNameSaveBtn?.addEventListener("click", handleSaveAppAccountDisplayName);
  els.appAccountDisplayNameInput?.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveAppAccountDisplayName();
    } else if (e.key === "Escape") {
      e.preventDefault();
      hideAppAccountNameEditor();
    }
  });
  els.appAccountResendVerificationBtn?.addEventListener("click", handleResendVerification);
  els.appAccountRefreshStatusBtn?.addEventListener("click", handleRefreshStatus);
  els.appAccountLogoutBtn?.addEventListener("click", () => {
    closeAppManagement();
    handleLogout();
  });
  els.appAccountDeleteBtn?.addEventListener("click", e => {
    closeAppManagement();
    handleDeleteAccount(e);
  });
  els.claudeConnectStartBtn?.addEventListener("click", handleClaudeConnectStart);
  els.claudeConnectRevokeBtn?.addEventListener("click", handleClaudeConnectRevoke);
  els.claudeConnectCopyBtn?.addEventListener("click", handleClaudeConnectCopy);
  els.authVerifyResendBtn.addEventListener("click", handleResendVerification);
  els.authVerifyRefreshBtn.addEventListener("click", handleRefreshStatus);
  els.authVerifyLogoutBtn.addEventListener("click", handleLogout);
  els.authVerifyDeleteBtn.addEventListener("click", handleDeleteUnverifiedAccount);

  void handleGoogleRedirectResult();
}

// ── Boot ──────────────────────────────────────────────────────────────────────

if (!auth) {
  showAuthScreen();
} else {
  auth.onAuthStateChanged(async user => {
    if (user) {
      try {
        await user.reload();
      } catch (e) {
        showAuthScreen();
        showAuthError(translateAuthError(e));
        return;
      }

      if (!user.emailVerified) {
        showVerificationScreen(user);
        updateAccountUI(user);
        return;
      }

      showApp();
      updateAccountUI(user);
      try {
        await loadSignedInWorkspace(user);
      } catch (e) { showToast(e.message); }
    } else {
      void clearCollabPresence();
      stopWorkspaceSnapshots();
      state.uid = null;
      state.collabRoomId = null;
      state.collabRoomLabel = "";
      state.collabRoomRole = null;
      state.unlockedNoteIds.clear();
      closeNoteLockPrompt(false);
      resetMindMapState();
      updateCollabUI();
      showAuthScreen();
    }
  });
}
