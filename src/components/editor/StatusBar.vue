<script setup>
/**
 * StatusBar — 底部状态栏
 * 展示当前工具 / 画布缩放 / 选中机器与快捷键提示。
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useStorageStore } from "@/engine/plugin/api.js";
import {
  useEditorStore,
  TOOL_SELECT,
  TOOL_BELT,
  TOOL_PIPE,
  TOOL_MACHINE,
  TOOL_NODE,
} from "@/stores/EditorStore.js";

const { t } = useI18n();
const storageStore = useStorageStore();
const editorStore = useEditorStore();

const toolLabel = computed(() => {
  switch (editorStore.currentTool) {
    case TOOL_SELECT:
      return t("tools.select");
    case TOOL_BELT:
      return t("tools.belt");
    case TOOL_PIPE:
      return t("tools.pipe");
    case TOOL_MACHINE:
      return editorStore.activeMachineType || t("statusbar.toolPlaceMachine");
    case TOOL_NODE: {
      const n = editorStore.activeNodeType;
      if (!n) return t("statusbar.toolPlaceNode");
      const kind = n.kind === "belt" ? t("tools.belt") : t("tools.pipe");
      return t("statusbar.nodeLabel", { label: t(`nodes.${n.type}`), kind });
    }
    default:
      return "—";
  }
});

const selectedLabel = computed(() => {
  const m = editorStore.selectedMachine;
  if (!m) return t("statusbar.notSelected");
  return `${m.name} @ (${m.gridX}, ${m.gridY})`;
});

const scalePercent = computed(() => Math.round(storageStore.scale * 100));
</script>

<template>
  <footer class="statusbar">
    <div class="status-item">
      <span class="status-label">{{ t("statusbar.tool") }}</span>
      <span class="status-value">{{ toolLabel }}</span>
    </div>
    <div class="status-item">
      <span class="status-label">{{ t("statusbar.zoom") }}</span>
      <span class="status-value">{{ scalePercent }}%</span>
    </div>
    <div class="status-item">
      <span class="status-label">{{ t("statusbar.selected") }}</span>
      <span class="status-value">{{ selectedLabel }}</span>
    </div>

    <div class="hints">
      <kbd>E</kbd> {{ t("tools.belt") }}
      <kbd>Q</kbd> {{ t("tools.pipe") }}
      <kbd>X</kbd> {{ t("tools.select") }}
      <kbd>R</kbd> {{ t("statusbar.hintRotate") }}
      <kbd>F</kbd> {{ t("statusbar.hintDelete") }}
      <kbd>Esc</kbd> {{ t("statusbar.hintCancel") }}
      <kbd>Ctrl+S</kbd> {{ t("statusbar.hintSave") }}
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
