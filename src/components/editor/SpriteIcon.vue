<script setup>
/**
 * SpriteIcon — 从 icons.webp 精灵图裁剪单个物品图标（HTML/CSS 实现）
 *
 * data.json 的 icons 配置：{ id, position: "-64px 0px", color }，
 * 每个图标为 64×64 的帧。这里用 background-position 直接定位裁剪，
 * 再通过 transform: scale 缩放到目标尺寸，不依赖 PIXI 渲染。
 */
import { computed } from "vue";
import { useResourcesStore, IMAGE_BASE } from "@/engine/plugin/api.js";

const props = defineProps({
  itemId: { type: String, required: true },
  size: { type: Number, default: 40 },
});

const resourcesStore = useResourcesStore();

const iconsUrl = `${IMAGE_BASE}/resources/icons.webp`;
const icon = computed(() => resourcesStore.icons[props.itemId] || null);
const scale = computed(() => props.size / 64);

const spriteStyle = computed(() => ({
  backgroundImage: `url("${iconsUrl}")`,
  backgroundPosition: icon.value?.position || "0px 0px",
  backgroundRepeat: "no-repeat",
  transform: `scale(${scale.value})`,
}));
</script>

<template>
  <span
    class="spr-wrap"
    :style="{ width: size + 'px', height: size + 'px' }"
  >
    <span class="spr" :style="spriteStyle"></span>
  </span>
</template>

<style scoped>
.spr-wrap {
  display: inline-block;
  flex: none;
  overflow: hidden;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
}

.spr {
  display: block;
  width: 64px;
  height: 64px;
  transform-origin: 0 0;
}
</style>
