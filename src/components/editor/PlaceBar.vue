<script setup>
/**
 * PlaceBar — 舞台底部悬浮放置栏（机器 + 节点 融合）
 *
 * 顶部类型选择条包含两类 tab：
 *   1. 机器 category 类别（暂无 category 字段时仅"默认"）；
 *   2. 节点类型：传送带 / 管道（各含 split 分流、merge 合流、cross 十字）。
 * 切换 tab 后下方列表展示对应类型的可放置项。
 * 配置与命令均来自引擎门面。
 */
import { computed, ref } from "vue";
import {
  useMachineStore,
  useResourcesStore,
  dispatchPlaceMachineHandle,
  dispatchPlaceNodeHandle,
} from "@/engine/plugin/api.js";
import { useEditorStore, TOOL_MACHINE, TOOL_NODE } from "@/stores/EditorStore.js";

const BASE = import.meta.env.BASE_URL;

const editorStore = useEditorStore();
const machineStore = useMachineStore();
const resourcesStore = useResourcesStore();

/* ---------- 机器 ---------- */

// 分类显示名：后续 machines.json 增加 category 字段后在此扩展
const CATEGORY_LABELS = { default: "默认" };

function categoryLabel(cat) {
  return CATEGORY_LABELS[cat] || cat;
}

/** 机器按 category 分组，无 category 时归 "default" */
const machineGroups = computed(() => {
  const groups = {};
  for (const [id, cfg] of Object.entries(machineStore.machineTypes)) {
    if (id.startsWith("test")) continue;
    const cat = cfg.category || "default";
    (groups[cat] ??= []).push({
      id,
      name: cfg.name || id,
      category: cat,
      gridWidth: cfg.gridWidth,
      gridHeight: cfg.gridHeight,
    });
  }
  return groups;
});

/** 机器 category 列表 */
const categories = computed(() => Object.keys(machineGroups.value));

function iconSrc(id) {
  return resourcesStore.machineIcons[id]
    ? `${BASE}machine_icons/${id}.png`
    : "";
}

/* ---------- 节点 ---------- */

const NODE_TYPES = [
  { type: "split", label: "分流", icon: "bg_logistic_log_splitter" },
  { type: "merge", label: "合流", icon: "bg_logistic_log_converger" },
  { type: "cross", label: "十字", icon: "bg_logistic_log_connector" },
];

const PIPE_NODE_TYPES = [
  { type: "split", label: "分流", icon: "bg_logistic_log_pipe_splitter" },
  { type: "merge", label: "合流", icon: "bg_logistic_log_pipe_converger" },
  { type: "cross", label: "十字", icon: "bg_logistic_log_pipe_connector" },
];

function nodeIconSrc(name) {
  return `${BASE}textures/${name}.png`;
}

/* ---------- 类型选择 ---------- */

/** 类型 tab 列表：机器 category 在前，节点合并为一个"节点"tab */
const typeTabs = computed(() => [
  ...categories.value.map((cat) => ({
    key: `cat:${cat}`,
    kind: "category",
    cat,
    label: categoryLabel(cat),
  })),
  { key: "node", kind: "node", label: "节点" },
]);

const activeTabKey = ref(null);

/** 当前 tab（key 失效时回退到第一个） */
const activeTab = computed(
  () =>
    typeTabs.value.find((t) => t.key === activeTabKey.value) ||
    typeTabs.value[0],
);

/** 当前类型下的机器列表 */
const machineItems = computed(
  () => machineGroups.value[activeTab.value?.cat] || [],
);

/** 节点分组：传送带 / 管道 */
const nodeGroups = computed(() => {
  if (activeTab.value?.kind !== "node") return [];
  return [
    { label: "传送带", kind: "belt", items: NODE_TYPES },
    { label: "管道", kind: "pipe", items: PIPE_NODE_TYPES },
  ];
});

/* ---------- 放置动作 ---------- */

function pickMachine(id) {
  editorStore.setTool(TOOL_MACHINE, { machineType: id });
  dispatchPlaceMachineHandle(id);
}

function pickNode(type, kind) {
  const isBelt = kind === "belt";
  editorStore.setTool(TOOL_NODE, { nodeType: { kind, type } });
  dispatchPlaceNodeHandle(type, isBelt);
}

function isMachineActive(id) {
  return (
    editorStore.currentTool === TOOL_MACHINE &&
    editorStore.activeMachineType === id
  );
}

function isNodeActive(nodeType, kind) {
  const cur = editorStore.activeNodeType;
  return (
    editorStore.currentTool === TOOL_NODE &&
    cur &&
    cur.kind === kind &&
    cur.type === nodeType
  );
}
</script>

<template>
  <section class="place-bar">
    <div class="type-tabs">
      <button
        v-for="tab in typeTabs"
        :key="tab.key"
        class="type-tab"
        :class="{ active: activeTab?.key === tab.key }"
        @click="activeTabKey = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="bar-items">
      <!-- 机器项 -->
      <template v-if="activeTab?.kind === 'category'">
        <button
          v-for="m in machineItems"
          :key="m.id"
          class="bar-item"
          :class="{ active: isMachineActive(m.id) }"
          :title="`${m.name}（${m.gridWidth}×${m.gridHeight}）`"
          @click="pickMachine(m.id)"
        >
          <img
            v-if="iconSrc(m.id)"
            :src="iconSrc(m.id)"
            class="bar-icon"
            alt=""
          />
          <span v-else class="bar-icon bar-icon--fallback">
            {{ m.name.slice(0, 1) }}
          </span>
          <span class="bar-label">{{ m.name }}</span>
        </button>
      </template>

      <!-- 节点项 -->
      <template v-else-if="activeTab?.kind === 'node'">
        <template v-for="group in nodeGroups" :key="group.kind">
          <span class="cat-chip">{{ group.label }}</span>
          <button
            v-for="n in group.items"
            :key="`${group.kind}-${n.type}`"
            class="bar-item"
            :class="{ active: isNodeActive(n.type, group.kind) }"
            :title="`${group.label}${n.label}`"
            @click="pickNode(n.type, group.kind)"
          >
            <img :src="nodeIconSrc(n.icon)" class="bar-icon" alt="" />
            <span class="bar-label">{{ n.label }}</span>
          </button>
        </template>
      </template>
    </div>
  </section>
</template>

<style scoped>
.place-bar {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 8px;
  /* 尺寸固定 */
  width: 900px;
  height: 140px;
  max-width: calc(100% - 32px);
  padding: 10px 12px;
  background: rgba(21, 24, 29, 0.94);
  border: 1px solid var(--border-strong);
  border-radius: 9px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  user-select: none;
}

/* 类型选择条 */
.type-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.type-tab {
  flex: none;
  padding: 3px 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-2);
  color: var(--text-dim);
  font-size: 11px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.type-tab:hover {
  background: var(--bg-3);
  color: var(--text);
}

.type-tab.active {
  background: var(--accent-dim);
  border-color: var(--accent);
  color: var(--accent-strong);
}

/* 放置项列表：填满固定尺寸，超出横向滚动 */
.bar-items {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.cat-chip {
  flex: none;
  padding: 2px 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 10px;
  color: var(--text-dim);
  background: var(--bg-0);
  white-space: nowrap;
}

.bar-item {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 6px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-dim);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.bar-item:hover {
  background: var(--bg-3);
  color: var(--text);
}

.bar-item.active {
  background: var(--accent-dim);
  border-color: var(--accent);
  color: var(--accent-strong);
}

.bar-icon {
  width: 56px;
  height: 56px;
  object-fit: contain;
  image-rendering: pixelated;
}

.bar-icon--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--text-faint);
  background: var(--bg-0);
  border-radius: 6px;
}

.bar-label {
  font-size: 12px;
  line-height: 1.2;
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
