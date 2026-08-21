<script setup>
/**
 * SimStatsPanel — 产出/消耗每分钟速率统计面板（单列表合并）
 *
 * 位于画布左侧悬浮。同一列表中每行展示：物品名 | 产出/min(绿) | 消耗/min(红)
 * 通过 item id 去 resourcesStore.items 查找中文名。
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { snapshot, panelCollapsed } from "@/simulation/SimBridge.js";
import { useResourcesStore } from "@/engine/plugin/api.js";

const { t } = useI18n();
const resourcesStore = useResourcesStore();

/** 通过 item id 获取中文名，找不到则回退显示 id */
function getItemName(id) {
  const item = resourcesStore.items[id];
  return item?.name || id;
}

/**
 * 合并产出与消耗为同一列表：
 * 收集所有出现过的物品 id，分别取 producedRate / consumedRate，
 * 按 (产出+消耗) 总量降序排列。
 */
const mergedList = computed(() => {
  const produced = snapshot.value?.producedRate || {};
  const consumed = snapshot.value?.consumedRate || {};
  const allIds = new Set([...Object.keys(produced), ...Object.keys(consumed)]);

  return Array.from(allIds)
    .map((id) => ({
      id,
      name: getItemName(id),
      produced: (produced[id] || 0).toFixed(1),
      consumed: (consumed[id] || 0).toFixed(1),
      total: (produced[id] || 0) + (consumed[id] || 0),
    }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);
});
</script>

<template>
  <aside class="stats-panel" :class="{ faded: panelCollapsed }">
    <section class="stats-card">
      <!-- 标题栏 -->
      <header class="stats-header">
        <span class="stats-title">{{ t("simStats.io") }}</span>
        <span class="stats-unit">{{ t("simStats.perMin") }}</span>
      </header>

      <!-- 列头 -->
      <div class="stats-colhead">
        <span class="colhead-name">{{ t("simStats.item") }}</span>
        <span class="colhead-io produced">{{ t("simStats.produced") }}</span>
        <span class="colhead-io consumed">{{ t("simStats.consumed") }}</span>
      </div>

      <!-- 合并列表 -->
      <div class="stats-body">
        <div v-if="mergedList.length" class="stats-list">
          <div v-for="item in mergedList" :key="item.id" class="stats-row">
            <span class="stats-name" :title="item.id">{{ item.name }}</span>
            <span class="stats-io produced">{{ item.produced }}</span>
            <span class="stats-io consumed">{{ item.consumed }}</span>
          </div>
        </div>
        <div v-else class="stats-empty">{{ t("simStats.noData") }}</div>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.stats-panel {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 15;
  width: 260px;
  pointer-events: none;
  opacity: 1;
  transform: translateX(0);
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.stats-panel.faded {
  opacity: 0;
  transform: translateX(-12px);
  pointer-events: none;
}

.stats-card {
  background: rgba(21, 24, 29, 0.96);
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  overflow: hidden;
  pointer-events: auto;
}

/* ---------- 标题栏 ---------- */

.stats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-2);
  border-bottom: 1px solid var(--border);
}

.stats-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0.3px;
}

.stats-unit {
  font-size: 10px;
  color: var(--text-faint);
  font-family: var(--font-mono);
}

/* ---------- 列头 ---------- */

.stats-colhead {
  display: grid;
  grid-template-columns: 1fr 48px 48px;
  gap: 6px;
  padding: 5px 12px;
  background: var(--bg-1);
  border-bottom: 1px solid var(--border);
}

.colhead-name {
  font-size: 10px;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.colhead-io {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: right;
}

.colhead-io.produced {
  color: var(--ok);
}

.colhead-io.consumed {
  color: var(--danger);
}

/* ---------- 列表 ---------- */

.stats-body {
  max-height: 320px;
  overflow-y: auto;
  padding: 6px 8px;
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.stats-row {
  display: grid;
  grid-template-columns: 1fr 48px 48px;
  gap: 6px;
  align-items: center;
  padding: 4px 8px;
  background: var(--bg-2);
  border-radius: 5px;
}

.stats-name {
  font-size: 12px;
  color: var(--text-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.stats-io {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  text-align: right;
}

.stats-io.produced {
  color: var(--ok);
}

.stats-io.consumed {
  color: var(--danger);
}

.stats-empty {
  font-size: 11px;
  color: var(--text-faint);
  font-style: italic;
  text-align: center;
  padding: 20px 0;
}
</style>
