<script setup>
/**
 * BaseDialog — 通用模态框外壳（可复用）
 *
 * 只负责遮罩、居中定位、进入/退出动效与 Esc 关闭，
 * 所有内容（标题/正文/按钮）由默认插槽交给调用方组合。
 *  - visible: 是否显示（保持挂载以便播放退出动画）
 *  - width:   面板宽度（默认 420px）
 *  - 关闭时通过 close 事件通知父级
 */
import { onMounted, onUnmounted } from "vue";

defineProps({
  visible: { type: Boolean, default: false },
  width: { type: String, default: "420px" },
});

const emit = defineEmits(["close"]);

function onKeydown(e) {
  if (e.key === "Escape") emit("close");
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <Teleport to="body">
    <Transition name="bd-pop">
      <div
        v-if="visible"
        class="bd-mask"
        role="dialog"
        aria-modal="true"
        @click.self="emit('close')"
      >
        <div class="bd-panel" :style="{ width }">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.bd-mask {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
}

.bd-panel {
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

.bd-pop-enter-active,
.bd-pop-leave-active {
  transition: opacity 0.18s ease;
}

.bd-pop-enter-active .bd-panel,
.bd-pop-leave-active .bd-panel {
  transition: transform 0.18s ease;
}

.bd-pop-enter-from,
.bd-pop-leave-to {
  opacity: 0;
}

.bd-pop-enter-from .bd-panel {
  transform: scale(0.95);
}

.bd-pop-leave-to .bd-panel {
  transform: scale(0.97);
}
</style>