<script setup>
/**
 * Toast — 全局轻提示容器
 *
 * 在应用根部放置唯一实例（App.vue），通过 useToast().toast() 命令式调用。
 * 类型：success（绿）/ error（红）/ info（accent）。
 */
import { useToast } from "./useToast.js";

const { toasts, removeToast } = useToast();

function icon(type) {
  if (type === "success") return "✓";
  if (type === "error") return "×";
  return "i";
}
</script>

<template>
  <Teleport to="body">
    <TransitionGroup name="tst" tag="div" class="toast-container" role="status">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast"
        :class="`toast--${t.type}`"
      >
        <span class="toast-icon">{{ icon(t.type) }}</span>
        <span class="toast-msg">{{ t.message }}</span>
        <button class="toast-close" title="×" @click="removeToast(t.id)">
          ×
        </button>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 400;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--bg-2);
  border: 1px solid var(--border-strong);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  font-size: 13px;
  color: var(--text);
}

.toast--success {
  border-color: rgba(80, 200, 120, 0.6);
}

.toast--error {
  border-color: var(--danger);
}

.toast--info {
  border-color: var(--accent);
}

.toast-icon {
  flex: none;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  color: #0e1013;
}

.toast--success .toast-icon {
  background: #50c878;
}

.toast--error .toast-icon {
  background: var(--danger);
}

.toast--info .toast-icon {
  background: var(--accent);
}

.toast-msg {
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toast-close {
  flex: none;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 50%;
  color: var(--text-faint);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

.toast-close:hover {
  background: var(--bg-3);
  color: var(--text);
}

/* 进出场动画：自顶部滑入 + 淡入，离开时淡出并向上收起 */
.tst-enter-active,
.tst-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.tst-enter-from {
  opacity: 0;
  transform: translateY(-14px);
}

.tst-leave-to {
  opacity: 0;
  transform: translateY(-14px);
}

.tst-move {
  transition: transform 0.2s ease;
}
</style>