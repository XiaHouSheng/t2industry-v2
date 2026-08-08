import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * EditorStore — 编辑器 UI 层状态
 *
 * 与引擎解耦：不持有引擎内部对象，只记录 UI 关注的状态。
 * 引擎命令（键盘/工具）引起的状态变化由 EditorShell 监听引擎
 * CommandStore 后同步到此，UI 组件只读本 store。
 */

// 工具枚举
export const TOOL_SELECT = "select";
export const TOOL_BELT = "belt";
export const TOOL_PIPE = "pipe";
export const TOOL_MACHINE = "machine";
export const TOOL_NODE = "node";

export const useEditorStore = defineStore("editorStore", () => {
  /** 当前激活的工具 */
  const currentTool = ref(TOOL_SELECT);
  /** 工具为 machine 时，当前放置的机器类型 id */
  const activeMachineType = ref(null);
  /** 工具为 node 时，当前放置的节点：{ kind: 'belt'|'pipe', type: 'split'|'merge'|'cross' } */
  const activeNodeType = ref(null);
  /** 画布中通过点击选中的机器（引擎回调写入） */
  const selectedMachine = ref(null);

  function setTool(tool, opts = {}) {
    currentTool.value = tool;
    if (tool === TOOL_MACHINE) {
      activeMachineType.value = opts.machineType ?? null;
    }
    if (tool === TOOL_NODE) {
      activeNodeType.value = opts.nodeType ?? null;
    }
  }

  /** 引擎取消命令（Esc）后回到选择工具 */
  function resetToSelect() {
    currentTool.value = TOOL_SELECT;
    activeMachineType.value = null;
    activeNodeType.value = null;
  }

  function clearSelected() {
    selectedMachine.value = null;
  }

  return {
    currentTool,
    activeMachineType,
    activeNodeType,
    selectedMachine,
    setTool,
    resetToSelect,
    clearSelected,
  };
});
