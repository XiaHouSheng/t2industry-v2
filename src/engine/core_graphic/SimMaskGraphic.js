import { IndicatorGraphic } from "./IndicatorGraphic";
import { Graphics } from "pixi.js";

export class SimMaskGraphic extends IndicatorGraphic {
  constructor(
    position,
    size = { gridWidth: 1, gridHeight: 1 },
    pivot = { x: 0.5, y: 0.5 },
  ) {
    super(position, size, pivot);
    this.color_map = { free: "#2ecc71", work: "#f39c12", block: "#e74c3c" };
    this.status = "free";
  }

  renderMaskGraphic() {
    this.background = new Graphics();
    this.background.rect(
      0,
      0,
      this.gridWidth * this.cellWidth,
      this.gridHeight * this.cellHeight,
    );
    this.background.fill({ color: "2ecc71", alpha: 0.5 });
    this.addChild(this.background);
  }

  changeColorByStatus(status) {
    if (!this.color_map[status]) return;
    if (this.status == status) return;
    if (!this.background) return;
    this.status = status;
    this.background.clear();
    this.background.rect(
      0,
      0,
      this.gridWidth * this.cellWidth,
      this.gridHeight * this.cellHeight,
    );
    this.background.fill({ color: this.color_map[status], alpha: 0.5 });
  }
}
