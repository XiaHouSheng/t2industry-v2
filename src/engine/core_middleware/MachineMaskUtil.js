/**
 * MachineMaskUtil — 机器 mask / port_recipe_icon 配置查询与实例注入
 *
 * 数据源：ResourcesStore.machine_masks（加载自 configs/machine_mask_config.json）
 * 结构：{ 机器id: { mask: { mode: [...] }, port_recipe_icon: { mode: {...} } } }
 * 机器实例上的 mask / port_recipe_icon 在 createMachine / switchMachineMode 时注入。
 */

import { useResourcesStore } from "../stores/ResourcesStore.js";
import { rotateMask } from "./MaskUtil.js";

/**
 * 查询机器指定模式的 mask 配置
 * mode 缺失或不存在时回退 "default"
 * @param {string} type - 机器类型 id
 * @param {string} [mode] - 模式名
 * @returns {{ mask: string[][], port_recipe_icon: object } | null} 查不到返回 null
 */
function getMachineMaskConfig(type, mode) {
  const entry = useResourcesStore().machine_masks[type];
  if (!entry) return null;
  const modeKey = mode && entry.mask?.[mode] != null ? mode : "default";
  const mask = entry.mask?.[modeKey];
  const port_recipe_icon = entry.port_recipe_icon?.[modeKey];
  if (!mask) return null;
  return { mask, port_recipe_icon: port_recipe_icon ?? {} };
}

/**
 * 按机器 type + now_mode 解析并注入实例的 mask / port_recipe_icon
 * 深拷贝注入，避免实例间共享引用、避免旋转污染配置；
 * 配置查不到时不覆盖实例现有字段（兜底内联 mask 的机器类型）
 * @param {object} machine - 机器实例（需含 type / now_mode）
 */
function resolveMachineMaskData(machine) {
  const config = getMachineMaskConfig(machine.type, machine.now_mode);
  if (!config) return;
  // store 数据为 reactive Proxy，structuredClone 无法克隆，改用 JSON 深拷贝
  let mask = JSON.parse(JSON.stringify(config.mask));
  // 按当前旋转状态（port_offset_index 次顺时针 90°）在注入前旋转，保持与实例朝向一致
  const rotations = (machine.port_offset_index ?? 0) % 4;
  for (let i = 0; i < rotations; i++) {
    mask = rotateMask(mask);
  }
  machine.mask = mask;
  machine.port_recipe_icon = JSON.parse(JSON.stringify(config.port_recipe_icon));
}

/**
 * 获取机器类型 default 模式的 mask（供放置检测/区域映射使用）
 * @param {string} type - 机器类型 id
 * @returns {string[][] | null}
 */
function getMaskForType(type) {
  return getMachineMaskConfig(type)?.mask ?? null;
}

export { getMachineMaskConfig, resolveMachineMaskData, getMaskForType };
