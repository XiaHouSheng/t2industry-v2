<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { app } from "@/engine/core_stage/SimStage.js";
import { useStorageStore } from "@/engine/stores/StorageStore.js";
import {
  handleKeyboard,
  handleKeyboardForZoom,
  handleKeyboardUp,
} from "@/engine/core_middleware/KeyboardHandle.js";
import { drawGridLines, drawHitArea } from "@/engine/core_stage/SimInit.js";
import { resetPosition, resetScale } from "@/engine/core_stage/ScaleStage.js";
import { initIndicator } from "@/engine/core_sub/Indicator.js";

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
});
</script>

<template>
  <div ref="canvas"></div>
</template>
