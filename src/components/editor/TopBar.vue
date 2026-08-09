<script setup>
/**
 * TopBar — 顶部工具栏
 * 左侧：品牌 + 蓝图选择下拉（可切换/新建/删除）；
 * 中部：放置工具（选择/传送带/管道）；
 * 右侧：蓝图文件操作与视图控制。全部经由引擎门面 api.js 调用。
 */
import { ref, computed, onMounted, onUnmounted } from "vue";
import {
  useStorageStore,
  addBlueprintLocal,
  clearBlueprintLocal,
  deleteBlueprintLocal,
  selectBlueprintLocal,
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
  const name = window.prompt("蓝图名称", "New Blueprint");
  if (name && name.trim()) {
    addBlueprintLocal(name.trim());
    closeBp();
  }
}

function onDeleteBp(bp) {
  const hint =
    blueprintList.value.length > 1
      ? `确定删除蓝图「${bp.name}」？`
      : `只剩最后一个蓝图，无法删除；将清空其内容，确定继续？`;
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
  { tool: TOOL_SELECT, label: "选择", key: "X" },
  { tool: TOOL_BELT, label: "传送带", key: "E" },
  { tool: TOOL_PIPE, label: "管道", key: "Q" },
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
  if (window.confirm("确定清空当前蓝图？")) clearBlueprintLocal();
}

function onResetView() {
  resetScale();
  resetPosition();
}
</script>

<template>
  <header class="topbar">
    <div class="brand">
      <img
        class="brand-mark"
        src="/resources/logo_256px_transparent.png"
        alt="T2·工业"
      />
    </div>

    <!-- 蓝图选择下拉 -->
    <div class="bp-drop" @click.stop>
      <button class="bp-trigger" @click="toggleBp">
        <span class="bp-label">蓝图</span>
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
            class="bp-del"
            title="删除蓝图"
            @click="onDeleteBp(bp)"
          >
            ×
          </button>
        </div>

        <div class="bp-menu-actions">
          <button class="ui-btn bp-new" @click="onNewBlueprint">+ 新建蓝图</button>
        </div>
      </div>
    </div>

    <div class="tools">
      <span class="tool-label">工具</span>
      <button
        v-for="item in toolList"
        :key="item.tool"
        class="tool-btn"
        :class="{ active: editorStore.currentTool === item.tool }"
        @click="pickTool(item.tool)"
      >
        <span>{{ item.label }}</span>
        <kbd>{{ item.key }}</kbd>
      </button>
    </div>

    <div class="actions">
      <button class="ui-btn" title="Ctrl+S" @click="saveBlueprintLocal()">保存</button>
      <button class="ui-btn" @click="onClearBlueprint()">清空</button>
      <span class="divider"></span>
      <button class="ui-btn" @click="loadBlueprintFromFile()">导入</button>
      <button class="ui-btn" @click="exportBlueprintToFile()">导出</button>
      <span class="divider"></span>
      <button class="ui-btn" @click="onResetView()">复位视图</button>
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

.bp-item:hover .bp-del {
  display: flex;
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
</style>
