import {
  saveMachine,
  dropMachine,
  getMachineGridPosition,
} from "../core_storage/MachineStorage.js";
import { drawMachine, dropDrawMachine } from "../core_stage/MachineStage.js";
import { useMachineStore } from "../stores/MachineStore.js";
import { useStorageStore } from "../stores/StorageStore.js";
import { nanoid } from "nanoid";
import { rotateMask } from "../core_middleware/MaskUtil.js";
import { resolveMachineMaskData } from "../core_middleware/MachineMaskUtil.js";
/**
 * 创建机器
 * @param {
 *     id: string,
 *     type: string,
 *     x: number,
 *     y: number,
 *     width: number,
 *     height: number,
 *     rotation: number,
 *     anchor: {
 *       x: number,
 *       y: number,
 *     },
 *     gridWidth: number,
 *     gridHeight: number,
 *     gridX: number,
 *     gridY: number,
 *     x: number,
 *     y: number,
 *
 * } machine 机器对象
 * @returns 机器对象
 */

// 创建机器
function createMachine(typename) {
  const machineStore = useMachineStore();
  const machine = { ...machineStore.machineTypes[typename] };
  machine.id = nanoid();
  machine.type = typename;
  machine.rotation = 0;
  machine.port_offset_index = 0;
  machine.now_recipe = null;
  // 优先使用机器类型配置中的 now_mode，缺失时回退 default
  machine.now_mode = machine.now_mode ?? "default";
  // 从 machine_mask_config 按 type + mode 注入 mask / port_recipe_icon
  resolveMachineMaskData(machine);
  return machine;
}

// 注入position
function placeMachine(machine, x, y, is_copy = false) {
  if (is_copy) {
    machine = JSON.parse(JSON.stringify(machine));
    machine.id = nanoid();
  }
  machine.gridX = x;
  machine.gridY = y;
  saveMachine(machine, drawMachine(machine));
  return machine;
}

function rotateMachine(machine) {
  const rows = machine.mask.length;
  const cols = machine.mask[0].length;
  machine.mask = rotateMask(machine.mask);
  machine.gridWidth = rows;
  machine.gridHeight = cols;
  machine.rotation = machine.rotation === 0 ? 1 : 0;
  // port 偏移指针右移（4 个旋转状态循环）
  machine.port_offset_index = ((machine.port_offset_index ?? 0) + 1) % 4;
  return machine;
}

function rotateMachineByCenter(machine, x, y) {
  // 计算旋转后的中心点坐标（顺时针 90°）
  const rotateX = x + y - machine.centerY;
  const rotateY = y - x + machine.centerX;
  machine.centerX = rotateX;
  machine.centerY = rotateY;
  // Mask旋转
  machine = rotateMachine(machine);
  // 重新计算网格坐标
  const { gridX, gridY } = getMachineGridPosition(machine);
  machine.gridX = gridX;
  machine.gridY = gridY;
  return machine;
}

// 切换机器模式
function switchMachineMode(machine, mode) {
  const storageStore = useStorageStore();
  const wasPlaced = storageStore.machines[machine.id] === machine;
  // 已放置：先按旧 mask 清除占用与视觉
  if (wasPlaced) {
    const container = dropMachine(machine);
    dropDrawMachine(container);
  }
  machine.now_mode = mode;
  // 从 machine_mask_config 按 type + mode 重新注入 mask / port_recipe_icon
  resolveMachineMaskData(machine);
  // 若 mask 尺寸变化，同步 gridWidth / gridHeight
  if (machine.mask && machine.mask.length > 0) {
    machine.gridHeight = machine.mask.length;
    machine.gridWidth = machine.mask[0].length;
  }
  // 重新放置：按新 mask 重建占用与渲染
  if (wasPlaced) {
    placeMachine(machine, machine.gridX, machine.gridY);
  }
  return machine;
}

function deleteMachine(machine) {
  dropDrawMachine(dropMachine(machine));
  return machine;
}

export {
  createMachine,
  placeMachine,
  deleteMachine,
  rotateMachine,
  rotateMachineByCenter,
  switchMachineMode,
};
