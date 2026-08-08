<script setup>
/**
 * RecipeModal — 机器配方选择模态框（水平布局）
 *
 * 左侧：机器信息 + 当前配方 + 输出端口(P1/P2)图标配置；
 * 右侧：可选配方列表。
 * 图标使用 icons.webp 精灵图（SpriteIcon），配方/端口变更全部经由引擎门面 api.js：
 *  setNowRecipe / setPortRecipeIcon / getPortRecipeIcon / getMachineObject。
 */
import { computed, ref, onMounted, onUnmounted } from "vue";
import {
  useResourcesStore,
  getNowRecipe,
  getRecipeIds,
  getPortRecipeIcon,
  setNowRecipe,
  setPortRecipeIcon,
  getMachineObject,
} from "@/engine/plugin/api.js";
import SpriteIcon from "./SpriteIcon.vue";

const BASE = import.meta.env.BASE_URL;

const props = defineProps({
  machine: { type: Object, required: true },
});

const emit = defineEmits(["close"]);

const resourcesStore = useResourcesStore();

/* ---------- 配方数据 ---------- */

const recipeIds = computed(() => getRecipeIds(props.machine) || []);

const currentId = computed(
  () => getNowRecipe(props.machine) || recipeIds.value[0],
);

const currentRecipe = computed(() => resourcesStore.recipes[currentId.value]);

/** 可选配方列表（按 recipe_id 顺序） */
const recipes = computed(() =>
  recipeIds.value.map((id) => resourcesStore.recipes[id]).filter(Boolean),
);

const machineIcon = computed(
  () =>
    (props.machine.type ? `${BASE}machine_icons/${props.machine.type}.png` : ""),
);

function itemName(id) {
  return resourcesStore.items[id]?.name || id;
}

/* ---------- 输出端口图标 ---------- */

// 端口配置面板预留的机型（暗管出入口）
const RESERVED_TYPES = [
  "concealed_pipe_in_1",
  "concealed_pipe_out",
  "concealed_pipe_in_muti_1",
  "concealed_pipe_out_muti_1",
];

// 候选图标为全部物品的机型（协议核心 / 仓库取货口）
const ALL_ITEM_TYPES = ["protocol_core_1", "warehouse_output_1"];

// pi 输入端口固定附加项：气态息壤（用于激活机器）
const PI_FIXED_ITEM = "gas_xiranite";

// 特殊物品黑名单（传送带传输机型不可选）
const PORT_ICON_BLACKLIST = [
  "tundra_coupon", // 谷地调度券
  "jinlong_coupon", // 武陵调度券
  "belt", // 传送带
  "pipe", // 管道
  "__miner_water", // 清水
  "domain_key_tundra", // 超库存传输
];

// 当前展开配置的端口（默认第一个，即 po1 / bo1 ...）
const activePortKey = ref(null);

/** 实际生效的活动端口（键失效时回退到第一个） */
const activePort = computed(() => {
  if (!portKeys.value.length) return null;
  return portKeys.value.includes(activePortKey.value)
    ? activePortKey.value
    : portKeys.value[0];
});

/** 右侧面板 tab：配方 / 端口图标 */
const rightTab = ref("recipes");

/** 是否端口面板预留 */
const isReserved = computed(() => RESERVED_TYPES.includes(props.machine.type));

/** 可配置的输出端口列表：以配置中的 port_recipe_icon 键为准（po1/po2/bo1/pi1...） */
const portKeys = computed(() => Object.keys(props.machine.port_recipe_icon || {}));

/** 是否有端口图标配置能力 */
const hasPortConfig = computed(() => !isReserved.value && portKeys.value.length > 0);

/** 端口方向：从 mask 中该端口的 cell 前缀判断（bo/po=输出，pi=输入） */
function portType(key) {
  const mask = props.machine.mask || props.machine.defaultMask || [];
  for (const row of mask) {
    for (const cell of row) {
      const parts = String(cell).split(".");
      if (parts[2] === key) return parts[0];
    }
  }
  return key.startsWith("pi") ? "pi" : "bo";
}

/** 是否为流体（gas_/liquid_ 前缀） */
function isFluid(id) {
  return id.startsWith("gas_") || id.startsWith("liquid_");
}

/** 某端口的候选图标：特殊机型取非流体、非机器、非黑名单（传送带传输）；pi(输入)取流体输入+气态息壤；其余取流体输出 */
function portCandidatesFor(key) {
  if (ALL_ITEM_TYPES.includes(props.machine.type)) {
    // 传送带传输，流体、机器与黑名单物品不可选
    return Object.keys(resourcesStore.items).filter(
      (id) =>
        !isFluid(id) &&
        resourcesStore.items[id]?.category !== "machine" &&
        !PORT_ICON_BLACKLIST.includes(id),
    );
  }
  const recipe = currentRecipe.value;
  if (!recipe) return [];
  if (portType(key) === "pi") {
    const ids = Object.keys(recipe.in || {}).filter(isFluid);
    return ids.includes(PI_FIXED_ITEM) ? ids : [PI_FIXED_ITEM, ...ids];
  }
  return Object.keys(recipe.out || {}).filter(isFluid);
}

/** 活动端口的候选图标 */
const activePortCandidates = computed(() =>
  activePort.value ? portCandidatesFor(activePort.value) : [],
);

function portIcon(key) {
  return getPortRecipeIcon(props.machine, key) || null;
}

/** 选中活动端口并切到图标面板 */
function selectPort(key) {
  activePortKey.value = key;
  rightTab.value = "icons";
}

function assignPort(key, itemId) {
  setPortRecipeIcon(props.machine, key, itemId);
  // 仅重渲染端口层（不强制覆盖，保留手动配置）
  const container = getMachineObject(props.machine.id);
  if (container?.renderRecipePort) container.renderRecipePort(false);
  else container?.refreshRecipeUI?.();
}

/* ---------- 切换配方 ---------- */

function applyRecipe(recipeId) {
  if (recipeId === currentId.value) return;
  const machine = props.machine;
  const recipe = resourcesStore.recipes[recipeId];
  if (!recipe) return;

  // 1. 更新当前配方
  setNowRecipe(machine, recipeId);

  // 2. 依据液体/气体输出设置输出端口默认图标（单输出 → po1/po2 相同；双输出 → 依次分配）
  const fluidOuts = Object.keys(recipe.out || {}).filter(
    (id) => id.startsWith("gas_") || id.startsWith("liquid_"),
  );
  if (fluidOuts.length === 1) {
    setPortRecipeIcon(machine, "po1", fluidOuts[0]);
    setPortRecipeIcon(machine, "po2", fluidOuts[0]);
  } else if (fluidOuts.length >= 2) {
    setPortRecipeIcon(machine, "po1", fluidOuts[0]);
    setPortRecipeIcon(machine, "po2", fluidOuts[1]);
  }

  // 3. 刷新机器容器渲染
  getMachineObject(machine.id)?.refreshRecipeUI?.();
}

/* ---------- 关闭（Esc / 遮罩） ---------- */

function close() {
  emit("close");
}

function onKeydown(e) {
  if (e.key === "Escape") close();
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <div class="modal-mask" @click.self="close">
    <div class="recipe-modal">
      <!-- 左列：信息 + 当前配方 + 端口配置 -->
      <aside class="left">
        <header class="modal-head">
          <img
            v-if="machineIcon"
            :src="machineIcon"
            class="head-icon"
            alt=""
          />
          <div class="head-text">
            <span class="head-title">{{ machine.name || machine.type }}</span>
            <span class="head-sub">配方选择</span>
          </div>
          <button class="head-close" title="关闭" @click="close">×</button>
        </header>

        <!-- 当前配方 -->
        <section class="cur-section">
          <span class="sec-label">当前配方</span>
          <div class="cur-recipe">
            <span class="cur-name">{{ currentRecipe?.name || "无配方" }}</span>
            <div class="io-row">
              <span class="io-tag in">输入</span>
              <div
                v-for="(count, itemId) in currentRecipe?.in"
                :key="`in-${itemId}`"
                class="io-item"
              >
                <SpriteIcon :item-id="itemId" :size="26" />
                <span class="io-name">{{ itemName(itemId) }}</span>
                <span class="io-count">×{{ count }}</span>
              </div>
            </div>
            <div class="io-row">
              <span class="io-tag out">输出</span>
              <div
                v-for="(count, itemId) in currentRecipe?.out"
                :key="`out-${itemId}`"
                class="io-item"
              >
                <SpriteIcon :item-id="itemId" :size="26" />
                <span class="io-name">{{ itemName(itemId) }}</span>
                <span class="io-count">×{{ count }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- 输出端口图标配置 -->
        <section
          v-if="isReserved || hasPortConfig"
          class="ports-section"
        >
          <span class="sec-label">输出端口图标</span>

          <!-- 预留机型：面板占位 -->
          <div v-if="isReserved" class="port-reserved">
            该机器的端口配置面板暂未开放（预留）
          </div>

          <template v-else>
            <div
              v-for="key in portKeys"
              :key="key"
              class="port-slot"
              :class="{ active: activePort === key }"
              :title="`点击选择 ${key.toUpperCase()} 的图标`"
              @click="selectPort(key)"
            >
              <span class="port-key">{{ key.toUpperCase() }}</span>
              <SpriteIcon
                v-if="portIcon(key)"
                :item-id="portIcon(key)"
                :size="38"
              />
              <span v-else class="port-empty">未设置</span>
              <span class="port-name">{{ itemName(portIcon(key)) }}</span>
              <span class="port-edit">编辑</span>
            </div>
          </template>
        </section>
      </aside>

      <!-- 右列：可选配方 / 端口图标 -->
      <section class="right">
        <div class="right-tabs">
          <button
            class="right-tab"
            :class="{ active: rightTab === 'recipes' }"
            @click="rightTab = 'recipes'"
          >
            配方
          </button>
          <button
            v-if="hasPortConfig"
            class="right-tab"
            :class="{ active: rightTab === 'icons' }"
            @click="rightTab = 'icons'"
          >
            端口图标
          </button>
        </div>

        <!-- 可选配方 -->
        <div v-show="rightTab === 'recipes'" class="recipe-list">
          <button
            v-for="r in recipes"
            :key="r.id"
            class="recipe-item"
            :class="{ active: r.id === currentId }"
            @click="applyRecipe(r.id)"
          >
            <span class="recipe-name">
              {{ r.name }}
              <span v-if="r.id === currentId" class="recipe-now">当前</span>
            </span>
            <span class="io-row">
              <span
                v-for="(count, itemId) in r.in"
                :key="`in-${itemId}`"
                class="io-item"
              >
                <SpriteIcon :item-id="itemId" :size="30" />
                <span class="io-name">{{ itemName(itemId) }}</span>
                <span class="io-count">×{{ count }}</span>
              </span>
              <span class="io-arrow">→</span>
              <span
                v-for="(count, itemId) in r.out"
                :key="`out-${itemId}`"
                class="io-item"
              >
                <SpriteIcon :item-id="itemId" :size="30" />
                <span class="io-name">{{ itemName(itemId) }}</span>
                <span class="io-count">×{{ count }}</span>
              </span>
            </span>
          </button>
          <p v-if="recipes.length === 0" class="empty">该机器没有可选配方</p>
        </div>

        <!-- 端口图标选择 -->
        <div v-show="rightTab === 'icons'" class="icon-panel">
          <div class="icon-head">
            选择图标 →
            <b class="icon-target">{{ activePort?.toUpperCase() }}</b>
            <span v-if="activePort && portType(activePort) === 'pi'" class="icon-dir">
              （输入）
            </span>
          </div>
          <div class="icon-grid">
            <button
              class="icon-cell clear"
              :class="{ sel: activePort && !portIcon(activePort) }"
              title="清空该端口图标"
              @click="activePort && assignPort(activePort, null)"
            >
              <span class="cell-clear"></span>
              <span class="cell-name">清空</span>
            </button>
            <button
              v-for="id in activePortCandidates"
              :key="id"
              class="icon-cell"
              :class="{ sel: activePort && portIcon(activePort) === id }"
              @click="activePort && assignPort(activePort, id)"
            >
              <SpriteIcon :item-id="id" :size="48" />
              <span class="cell-name">{{ itemName(id) }}</span>
            </button>
            <p v-if="!activePortCandidates.length" class="empty">无可选图标</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
}

.recipe-modal {
  display: flex;
  width: 780px;
  max-width: calc(100vw - 32px);
  height: 480px;
  max-height: calc(100vh - 64px);
  background: var(--bg-1);
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

/* ===== 左列 ===== */

.left {
  flex: none;
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 0 14px;
  border-right: 1px solid var(--border);
  overflow-y: auto;
}

.modal-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--bg-2);
  border-bottom: 1px solid var(--border);
}

.head-icon {
  width: 40px;
  height: 40px;
  object-fit: contain;
  image-rendering: pixelated;
}

.head-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.head-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.head-sub {
  font-size: 11px;
  color: var(--text-faint);
}

.head-close {
  flex: none;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 5px;
  color: var(--text-dim);
  font-size: 16px;
  cursor: pointer;
}

.head-close:hover {
  background: var(--bg-3);
  color: var(--text);
}

.sec-label {
  font-size: 11px;
  color: var(--text-faint);
  letter-spacing: 1px;
}

.cur-section,
.ports-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 14px;
}

.cur-recipe {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background: var(--bg-2);
  border: 1px solid var(--accent);
  border-radius: 7px;
}

.cur-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-strong);
}

.io-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.io-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px 2px 3px;
  background: var(--bg-0);
  border-radius: 999px;
  font-size: 11px;
  color: var(--text-dim);
}

.io-name {
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.io-count {
  color: var(--text-faint);
}

.io-tag {
  flex: none;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
}

.io-tag.in {
  color: #7ab6ff;
  background: rgba(80, 140, 255, 0.12);
}

.io-tag.out {
  color: #ffb86b;
  background: rgba(255, 170, 60, 0.12);
}

.io-arrow {
  color: var(--text-faint);
  font-size: 12px;
}

/* ===== 端口配置 ===== */

.port-slot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.port-slot:hover {
  background: var(--bg-3);
}

.port-slot.active {
  border-color: var(--accent);
  background: var(--accent-dim);
}

.port-key {
  flex: none;
  min-width: 32px;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-dim);
}

.port-reserved {
  padding: 18px 12px;
  border: 1px dashed var(--border-strong);
  border-radius: 7px;
  font-size: 11px;
  color: var(--text-faint);
  text-align: center;
}

.port-empty {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--text-faint);
  background: var(--bg-0);
  border-radius: 50%;
}

.port-name {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--text-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.port-edit {
  flex: none;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--bg-0);
  color: var(--text-faint);
}

.port-slot.active .port-edit {
  background: var(--accent);
  color: #fff;
}

/* ===== 右列 ===== */

.right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
}

.right-tabs {
  flex: none;
  display: flex;
  gap: 4px;
}

.right-tab {
  padding: 5px 14px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-dim);
  font-size: 12px;
  cursor: pointer;
}

.right-tab:hover {
  background: var(--bg-3);
  color: var(--text);
}

.right-tab.active {
  background: var(--accent-dim);
  border-color: var(--accent);
  color: var(--accent-strong);
}

/* 端口图标面板 */

.icon-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.icon-head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-dim);
}

.icon-target {
  padding: 1px 10px;
  border-radius: 5px;
  background: var(--accent-dim);
  color: var(--accent-strong);
  font-size: 12px;
}

.icon-dir {
  font-size: 11px;
  color: var(--text-faint);
}

.icon-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  align-content: start;
  gap: 10px;
  overflow-y: auto;
  padding: 2px;
}

.icon-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 4px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-dim);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.icon-cell:hover {
  background: var(--bg-3);
  color: var(--text);
}

.icon-cell.sel {
  border-color: var(--accent);
  background: var(--accent-dim);
  color: var(--accent-strong);
}

.cell-clear {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px dashed var(--border-strong);
  background: linear-gradient(
    135deg,
    transparent 44%,
    var(--text-faint) 44%,
    var(--text-faint) 56%,
    transparent 56%
  );
}

.icon-cell.sel .cell-clear {
  border-color: var(--accent);
  background: linear-gradient(
    135deg,
    transparent 44%,
    var(--accent-strong) 44%,
    var(--accent-strong) 56%,
    transparent 56%
  );
}

.cell-name {
  width: 100%;
  font-size: 11px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recipe-list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  padding-right: 2px;
}

.recipe-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 9px 12px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--text-dim);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.recipe-item:hover {
  background: var(--bg-3);
  color: var(--text);
}

.recipe-item.active {
  border-color: var(--accent);
}

.recipe-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}

.recipe-item.active .recipe-name {
  color: var(--accent-strong);
}

.recipe-now {
  font-size: 10px;
  font-weight: 400;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--accent-dim);
  color: var(--accent-strong);
}

.empty {
  margin: 0;
  padding: 16px 0;
  text-align: center;
  font-size: 12px;
  color: var(--text-faint);
}
</style>
