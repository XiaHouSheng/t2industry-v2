<script setup>
/**
 * TopBar — 顶部工具栏
 * 左侧：品牌 + 当前蓝图；中部：放置工具（选择/传送带/管道）；
 * 右侧：蓝图文件操作与视图控制。全部经由引擎门面 api.js 调用。
 */
import { computed } from "vue";
import {
  useStorageStore,
  addBlueprintLocal,
  clearBlueprintLocal,
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

function onNewBlueprint() {
  const name = window.prompt("蓝图名称", "New Blueprint");
  if (name && name.trim()) addBlueprintLocal(name.trim());
}

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
      <span class="brand-mark"></span>
      <span class="brand-name">T2·工业蓝图编辑器</span>
    </div>

    <div class="blueprint">
      <span class="bp-label">蓝图</span>
      <span class="bp-name">{{ currentBlueprint?.name || "未命名" }}</span>
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
      <button class="ui-btn" @click="onNewBlueprint()">新建</button>
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
  width: 14px;
  height: 14px;
  border-radius: 3px;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
  box-shadow: 0 0 10px var(--accent-dim);
}

.brand-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0.4px;
  white-space: nowrap;
}

.blueprint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: 5px;
}

.bp-label {
  font-size: 11px;
  color: var(--text-faint);
}

.bp-name {
  font-size: 12px;
  color: var(--accent);
  font-weight: 600;
}

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
