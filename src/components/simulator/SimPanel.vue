<script setup>
/**
 * SimPanel — 模拟引擎悬浮控制面板
 *
 * 位于 TopBar 下方、画布右上角，可折叠。
 * 功能：
 *  - 启动 / 停止 / 单步 / 重置 模拟
 *  - 调节 tick 间隔与游戏内时间流速
 *  - 实时展示 tick、游戏时间、实体数量与生产/消耗统计
 *
 * 数据全部来自 SimBridge.js 的响应式 ref，组件本身无业务逻辑。
 */
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  running,
  tick,
  gameSeconds,
  elapsedMs,
  snapshot,
  error,
  params,
  panelCollapsed,
  machineCount,
  beltCount,
  pipeCount,
  start,
  stop,
  step,
  reset,
  setParams,
} from "@/simulation/SimBridge.js";

const { t } = useI18n();

function toggleCollapse() {
  panelCollapsed.value = !panelCollapsed.value;
}

/** 格式化游戏时间为 mm:ss */
const formattedGameTime = computed(() => {
  const total = Math.floor(gameSeconds.value);
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
});

/** 格式化真实耗时 */
const formattedElapsed = computed(() => {
  const ms = elapsedMs.value;
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
});

/** 生产统计 Top 列表 */
const producedList = computed(() => {
  const produced = snapshot.value?.produced || {};
  return Object.entries(produced)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
});

/** 消耗统计 Top 列表 */
const consumedList = computed(() => {
  const consumed = snapshot.value?.consumed || {};
  return Object.entries(consumed)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
});

/**
 * 速率挡位：与状态区“速率”统计口径一致，
 * 挡位数值 = Math.round(1000 / intervalMs)（ticks/s）
 */
const SPEED_GEARS = [200, 100, 50, 25, 20];

/** 由 intervalMs 换算实际速率（ticks/s），与速率统计同公式 */
const gearRate = (intervalMs) => Math.round(1000 / intervalMs);

/** 传输状态摘要 */
const transportSummary = computed(() => {
  const snap = snapshot.value;
  if (!snap) return null;
  return {
    belts: snap.belts || 0,
    beltNodes: snap.beltNodes || 0,
    pipes: snap.pipes || 0,
    pipeNodes: snap.pipeNodes || 0,
    pendingItems: snap.pendingItems || 0,
    blockedItems: snap.blockedItems || 0,
    pendingLiquids: snap.pendingLiquids || 0,
    blockedLiquids: snap.blockedLiquids || 0,
  };
});

/* ---------- 参数输入处理 ---------- */

function onGameSecChange(e) {
  const val = Number.parseFloat(e.target.value);
  if (!Number.isNaN(val)) setParams({ gameSecPerTick: val });
}
</script>

<template>
  <aside class="sim-panel" :class="{ collapsed: panelCollapsed }">
    <!-- 标题栏 -->
    <header class="sim-panel-header" @click="toggleCollapse">
      <div class="sim-panel-title">
        <span class="sim-dot" :class="{ active: running }"></span>
        <span>{{ t("simPanel.title") }}</span>
      </div>
      <svg
        class="sim-chevron"
        :class="{ open: !panelCollapsed }"
        width="10"
        height="10"
        viewBox="0 0 10 10"
      >
        <path d="M2 3.5 L5 6.5 L8 3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </header>

    <!-- 折叠时仅保留标题栏；展开时显示内容 -->
    <div v-show="!panelCollapsed" class="sim-panel-body">
      <!-- 错误提示 -->
      <div v-if="error" class="sim-error">
        <span class="sim-error-icon">!</span>
        <span class="sim-error-text">{{ error }}</span>
      </div>

      <!-- 控制按钮组 -->
      <div class="sim-controls">
        <button
          v-if="!running"
          class="ui-btn sim-btn sim-btn-primary"
          @click="start"
        >
          ▶ {{ t("simPanel.start") }}
        </button>
        <button
          v-else
          class="ui-btn sim-btn sim-btn-danger"
          @click="stop"
        >
          ■ {{ t("simPanel.stop") }}
        </button>
        <button
          class="ui-btn sim-btn"
          :disabled="running"
          @click="step"
        >
          ⏭ {{ t("simPanel.step") }}
        </button>
        <button class="ui-btn sim-btn" @click="reset">
          ↺ {{ t("simPanel.reset") }}
        </button>
      </div>

      <!-- 参数区 -->
      <section class="sim-section">
        <h4 class="sim-section-title">{{ t("simPanel.params") }}</h4>
        <div class="sim-param-row">
          <label class="sim-param-label">
            {{ t("simPanel.speed") }}
            <span class="sim-param-value">{{ params.intervalMs }}ms</span>
          </label>
          <div class="sim-gears">
            <button
              v-for="ms in SPEED_GEARS"
              :key="ms"
              class="sim-gear"
              :class="{ active: params.intervalMs === ms }"
              :title="`${gearRate(ms)} ticks/s`"
              @click="setParams({ intervalMs: ms })"
            >
              {{ gearRate(ms) }}
            </button>
          </div>
        </div>
        <div class="sim-param-row invisible">
          <label class="sim-param-label">
            {{ t("simPanel.gameSecPerTick") }}
            <span class="sim-param-value">{{ params.gameSecPerTick }}s</span>
          </label>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            :value="params.gameSecPerTick"
            @input="onGameSecChange"
            class="sim-range"
          />
        </div>
      </section>

      <!-- 实时状态 -->
      <section class="sim-section">
        <h4 class="sim-section-title">{{ t("simPanel.status") }}</h4>
        <div class="sim-stat-grid">
          <div class="sim-stat">
            <span class="sim-stat-label">{{ t("simPanel.tick") }}</span>
            <span class="sim-stat-value">{{ tick }}</span>
          </div>
          <div class="sim-stat">
            <span class="sim-stat-label">{{ t("simPanel.gameTime") }}</span>
            <span class="sim-stat-value">{{ formattedGameTime }}</span>
          </div>
          <div class="sim-stat">
            <span class="sim-stat-label">{{ t("simPanel.elapsed") }}</span>
            <span class="sim-stat-value">{{ formattedElapsed }}</span>
          </div>
          <div class="sim-stat">
            <span class="sim-stat-label">{{ t("simPanel.fps") }}</span>
            <span class="sim-stat-value">
              {{ params.intervalMs > 0 ? Math.round(1000 / params.intervalMs) : 0 }}
            </span>
          </div>
        </div>
      </section>

      <!-- 蓝图实体统计 -->
      <section class="sim-section">
        <h4 class="sim-section-title">{{ t("simPanel.entities") }}</h4>
        <div class="sim-stat-grid">
          <div class="sim-stat">
            <span class="sim-stat-label">{{ t("simPanel.machines") }}</span>
            <span class="sim-stat-value">{{ machineCount }}</span>
          </div>
          <div class="sim-stat">
            <span class="sim-stat-label">{{ t("simPanel.belts") }}</span>
            <span class="sim-stat-value">{{ beltCount }}</span>
          </div>
          <div class="sim-stat">
            <span class="sim-stat-label">{{ t("simPanel.pipes") }}</span>
            <span class="sim-stat-value">{{ pipeCount }}</span>
          </div>
          <div class="sim-stat" v-if="transportSummary">
            <span class="sim-stat-label">{{ t("simPanel.beltNodes") }}</span>
            <span class="sim-stat-value">{{ transportSummary.beltNodes }}</span>
          </div>
        </div>
      </section>

      <!-- 传输状态 -->
      <section class="sim-section" v-if="transportSummary">
        <h4 class="sim-section-title">{{ t("simPanel.transport") }}</h4>
        <div class="sim-transport-row">
          <span class="sim-transport-label">{{ t("simPanel.pendingItems") }}</span>
          <span class="sim-transport-value">{{ transportSummary.pendingItems }}</span>
          <span class="sim-transport-label">{{ t("simPanel.blockedItems") }}</span>
          <span
            class="sim-transport-value"
            :class="{ warn: transportSummary.blockedItems > 0 }"
          >{{ transportSummary.blockedItems }}</span>
        </div>
        <div class="sim-transport-row">
          <span class="sim-transport-label">{{ t("simPanel.pendingLiquids") }}</span>
          <span class="sim-transport-value">{{ transportSummary.pendingLiquids }}</span>
          <span class="sim-transport-label">{{ t("simPanel.blockedLiquids") }}</span>
          <span
            class="sim-transport-value"
            :class="{ warn: transportSummary.blockedLiquids > 0 }"
          >{{ transportSummary.blockedLiquids }}</span>
        </div>
      </section>

      <!-- 生产 / 消耗统计 -->
      <section class="sim-section" v-if="producedList.length || consumedList.length">
        <div class="sim-io-grid">
          <div class="sim-io-col">
            <h4 class="sim-section-title sim-io-title">
              <span class="sim-io-dot ok"></span>
              {{ t("simPanel.produced") }}
            </h4>
            <div v-if="producedList.length" class="sim-io-list">
              <div v-for="[id, count] in producedList" :key="id" class="sim-io-item">
                <span class="sim-io-id">{{ id }}</span>
                <span class="sim-io-count">{{ count.toFixed(1) }}</span>
              </div>
            </div>
            <div v-else class="sim-io-empty">{{ t("simPanel.noData") }}</div>
          </div>
          <div class="sim-io-col">
            <h4 class="sim-section-title sim-io-title">
              <span class="sim-io-dot danger"></span>
              {{ t("simPanel.consumed") }}
            </h4>
            <div v-if="consumedList.length" class="sim-io-list">
              <div v-for="[id, count] in consumedList" :key="id" class="sim-io-item">
                <span class="sim-io-id">{{ id }}</span>
                <span class="sim-io-count">{{ count.toFixed(1) }}</span>
              </div>
            </div>
            <div v-else class="sim-io-empty">{{ t("simPanel.noData") }}</div>
          </div>
        </div>
      </section>
    </div>
  </aside>
</template>

<style scoped>
.sim-panel {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 15;
  width: 280px;
  max-height: calc(100% - 24px);
  display: flex;
  flex-direction: column;
  background: rgba(21, 24, 29, 0.96);
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  overflow: hidden;
  transition: width 0.2s ease;
}

.sim-panel.collapsed {
  width: 180px;
}

/* ---------- 标题栏 ---------- */

.sim-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-2);
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}

.sim-panel-header:hover {
  background: var(--bg-3);
}

.sim-panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0.3px;
}

.sim-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-faint);
  flex-shrink: 0;
}

.sim-dot.active {
  background: var(--ok);
  box-shadow: 0 0 6px rgba(127, 176, 105, 0.6);
  animation: sim-pulse 1.5s ease-in-out infinite;
}

@keyframes sim-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.sim-chevron {
  color: var(--text-faint);
  transition: transform 0.2s;
  flex-shrink: 0;
}

.sim-chevron.open {
  transform: rotate(180deg);
}

/* ---------- 面板主体 ---------- */

.sim-panel-body {
  overflow-y: auto;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ---------- 错误提示 ---------- */

.sim-error {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  background: var(--danger-dim, rgba(226, 109, 92, 0.12));
  border: 1px solid rgba(226, 109, 92, 0.3);
  border-radius: 6px;
}

.sim-error-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--danger);
  color: #fff;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.sim-error-text {
  font-size: 11px;
  color: #ff9a8b;
  line-height: 1.4;
  word-break: break-all;
}

/* ---------- 控制按钮 ---------- */

.sim-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.sim-btn {
  padding: 6px 8px;
  font-size: 11px;
  text-align: center;
}

.sim-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.sim-btn-primary {
  background: var(--accent-dim);
  border-color: var(--accent);
  color: var(--accent-strong);
}

.sim-btn-primary:hover {
  background: rgba(224, 169, 63, 0.24);
}

.sim-btn-danger {
  background: rgba(226, 109, 92, 0.12);
  border-color: var(--danger);
  color: #ff9a8b;
}

.sim-btn-danger:hover {
  background: rgba(226, 109, 92, 0.22);
}

/* ---------- 分区 ---------- */

.sim-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sim-section-title {
  margin: 0;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

/* ---------- 参数行 ---------- */

.sim-param-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sim-param-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-dim);
}

.sim-param-value {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--accent);
  font-weight: 600;
}

.sim-gears {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}

.sim-gear {
  padding: 4px 0;
  font-size: 10px;
  font-family: var(--font-mono);
  text-align: center;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-dim);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.sim-gear:hover {
  background: var(--bg-3);
  color: var(--text);
}

.sim-gear.active {
  background: var(--accent-dim);
  border-color: var(--accent);
  color: var(--accent-strong);
}

.sim-range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  background: var(--bg-3);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.sim-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  background: var(--accent);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid var(--bg-1);
  box-shadow: 0 0 4px rgba(224, 169, 63, 0.4);
}

.sim-range::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: var(--accent);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid var(--bg-1);
}

/* ---------- 统计网格 ---------- */

.sim-stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.sim-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: 5px;
}

.sim-stat-label {
  font-size: 10px;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sim-stat-value {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

/* ---------- 传输状态 ---------- */

.sim-transport-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto;
  gap: 6px;
  align-items: center;
  padding: 4px 0;
}

.sim-transport-label {
  font-size: 11px;
  color: var(--text-dim);
}

.sim-transport-value {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  text-align: right;
}

.sim-transport-value.warn {
  color: var(--danger);
}

/* ---------- 生产/消耗 ---------- */

.sim-io-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.sim-io-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.sim-io-title {
  display: flex;
  align-items: center;
  gap: 5px;
}

.sim-io-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sim-io-dot.ok {
  background: var(--ok);
}

.sim-io-dot.danger {
  background: var(--danger);
}

.sim-io-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 120px;
  overflow-y: auto;
}

.sim-io-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 3px 6px;
  background: var(--bg-2);
  border-radius: 4px;
}

.sim-io-id {
  font-size: 10px;
  color: var(--text-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.sim-io-count {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  flex-shrink: 0;
}

.sim-io-empty {
  font-size: 10px;
  color: var(--text-faint);
  font-style: italic;
  padding: 4px 0;
}

.invisible {
  visibility: hidden;
  display: none;
}

</style>
