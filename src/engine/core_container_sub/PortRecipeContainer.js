import { Container } from "pixi.js";
import { MachineContainer } from "../core_container_sub/MachineContainer";
import { parseMaskCell } from "../core_middleware/MaskUtil";

export class PortRecipeContainer extends MachineContainer {
  constructor(machine) {
    super(machine);
  }

  renderBody() {
    this.renderPorts();
    this.renderBackground();
    this.renderUI(true, true);
    this.renderRecipePort();
  }

  renderRecipePort(force = false) {
    const machine = this.machine;

    // 1. 解析当前配方（now_recipe 优先，缺省用第一个可生产配方）
    const recipeIds = machine.recipe_id;
    if (!recipeIds || recipeIds.length === 0) return;
    const recipe =
      this.resourcesStore.recipes[machine.now_recipe || recipeIds[0]];
    if (!recipe) return;

    // 2. 只取液体/气体输出（gas_ / liquid_ 前缀），最多两个
    const fluidOuts = Object.keys(recipe.out || {}).filter(
      (id) => id.startsWith("gas_") || id.startsWith("liquid_"),
    );

    // 3. 先写 port_recipe_icon：按当前机器实际拥有的端口键分配
    //    已存在的配置不覆盖（保留手动指定的端口图标，允许手动设 null 清除）
    if (!machine.port_recipe_icon) machine.port_recipe_icon = {};
    const outPortKeys = Object.keys(machine.port_recipe_icon).filter(
      (key) => !key.startsWith("pi"),
    );
    if (fluidOuts.length && outPortKeys.length) {
      outPortKeys.forEach((portId, i) => {
        if (!machine.port_recipe_icon[portId] || force) {
          machine.port_recipe_icon[portId] =
            fluidOuts[Math.min(i, fluidOuts.length - 1)];
        }
      });
    }

    // 4. 重建 recipeContainer：先销毁旧节点（含中间配方图标 + 旧端口图标），
    //    再重绘中间配方图标，最后画端口图标。确保手动设为 null 时旧图标立即被清掉。
    if (this.recipeContainer) {
      this.uiContainer.removeChild(this.recipeContainer);
      this.recipeContainer.destroy({ children: true });
    }
    this.recipeContainer = new Container();
    this.uiContainer.addChild(this.recipeContainer);
    // 重绘中间的配方 in/out 图标
    this.renderRecipeUI();

    // 5. 画端口图标：即使 itemId 为 null 也不跳过，由重建阶段保证清空
    const mask = machine.mask || machine.defaultMask;
    for (let row = 0; row < mask.length; row++) {
      for (let col = 0; col < mask[row].length; col++) {
        const cell = mask[row][col];
        if (cell === "ma") continue;
        const parsed = parseMaskCell(cell);
        if (!parsed) continue;
        const { portId } = parsed;
        if (!portId) continue;
        const itemId = machine.port_recipe_icon[portId];
        if (!itemId) continue;
        const iconSize = Math.min(this.cellWidth, this.cellHeight) * 0.8;
        const item_icon = this.createItemIcon(itemId, iconSize);
        item_icon.x = this.cellWidth * col + this.cellWidth / 2;
        item_icon.y = this.cellHeight * row + this.cellHeight / 2;
        this.recipeContainer.addChild(item_icon);
      }
    }
  }

  refreshRecipeUI() {
    super.refreshRecipeUI();
    this.renderRecipePort(true);
  }
}
