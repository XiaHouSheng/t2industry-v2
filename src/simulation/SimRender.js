import { SimMaskGraphic } from "../engine/core_graphic/SimMaskGraphic";
import { useStorageStore } from "../engine/plugin/api.js";
import { simulationContainer } from "../engine/core_stage/SimStage.js";

let simMaskMap = {};

export function prepareMaskMap(snap_machine) {
  if (!snap_machine) return;
  if (simMaskMap[snap_machine.id]) return;
  const storage = useStorageStore();
  const machine_local = storage.machines[snap_machine.id];
  if (!machine_local) return;
  const position = { gridX: machine_local.gridX, gridY: machine_local.gridY };
  const size = {
    gridWidth: machine_local.gridWidth,
    gridHeight: machine_local.gridHeight,
  };
  const sim_mac_graphic = new SimMaskGraphic(
    position,
    size,
    machine_local.anchor[machine_local.rotation],
  );
  simMaskMap[snap_machine.id] = sim_mac_graphic;
  simulationContainer.addChild(sim_mac_graphic);
}

export function initMaskMap(snap) {
  simMaskMap = {};
  for (let key of Object.keys(snap.machines)) {
    const sim_machine = snap.machines[key];
    if (!sim_machine.status) continue;
    prepareMaskMap(sim_machine);
  }
}

export function updateMask(snap) {
  console.log(snap.machines);
  for (let key of Object.keys(snap.machines)) {
    const sim_machine = snap.machines[key];
    if (!simMaskMap[sim_machine.id]) continue;
    simMaskMap[sim_machine.id].changeColorByStatus(sim_machine.status);
  }
}

export function clearMaskMap() {
  Object.values(simMaskMap).forEach((sim_mac_graphic) => {
    simulationContainer.removeChild(sim_mac_graphic);
  });
  simMaskMap = {};
}
