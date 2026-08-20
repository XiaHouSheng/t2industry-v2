<script setup>
/**
 * TopBar — 顶部工具栏
 * 左侧：品牌 + 蓝图选择下拉（可切换/新建/删除）；
 * 中部：放置工具（选择/传送带/管道）；
 * 右侧：蓝图文件操作与视图控制。全部经由引擎门面 api.js 调用。
 */
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import {
  useStorageStore,
  addBlueprintLocal,
  clearBlueprintLocal,
  deleteBlueprintLocal,
  selectBlueprintLocal,
  changeBlueprintNameLocal,
  exportBlueprintToFile,
  loadBlueprintFromFile,
  saveBlueprintLocal,
  resetPosition,
  resetScale,
  handleKeyboard,
} from "@/engine/plugin/api.js";
import {
  useEditorStore,
  TOOL_SELECT,
  TOOL_BELT,
  TOOL_PIPE,
} from "@/stores/EditorStore.js";
import { setLocale } from "@/i18n/index.js";

const { t, locale } = useI18n();
const storageStore = useStorageStore();
const editorStore = useEditorStore();

const currentBlueprint = computed(
  () => storageStore.blueprints[storageStore.current_blueprint] || null,
);

const blueprintList = computed(() => Object.values(storageStore.blueprints));

/* ---------- 蓝图下拉 ---------- */

const bpOpen = ref(false);

function toggleBp() {
  bpOpen.value = !bpOpen.value;
}

function closeBp() {
  bpOpen.value = false;
}

function onSelectBp(id) {
  selectBlueprintLocal(id);
  closeBp();
}

function onNewBlueprint() {
  const name = window.prompt(t("topbar.newBlueprintPrompt"), t("topbar.newBlueprintDefault"));
  if (name && name.trim()) {
    addBlueprintLocal(name.trim());
    closeBp();
  }
}

function onRenameBp(bp) {
  const name = window.prompt(
    t("topbar.renameBlueprintPrompt", { name: bp.name }),
    bp.name,
  );
  if (name && name.trim()) {
    changeBlueprintNameLocal(bp.id, name.trim());
  }
}

function onDeleteBp(bp) {
  const hint =
    blueprintList.value.length > 1
      ? t("topbar.deleteConfirm", { name: bp.name })
      : t("topbar.deleteLastConfirm");
  if (window.confirm(hint)) {
    deleteBlueprintLocal(bp.id);
    closeBp();
  }
}

/* 点击外部关闭下拉 */
function onDocClick() {
  closeBp();
}

onMounted(() => document.addEventListener("click", onDocClick));
onUnmounted(() => document.removeEventListener("click", onDocClick));

/* ---------- 放置工具 ---------- */

const toolList = [
  { tool: TOOL_SELECT, labelKey: "tools.select", key: "X" },
  { tool: TOOL_BELT, labelKey: "tools.belt", key: "E" },
  { tool: TOOL_PIPE, labelKey: "tools.pipe", key: "Q" },
];

function pickTool(tool) {
  const keyMap = {
    [TOOL_SELECT]: "x",
    [TOOL_BELT]: "e",
    [TOOL_PIPE]: "q",
  };
  handleKeyboard({ key: keyMap[tool] });
  editorStore.setTool(tool);
}

/* ---------- 蓝图操作 ---------- */

function onClearBlueprint() {
  if (window.confirm(t("topbar.clearConfirm"))) clearBlueprintLocal();
}

function onResetView() {
  resetScale();
  resetPosition();
}

/* ---------- 语言切换 ---------- */

function toggleLang() {
  setLocale(locale.value === "zh-CN" ? "en-US" : "zh-CN");
}
</script>

<template>
  <header class="topbar">
    <div class="brand">
      <img
        class="brand-mark"
        :src="`https://cdn.t2blueprint.xyz/image/resources/logo_256px_transparent.png`"
        alt="T2·工业"
      />
      <span class="brand-name">{{ t("topbar.brand") }}</span>
    </div>

    <!-- 蓝图选择下拉 -->
    <div class="bp-drop" @click.stop>
      <button class="bp-trigger" @click="toggleBp">
        <span class="bp-label">{{ t("topbar.blueprint") }}</span>
        <span class="bp-name">{{ currentBlueprint?.name || "未命名" }}</span>
        <svg
          class="bp-chevron"
          :class="{ open: bpOpen }"
          width="10"
          height="10"
          viewBox="0 0 10 10"
        >
          <path d="M2 3.5 L5 6.5 L8 3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </button>

      <div v-show="bpOpen" class="bp-menu">
        <div
          v-for="bp in blueprintList"
          :key="bp.id"
          class="bp-item"
          :class="{ active: bp.id === storageStore.current_blueprint }"
        >
          <button class="bp-select" @click="onSelectBp(bp.id)">
            <span class="bp-dot"></span>
            <span class="bp-item-name">{{ bp.name }}</span>
          </button>
          <button
            class="bp-rename"
            :title="t('topbar.renameBlueprint')"
            @click="onRenameBp(bp)"
          >
            ✎
          </button>
          <button
            class="bp-del"
            :title="t('topbar.deleteBlueprint')"
            @click="onDeleteBp(bp)"
          >
            ×
          </button>
        </div>

        <div class="bp-menu-actions">
          <button class="ui-btn bp-new" @click="onNewBlueprint">
            + {{ t("topbar.newBlueprint") }}
          </button>
        </div>
      </div>
    </div>

    <div class="tools">
      <span class="tool-label">{{ t("topbar.tools") }}</span>
      <button
        v-for="item in toolList"
        :key="item.tool"
        class="tool-btn"
        :class="{ active: editorStore.currentTool === item.tool }"
        @click="pickTool(item.tool)"
      >
        <span>{{ t(item.labelKey) }}</span>
        <kbd>{{ item.key }}</kbd>
      </button>
    </div>

    <div class="actions">
      <button
        class="ui-btn"
        :title="t('topbar.lang')"
        @click="toggleLang"
      >
        {{ locale === "zh-CN" ? "EN" : "中文" }}
      </button>
      <button class="ui-btn" title="Ctrl+S" @click="saveBlueprintLocal()">
        {{ t("topbar.save") }}
      </button>
      <button class="ui-btn" @click="onClearBlueprint()">
        {{ t("topbar.clear") }}
      </button>
      <span class="divider"></span>
      <button class="ui-btn" @click="loadBlueprintFromFile()">
        {{ t("topbar.import") }}
      </button>
      <button class="ui-btn" @click="exportBlueprintToFile()">
        {{ t("topbar.export") }}
      </button>
      <span class="divider"></span>
      <button class="ui-btn" @click="onResetView()">
        {{ t("topbar.resetView") }}
      </button>
      <span class="divider"></span>
      <a
        class="ui-btn gh-btn"
        href="https://github.com/XiaHouSheng/t2industry-v2"
        target="_blank"
        rel="noopener noreferrer"
        :title="t('topbar.githubV2')"
      >
        <svg class="gh-icon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
        </svg>
        <span>GitHub</span>
      </a>
      <a
        class="ui-btn gh-btn"
        href="https://github.com/XiaHouSheng/T2EngineCore"
        target="_blank"
        rel="noopener noreferrer"
        :title="t('topbar.githubEngine')"
      >
        <svg class="gh-icon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
        </svg>
        <span>{{ t("topbar.coreEngine") }}</span>
      </a>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 14px;
  background: var(--bg-1);
  border-bottom: 1px solid var(--border);
  user-select: none;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-mark {
  width: 44px;
  height: 44px;
  border-radius: 5px;
  object-fit: contain;
}

.brand-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0.4px;
  white-space: nowrap;
}

/* ---------- 蓝图下拉 ---------- */

.bp-drop {
  position: relative;
}

.bp-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: 5px;
  color: var(--text-dim);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.bp-trigger:hover {
  background: var(--bg-3);
  border-color: var(--border-strong);
}

.bp-label {
  font-size: 11px;
  color: var(--text-faint);
}

.bp-name {
  font-size: 12px;
  color: var(--accent);
  font-weight: 600;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bp-chevron {
  color: var(--text-faint);
  transition: transform 0.15s;
}

.bp-chevron.open {
  transform: rotate(180deg);
}

.bp-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 20;
  min-width: 220px;
  padding: 6px;
  background: rgba(21, 24, 29, 0.97);
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
}

.bp-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px;
  border-radius: 5px;
}

.bp-item:hover {
  background: var(--bg-2);
}

.bp-item.active {
  background: var(--accent-dim);
}

.bp-select {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 5px 8px;
  background: transparent;
  border: none;
  color: var(--text-dim);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.bp-select:hover {
  color: var(--text);
}

.bp-item.active .bp-select {
  color: var(--accent-strong);
}

.bp-dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--border-strong);
}

.bp-item.active .bp-dot {
  background: var(--accent);
}

.bp-item-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bp-del {
  flex: none;
  width: 22px;
  height: 22px;
  display: none;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text-faint);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

.bp-rename {
  flex: none;
  width: 22px;
  height: 22px;
  display: none;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text-faint);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
}

.bp-item:hover .bp-del,
.bp-item:hover .bp-rename {
  display: flex;
}

.bp-rename:hover {
  background: var(--accent-dim);
  color: var(--accent-strong);
}

.bp-del:hover {
  background: var(--danger-dim, rgba(220, 60, 60, 0.15));
  color: #ff7a7a;
}

.bp-menu-actions {
  margin-top: 4px;
  padding-top: 6px;
  border-top: 1px solid var(--border);
}

.bp-new {
  width: 100%;
}

/* ---------- 工具区 ---------- */

.tools {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: 6px;
}

.tool-label {
  font-size: 11px;
  color: var(--text-faint);
  margin-right: 2px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: var(--text-dim);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.tool-btn:hover {
  background: var(--bg-3);
  color: var(--text);
}

.tool-btn.active {
  background: var(--accent-dim);
  border-color: var(--accent);
  color: var(--accent-strong);
}

kbd {
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 1px 5px;
  background: var(--bg-0);
  border: 1px solid var(--border-strong);
  border-radius: 3px;
  color: var(--text-dim);
}

/* ---------- 右侧操作区 ---------- */

.actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.divider {
  width: 1px;
  height: 18px;
  background: var(--border);
  margin: 0 4px;
}

/* ---------- GitHub 跳转 ---------- */

.gh-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
}

.gh-icon {
  flex: none;
}
</style>
