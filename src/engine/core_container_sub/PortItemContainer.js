import { MachineContainer } from "../core_container_sub/MachineContainer";
import { parseMaskCell } from "../core_middleware/MaskUtil";
import { Container, Graphics, BlurFilter } from 'pixi.js';

export class PortItemContainer extends MachineContainer {
  constructor(machine) {
    super(machine);
  }

  renderRecipeUI() {
    let item_color = "white";
    const mask = this.machine.mask || this.machine.defaultMask;
    for (let row = 0; row < mask.length; row++) {
      for (let col = 0; col < mask[row].length; col++) {
        const cell = mask[row][col];
        if (cell === "ma") continue;
        const parsed = parseMaskCell(cell);
        if (!parsed) continue;
        const { type, dir, portId } = parsed;
        if (!portId) continue;
        const itemId = this.machine.port_recipe_icon[portId];
        if (!itemId) continue;
        const iconSize = Math.min(this.cellWidth, this.cellHeight) * 0.8;
        const item_icon = this.createItemIcon(itemId, iconSize);
        item_icon.x = this.cellWidth * col + this.cellWidth / 2;
        item_icon.y = this.cellHeight * row + this.cellHeight / 2;
        item_color = this.resourcesStore.icons[itemId].color;
        this.recipeContainer.addChild(item_icon);
      }
    }
    this.drawGasDisperserArea(this.machine, item_color);
  }

  // 气体范围指示常驻
  drawGasDisperserArea(machine_entity, item_color) {
    if (!machine_entity || machine_entity.type != "gas_disperser_1") return;
    if (this.gas_indicator) this.removeChild(this.gas_indicator);

    const width  = 13 * this.cellWidth;
    const height = 13 * this.cellHeight;
    const x = this.cellWidth  * 1.5;
    const y = this.cellHeight * 1.5;

    this.gas_indicator = new Container();
    this.gas_indicator.pivot.set(width * 0.5, height * 0.5);

    // 外发光层：粗描边 + 高斯模糊
    const glow = new Graphics();
    glow.roundRect(x, y, width, height, 2);
    glow.stroke({ color: item_color, width: 10, alpha: 0.5 });
    glow.filters = [new BlurFilter({ strength: 8, quality: 4, kernelSize: 5  })];

    // 清晰描边层
    const border = new Graphics();
    border.roundRect(x, y, width, height, 2);
    border.stroke({ color: item_color, width: 2, alpha: 0.4 });

    this.gas_indicator.addChild(glow, border);
    this.addChild(this.gas_indicator);
}



}
