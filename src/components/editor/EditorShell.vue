<script setup>
/**
 * EditorShell — 编辑器整体布局
 *
 * 作为 UI 层与引擎的"桥"：
 *  1. 监听引擎 CommandStore.select_command，把引擎命令状态同步到 UI 的 EditorStore；
 *  2. 注册引擎机器点击回调，把画布选中机器同步到 UI。
 * UI 组件只读写 EditorStore，不直接触碰引擎命令状态。
 */
import { watch, onUnmounted } from "vue";
import SimCanvas from "@/components/SimCanvas.vue";
import TopBar from "./TopBar.vue";
import PlaceBar from "./PlaceBar.vue";
import StatusBar from "./StatusBar.vue";
import {
  useCommandStore,
  setMachineClickHandler,
} from "@/engine/plugin/api.js";
import {
  useEditorStore,
  TOOL_SELECT,
  TOOL_BELT,
  TOOL_PIPE,
  TOOL_MACHINE,
  TOOL_NODE,
} from "@/stores/EditorStore.js";

const editorStore = useEditorStore();
const commandStore = useCommandStore();

// 引擎命令 → UI 工具映射
const CMD_TO_TOOL = {
  SELECT: TOOL_SELECT,
  PLACE_BELT: TOOL_BELT,
  PLACE_PIPE: TOOL_PIPE,
  PLACE_MACHINE: TOOL_MACHINE,
  PLACE_NODE: TOOL_NODE,
};

watch(
  () => commandStore.select_command,
  (cmd) => {
    const tool = CMD_TO_TOOL[cmd];
    if (tool) {
      editorStore.setTool(tool, {
        machineType: editorStore.activeMachineType,
        nodeType: editorStore.activeNodeType,
      });
    } else if (cmd === "default") {
      // Esc / 放置完成等取消命令
      editorStore.resetToSelect();
    }
  },
);

// 引擎机器点击 → 同步到 UI（属性面板/状态栏展示）
setMachineClickHandler((machine) => {
  editorStore.selectedMachine = {
    id: machine.id,
    name: machine.name || machine.type,
    type: machine.type,
    gridX: machine.gridX,
    gridY: machine.gridY,
  };
});

// 卸载时清理回调，避免重复编辑器实例串状态
onUnmounted(() => setMachineClickHandler(null));
</script>

<template>
  <div class="editor">
    <TopBar />
    <div class="editor-main">
      <main class="stage-wrap">
        <SimCanvas />
        <PlaceBar />
      </main>
    </div>
    <StatusBar />
  </div>
</template>

<style scoped>
.editor {
  display: grid;
  grid-template-rows: 46px 1fr 28px;
  height: 100%;
}

.editor-main {
  min-height: 0;
}

.stage-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow: auto;
  height: 100%;
  background:
    radial-gradient(circle at 50% 30%, var(--bg-2) 0%, var(--bg-0) 100%);
}

</style>
