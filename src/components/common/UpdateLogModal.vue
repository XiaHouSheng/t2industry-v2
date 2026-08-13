<script setup>
/**
 * UpdateLogModal — 通用「更新说明」弹窗（纯展示组件，可复用）
 *
 * 由父级控制显隐与数据源，组件不关心版本号从哪来、是否已读等逻辑：
 *  - visible: 是否显示
 *  - version: 当前版本号（标题栏展示，可选）
 *  - title:   弹窗标题（默认取 i18n versionLog.title）
 *  - logs:    更新日志列表 [{ version, date, notes: [] }]，按新 → 旧排列
 *  - 关闭时通过 close 事件通知父级
 */
import { useI18n } from "vue-i18n";

defineProps({
  visible: { type: Boolean, default: false },
  version: { type: String, default: "" },
  title: { type: String, default: "" },
  logs: { type: Array, default: () => [] },
});

const emit = defineEmits(["close"]);

const { t } = useI18n();
</script>

<template>
  <Teleport to="body">
    <Transition name="vm-fade">
      <div v-if="visible" class="modal-mask" @click.self="emit('close')">
        <div class="update-log-modal" role="dialog" aria-modal="true">
          <header class="modal-head">
            <div class="head-text">
              <span class="head-title">{{ title || t("versionLog.title") }}</span>
              <span v-if="version" class="head-sub">
                {{ t("versionLog.current") }} v{{ version }}
              </span>
            </div>
            <button class="head-close" :title="t('common.close')" @click="emit('close')">
              ×
            </button>
          </header>

          <div class="log-list">
            <section v-for="log in logs" :key="log.version" class="log-item">
              <div class="log-meta">
                <span class="log-version">v{{ log.version }}</span>
                <span v-if="log.date" class="log-date">{{ log.date }}</span>
              </div>
              <ul class="log-notes">
                <li v-for="(note, i) in log.notes" :key="i">{{ note }}</li>
              </ul>
            </section>
            <p v-if="!logs.length" class="empty">{{ t("versionLog.noLogs") }}</p>
          </div>

          <footer class="modal-foot">
            <button class="ui-btn log-ok" @click="emit('close')">
              {{ t("versionLog.close") }}
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
}

.update-log-modal {
  width: 600px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  background: var(--bg-1);
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.modal-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--bg-2);
  border-bottom: 1px solid var(--border);
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

.log-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
  overflow-y: auto;
}

.log-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.log-item:first-child {
  border-color: var(--accent);
}

.log-meta {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.log-version {
  font-family: var(--font-mono);
  font-size: 15px;
  font-weight: 600;
  color: var(--accent-strong);
}

.log-date {
  font-size: 12px;
  color: var(--text-faint);
}

.log-notes {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.log-notes li {
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-dim);
}

.empty {
  margin: 0;
  padding: 20px 0;
  text-align: center;
  font-size: 12px;
  color: var(--text-faint);
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  padding: 12px 14px;
  background: var(--bg-2);
  border-top: 1px solid var(--border);
}

.log-ok {
  padding: 6px 20px;
  background: var(--accent-dim);
  border-color: var(--accent);
  color: var(--accent-strong);
  font-weight: 600;
}

.log-ok:hover {
  background: var(--accent);
  border-color: var(--accent-strong);
  color: #1a1a1a;
}

.vm-fade-enter-active,
.vm-fade-leave-active {
  transition: opacity 0.18s ease;
}

.vm-fade-enter-from,
.vm-fade-leave-to {
  opacity: 0;
}
</style>
