/**
 * getBlueprintSize — 蓝图尺寸归一化
 *
 * 蓝图 `size` 字段（number）对应地图网格行列数。
 * 旧版本蓝图可能缺失该字段，统一回退默认 50。
 */
export function getBlueprintSize(blueprint) {
  const n = Number(blueprint?.size);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 50;
}