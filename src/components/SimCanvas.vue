<script setup>
/**
 * SimCanvas.vue — 引擎舞台的宿主容器
 *
 * 只负责 Pixi 应用的挂载/销毁与键盘监听注册，
 * 所有引擎能力均从门面 api.js 导入，保持 UI 与引擎内部实现解耦。
 */
import { ref, onMounted, onUnmounted } from "vue";
import {
  app,
  useStorageStore,
  drawGridLines,
  drawHitArea,
  initIndicator,
  resetPosition,
  resetScale,
  initStoreBlueprint,
  handleKeyboard,
  handleKeyboardForZoom,
  handleKeyboardUp,
} from "@/engine/plugin/api.js";

const storageStore = useStorageStore();
const canvas = ref(null);

(async () => {
  globalThis.__PIXI_APP__ = app;
  drawGridLines();
  drawHitArea();
  initIndicator();
  resetPosition();
  resetScale();
  await app.init({
    width: storageStore.width,
    height: storageStore.height,
    backgroundColor: storageStore.backgroundColor,
    backgroundAlpha: storageStore.backgroundAlpha,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  canvas.value.appendChild(app.canvas);
  initStoreBlueprint();
})();

onMounted(() => {
  window.addEventListener("keydown", handleKeyboard);
  window.addEventListener("keydown", handleKeyboardForZoom);
  window.addEventListener("keyup", handleKeyboardUp);
});

onUnmounted(() => {
  app.destroy();
  window.removeEventListener("keydown", handleKeyboard);
  window.removeEventListener("keydown", handleKeyboardForZoom);
  window.removeEventListener("keyup", handleKeyboardUp);
});
</script>

<template>
  <div ref="canvas" class="sim-canvas"></div>
</template>

<style scoped>
.sim-canvas {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
