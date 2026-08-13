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
import { useI18n } from "vue-i18n";
import {
  useResourcesStore,
  getNowRecipe,
  getRecipeIds,
  getPortRecipeIcon,
  setNowRecipe,
  setPortRecipeIcon,
  getModes,
  getNowMode,
  switchMachineMode,
  getMachineObject,
} from "@/engine/plugin/api.js";
import SpriteIcon from "./SpriteIcon.vue";

const BASE = import.meta.env.BASE_URL;

const props = defineProps({
  machine: { type: Object, required: true },
});

const emit = defineEmits(["close"]);

const { t } = useI18n();
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

// 端口配置面板预留的机型（暗管入口）
const RESERVED_TYPES = ["concealed_pipe_in_1", "concealed_pipe_in_muti_1"];

// 候选图标为全部物品的机型（协议核心 / 仓库取货口）
const ALL_ITEM_TYPES = ["protocol_core_1", "warehouse_output_1"];

// 候选图标为全部液体的机型（暗管出口）
const ALL_FLUID_TYPES = ["concealed_pipe_out", "concealed_pipe_out_muti_1"];

// 暗管出口端口图标黑名单：gas_/liquid_ 前缀但实为机器的物品
const FLUID_PORT_ICON_BLACKLIST = [
  "gas_pump_1", // 气体收集泵
  "gas_reactor_1", // 气体反应炉
  "liquid_clean_gate", // 净水节点(污水接入口)
  "liquid_cleaner_1", // 废水处理机
  "liquid_purifier_1", // 提纯机
  "liquid_recycle_gate", // 净水节点(产物排出口)
];

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

/** 某端口的候选图标：特殊机型取非流体、非机器、非黑名单（传送带传输）；暗管出口取全部液体；pi(输入)取流体输入+气态息壤；其余取流体输出 */
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
  if (ALL_FLUID_TYPES.includes(props.machine.type)) {
    // 暗管出口：端口图标可选全部液体（排除 gas_/liquid_ 前缀但实为机器的物品）
    return Object.keys(resourcesStore.items).filter(
      (id) => isFluid(id) && !FLUID_PORT_ICON_BLACKLIST.includes(id),
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

/* ---------- 模式切换 ---------- */

/** 可选模式列表（来自机器配置 modes 字段） */
const modes = computed(() => getModes(props.machine));

/** 当前模式（优先机器实例的 now_mode；不在可选列表时兜底第一个，避免无 default 配置时无高亮） */
const currentMode = computed(() => {
  const now = getNowMode(props.machine);
  if (modes.value.includes(now)) return now;
  return modes.value[0] || "default";
});

function switchMode(mode) {
  if (mode === currentMode.value) return;
  // 引擎已按新模式注入 mask / port_recipe_icon，面板直接跟随最新配置数据
  switchMachineMode(props.machine, mode);
  rightTab.value = "recipes";
}

/* ---------- 切换配方 ---------- */

/**
 * 依据液体/气体输出为现有输出端口键分配默认图标
 * 按 port_recipe_icon 现有键分配（排除 pi 输入端口；单输出 → 各端口相同；多输出 → 依次分配）
 */
function applyDefaultPortIcons() {
  const recipe = resourcesStore.recipes[currentId.value];
  if (!recipe) return;
  const fluidOuts = Object.keys(recipe.out || {}).filter(isFluid);
  const outPortKeys = Object.keys(props.machine.port_recipe_icon || {}).filter(
    (key) => portType(key) !== "pi",
  );
  if (outPortKeys.length && fluidOuts.length) {
    outPortKeys.forEach((portId, i) => {
      setPortRecipeIcon(
        props.machine,
        portId,
        fluidOuts[Math.min(i, fluidOuts.length - 1)],
      );
    });
  }
}

function applyRecipe(recipeId) {
  if (recipeId === currentId.value) return;
  const machine = props.machine;
  if (!resourcesStore.recipes[recipeId]) return;

  // 1. 更新当前配方
  setNowRecipe(machine, recipeId);

  // 2. 为当前输出端口键分配默认图标
  applyDefaultPortIcons();

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
            <span class="head-sub">{{ t("recipeModal.headSub") }}</span>
          </div>
          <button
            class="head-close"
            :title="t('common.close')"
            @click="close"
          >
            ×
          </button>
        </header>

        <!-- 模式切换 -->
        <section v-if="modes.length > 1" class="mode-section">
          <span class="sec-label">{{ t("recipeModal.modes") }}</span>
          <div class="mode-tabs">
            <button
              v-for="m in modes"
              :key="m"
              class="mode-tab"
              :class="{ active: m === currentMode }"
              @click="switchMode(m)"
            >
              {{ t(`recipeModal.modeNames.${m}`, { defaultValue: m }) }}
            </button>
          </div>
        </section>

        <!-- 当前配方 -->
        <section class="cur-section">
          <span class="sec-label">{{ t("recipeModal.currentRecipe") }}</span>
          <div class="cur-recipe">
            <span class="cur-name">{{ currentRecipe?.name || t("recipeModal.noRecipe") }}</span>
            <div class="io-row">
              <span class="io-tag in">{{ t("common.input") }}</span>
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
              <span class="io-tag out">{{ t("common.output") }}</span>
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
          <span class="sec-label">{{ t("recipeModal.outputPortIcon") }}</span>

          <!-- 预留机型：面板占位 -->
          <div v-if="isReserved" class="port-reserved">
            {{ t("recipeModal.reservedHint") }}
          </div>

          <template v-else>
            <div
              v-for="key in portKeys"
              :key="key"
              class="port-slot"
              :class="{ active: activePort === key }"
              :title="t('recipeModal.portTitle', { key: key.toUpperCase() })"
              @click="selectPort(key)"
            >
              <span class="port-key">{{ key.toUpperCase() }}</span>
              <SpriteIcon
                v-if="portIcon(key)"
                :item-id="portIcon(key)"
                :size="38"
              />
              <span v-else class="port-empty">{{ t("recipeModal.notSet") }}</span>
              <span class="port-name">{{ itemName(portIcon(key)) }}</span>
              <span class="port-edit">{{ t("recipeModal.edit") }}</span>
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
            {{ t("recipeModal.recipes") }}
          </button>
          <button
            v-if="hasPortConfig"
            class="right-tab"
            :class="{ active: rightTab === 'icons' }"
            @click="rightTab = 'icons'"
          >
            {{ t("recipeModal.portIcons") }}
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
              <span v-if="r.id === currentId" class="recipe-now">{{ t("common.current") }}</span>
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
          <p v-if="recipes.length === 0" class="empty">
            {{ t("recipeModal.noRecipes") }}
          </p>
        </div>

        <!-- 端口图标选择 -->
        <div v-show="rightTab === 'icons'" class="icon-panel">
          <div class="icon-head">
            {{ t("recipeModal.chooseIcon") }}
            <b class="icon-target">{{ activePort?.toUpperCase() }}</b>
            <span
              v-if="activePort && portType(activePort) === 'pi'"
              class="icon-dir"
            >
              {{ t("recipeModal.inputDir") }}
            </span>
          </div>
          <div class="icon-grid">
            <button
              class="icon-cell clear"
              :class="{ sel: activePort && !portIcon(activePort) }"
              :title="t('recipeModal.clearPortTitle')"
              @click="activePort && assignPort(activePort, null)"
            >
              <span class="cell-clear"></span>
              <span class="cell-name">{{ t("recipeModal.clear") }}</span>
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
            <p v-if="!activePortCandidates.length" class="empty">
              {{ t("recipeModal.noIcons") }}
            </p>
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

/* ===== 模式切换 ===== */

.mode-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 14px;
}

.mode-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mode-tab {
  padding: 4px 12px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-dim);
  font-size: 11px;
  text-transform: capitalize;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.mode-tab:hover {
  background: var(--bg-3);
  color: var(--text);
}

.mode-tab.active {
  background: var(--accent-dim);
  border-color: var(--accent);
  color: var(--accent-strong);
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
