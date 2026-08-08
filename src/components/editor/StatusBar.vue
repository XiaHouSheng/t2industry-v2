<script setup>
/**
 * StatusBar — 底部状态栏
 * 展示当前工具 / 画布缩放 / 选中机器与快捷键提示。
 */
import { computed } from "vue";
import { useStorageStore } from "@/engine/plugin/api.js";
import {
  useEditorStore,
  TOOL_SELECT,
  TOOL_BELT,
  TOOL_PIPE,
  TOOL_MACHINE,
  TOOL_NODE,
} from "@/stores/EditorStore.js";

const storageStore = useStorageStore();
const editorStore = useEditorStore();

// 节点类型显示名
const NODE_LABELS = { split: "分流", merge: "合流", cross: "十字" };

const toolLabel = computed(() => {
  switch (editorStore.currentTool) {
    case TOOL_SELECT:
      return "选择";
    case TOOL_BELT:
      return "传送带";
    case TOOL_PIPE:
      return "管道";
    case TOOL_MACHINE:
      return editorStore.activeMachineType || "放置机器";
    case TOOL_NODE: {
      const n = editorStore.activeNodeType;
      if (!n) return "放置节点";
      const kind = n.kind === "belt" ? "传送带" : "管道";
      return `节点 · ${NODE_LABELS[n.type] || n.type}(${kind})`;
    }
    default:
      return "—";
  }
});

const selectedLabel = computed(() => {
  const m = editorStore.selectedMachine;
  if (!m) return "未选中";
  return `${m.name} @ (${m.gridX}, ${m.gridY})`;
});

const scalePercent = computed(() => Math.round(storageStore.scale * 100));
</script>

<template>
  <footer class="statusbar">
    <div class="status-item">
      <span class="status-label">工具</span>
      <span class="status-value">{{ toolLabel }}</span>
    </div>
    <div class="status-item">
      <span class="status-label">缩放</span>
      <span class="status-value">{{ scalePercent }}%</span>
    </div>
    <div class="status-item">
      <span class="status-label">选中</span>
      <span class="status-value">{{ selectedLabel }}</span>
    </div>

    <div class="hints">
      <kbd>E</kbd> 传送带
      <kbd>Q</kbd> 管道
      <kbd>X</kbd> 选择
      <kbd>R</kbd> 旋转
      <kbd>F</kbd> 删除
      <kbd>Esc</kbd> 取消
      <kbd>Ctrl+S</kbd> 保存
    </div>
  </footer>
</template>

<style scoped>
.statusbar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 14px;
  background: var(--bg-1);
  border-top: 1px solid var(--border);
  font-size: 11px;
  color: var(--text-dim);
  user-select: none;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-label {
  color: var(--text-faint);
}

.status-value {
  color: var(--text);
}

.hints {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  color: var(--text-faint);
  white-space: nowrap;
  overflow: hidden;
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
</style>
