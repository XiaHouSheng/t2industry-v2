import { useStorageStore } from "../stores/StorageStore.js";
import { useMachineStore } from "../stores/MachineStore.js";
import {
  createMachine,
  placeMachine,
  deleteMachine,
} from "../core_sub/Machine.js";
import { createBelt, placeBelt, deleteBelt } from "../core_sub/Belt.js";
import { createPipe, placePipe, deletePipe } from "../core_sub/Pipe.js";
import {
  resolveMachineMaskData,
  getMachineMaskConfig,
} from "../core_middleware/MachineMaskUtil.js";

/**
 * 当前应用/配置版本：由 vite-plugin-version-mark 构建时注入全局
 * （head 脚本写入 __T2INDUSTRY_V2_VERSION__），缺失时返回空字符串
 */
function getCurrentVersion() {
  try {
    return globalThis["__T2INDUSTRY_V2_VERSION__"] || "";
  } catch {
    return "";
  }
}

export function renderBlueprint(blueprint) {
  if (!blueprint || !blueprint.content) return;
  const { machines = {}, belts = {}, pipes = {} } = blueprint.content;
  const currentVersion = getCurrentVersion();
  const needRebuild = !!currentVersion && blueprint.version !== currentVersion;
  // 浅拷贝实体后再放置：placeXxx 会写入 gridX/gridY/x/y/centerX/centerY 等字段，
  // 直接传引用会污染蓝图保存的内容
  Object.values(machines).forEach((machine) => {
    placeMachine({ ...machine }, machine.gridX, machine.gridY);
  });
  Object.values(belts).forEach((belt) => {
    placeBelt({ ...belt }, belt.gridX, belt.gridY, belt.in, belt.out);
  });
  Object.values(pipes).forEach((pipe) => {
    placePipe({ ...pipe }, pipe.gridX, pipe.gridY, pipe.in, pipe.out);
  });
  // 渲染后进行重建（rebuildBlueprint 需要从画布备份元素，故先渲染旧内容）
  if (needRebuild) {
    rebuildBlueprint();
    // 重建后同步蓝图版本，避免每次渲染重复触发重建
    blueprint.version = currentVersion;
  }
}

export function clearBlueprint() {
  const storageStore = useStorageStore();
  Object.values(storageStore.machines).forEach((machine) => {
    deleteMachine(machine);
  });
  Object.values(storageStore.belts).forEach((belt) => {
    deleteBelt(belt);
  });
  Object.values(storageStore.pipes).forEach((pipe) => {
    deletePipe(pipe);
  });
}

/**
 * 备份 → 删除 → 重新绘制（配置文件重新注入后强制对齐最新版本）
 * 机器从最新 machineTypes 配置重建（对齐新 mask/anchor/size/modes），
 * 保留备份时的位置 / 旋转 / 模式 / 配方等运行时状态。
 * 配置文件是否变更的检测逻辑由调用方负责，本方法只提供重建能力。
 */
export function rebuildBlueprint() {
  const storageStore = useStorageStore();
  const machineStore = useMachineStore();

  console.log("REBUILD BLUEPRINT");

  // 1. 备份画布上所有元素（仅保留重建所需字段，深拷贝避免引用污染）
  const backup = {
    machines: Object.values(storageStore.machines).map((m) => ({
      id: m.id,
      type: m.type,
      gridX: m.gridX,
      gridY: m.gridY,
      rotation: m.rotation,
      port_offset_index: m.port_offset_index ?? 0,
      now_mode: m.now_mode,
      now_recipe: m.now_recipe,
      port_recipe_icon: m.port_recipe_icon
        ? JSON.parse(JSON.stringify(m.port_recipe_icon))
        : null,
    })),
    belts: Object.values(storageStore.belts).map((b) => ({
      type: b.type,
      gridX: b.gridX,
      gridY: b.gridY,
      in: b.in,
      out: b.out,
    })),
    pipes: Object.values(storageStore.pipes).map((p) => ({
      type: p.type,
      gridX: p.gridX,
      gridY: p.gridY,
      in: p.in,
      out: p.out,
    })),
  };

  // 2. 删除画布上所有元素
  clearBlueprint();

  // 3. 按最新配置重新绘制
  // 机器：从最新 machineTypes 配置重建，恢复备份中的运行时状态
  backup.machines.forEach((item) => {
    // 类型已被新配置移除的机器无法重建，直接跳过
    if (!machineStore.machineTypes[item.type]) return;
    const machine = createMachine(item.type);
    machine.id = item.id;
    machine.now_mode = item.now_mode ?? "default";
    machine.port_offset_index = item.port_offset_index;
    machine.rotation = item.rotation;
    machine.now_recipe = item.now_recipe;
    // 按 mode + 旋转状态重新注入 mask / port_recipe_icon（对齐最新配置）
    resolveMachineMaskData(machine);
    // 旋转后 mask 尺寸可能与配置基础尺寸不一致，同步 gridWidth / gridHeight
    if (machine.mask && machine.mask.length > 0) {
      machine.gridHeight = machine.mask.length;
      machine.gridWidth = machine.mask[0].length;
    }
    // 恢复用户自定义的端口配方图标（覆盖配置默认值）
    // 与新版配置默认值按端口键对比：仅恢复与配置默认不同的键（即用户自定义），
    // 未自定义的端口保留新配置注入的默认图标（旧蓝图为 {} 时不再误覆盖）
    const configPortIcons =
      getMachineMaskConfig(item.type, item.now_mode)?.port_recipe_icon ?? {};
    const new_port_recipe_icon = {};
    for (const [key, value] of Object.entries(configPortIcons)) {
      const default_recipe_icon = item.port_recipe_icon || {}
      const default_value = default_recipe_icon[key] || null;
      new_port_recipe_icon[key] = default_value;
    }
    machine.port_recipe_icon = new_port_recipe_icon;
    placeMachine(machine, item.gridX, item.gridY);
  });
  // 传送带 / 管道：与配置文件无强依赖，按备份数据直接重绘
  backup.belts.forEach((item) => {
    placeBelt(createBelt(item.type), item.gridX, item.gridY, item.in, item.out);
  });
  backup.pipes.forEach((item) => {
    placePipe(createPipe(item.type), item.gridX, item.gridY, item.in, item.out);
  });
}
