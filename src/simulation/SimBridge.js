/**
 * SimBridge — 蓝图编辑器与 t2industry-sim-engine 的桥接层
 *
 * 调用方式严格对齐库的测试示例：
 *   const runtime = createSimulation({ blueprint, recipes, onStart, onUpdate, onStop });
 *   runtime.start();
 *   runtime.engine.update();  // 单步
 *   runtime.stop();
 */
import { ref, computed } from "vue";
import { createSimulation, loadBlueprint, loadRecipes } from "t2industry-sim-engine";
import { useStorageStore, useResourcesStore } from "@/engine/plugin/api.js";
import { initMaskMap, updateMask, clearMaskMap } from "@/simulation/SimRender.js";

/* ------------------------------------------------------------------ */
/*  响应式状态                                                          */
/* ------------------------------------------------------------------ */

const running = ref(false);
const tick = ref(0);
const gameSeconds = ref(0);
const elapsedMs = ref(0);
const snapshot = ref(null);
const error = ref(null);

/** SimPanel 折叠状态，与左侧 SimStatsPanel 联动 */
const panelCollapsed = ref(false);

const params = ref({
  intervalMs: 100,
  gameSecPerTick: 2,
  reportEveryTicks: 1,
});

/* ------------------------------------------------------------------ */
/*  内部实例                                                            */
/* ------------------------------------------------------------------ */

let runtime = null;

/* ------------------------------------------------------------------ */
/*  蓝图 → sim-engine 数据转换                                          */
/* ------------------------------------------------------------------ */

function buildSimBlueprint() {
  const storageStore = useStorageStore();
  const current = storageStore.blueprints[storageStore.current_blueprint];
  if (!current) throw new Error("No active blueprint");

  // loadBlueprint 期望 { id, name, content: { machines, belts, pipes } }
  const content = current.content || {
    machines: storageStore.machines,
    belts: storageStore.belts,
    pipes: storageStore.pipes,
  };

  return loadBlueprint({
    id: current.id,
    name: current.name,
    content: {
      machines: deepClone(content.machines || {}),
      belts: deepClone(content.belts || {}),
      pipes: deepClone(content.pipes || {}),
    },
  });
}

function buildSimRecipes() {
  const resourcesStore = useResourcesStore();
  // loadRecipes(data_json) 内部取 data_json.recipes，需包一层
  const recipesArr = Object.values(resourcesStore.recipes || {});
  return loadRecipes({ recipes: recipesArr });
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/* ------------------------------------------------------------------ */
/*  回调：从快照同步响应式状态                                          */
/* ------------------------------------------------------------------ */

function applySnapshot(snap) {
  if (!snap) return;
  tick.value = snap.tick ?? 0;
  gameSeconds.value = snap.gameSeconds ?? 0;
  elapsedMs.value = snap.elapsedMs ?? 0;
  snapshot.value = snap;
}

/* ------------------------------------------------------------------ */
/*  生命周期                                                            */
/* ------------------------------------------------------------------ */

/**
 * 基于当前蓝图创建 runtime（不启动）。
 * 严格对齐示例：createSimulation({ blueprint, recipes, onStart, onUpdate, onStop })
 */
function prepare() {
  error.value = null;
  try {
    const blueprint = buildSimBlueprint();
    const recipes = buildSimRecipes();

    console.log("[SimBridge] blueprint:", {
      machines: Object.keys(blueprint.machines).length,
      belts: Object.keys(blueprint.belts).length,
      pipes: Object.keys(blueprint.pipes).length,
    });
    console.log("[SimBridge] recipes:", Object.keys(recipes).length);

    runtime = createSimulation({
      blueprint,
      recipes,
      intervalMs: Math.max(16, params.value.intervalMs),
      reportEveryTicks: params.value.reportEveryTicks,
      gameSecPerTick: params.value.gameSecPerTick,
      onStart(snap) {
        console.log("[SimBridge] onStart tick=", snap.tick);
        running.value = true;
        window.__T2_CONFIG__.running = true;
        initMaskMap(snap);
        applySnapshot(snap);
      },
      onUpdate(snap) {
        //console.log("[SimBridge] onUpdate tick=", snap.tick);
        //console.log(snap);
        updateMask(snap);
        applySnapshot(snap);
      },
      onStop(snap) {
        console.log("[SimBridge] onStop tick=", snap.tick);
        running.value = false;
        window.__T2_CONFIG__.running = false;
        clearMaskMap();
        applySnapshot(snap);
      },
    });

    // 初始化状态（不启动定时器）
    tick.value = 0;
    gameSeconds.value = 0;
    elapsedMs.value = 0;
    snapshot.value = runtime.engine.snapshot();

    console.log("[SimBridge] prepare done, runtime created");
    return true;
  } catch (e) {
    error.value = e.message || String(e);
    console.error("[SimBridge] prepare failed:", e);
    return false;
  }
}

/** 启动连续模拟：runtime.start() 内部 setInterval 驱动，回调自动触发 */
function start() {
  console.log("[SimBridge] start() called, running=", running.value, "runtime=", !!runtime);
  if (running.value) return;
  if (!runtime) {
    const ok = prepare();
    if (!ok) return;
  }
  try {
    runtime.start();
    // runtime.start() 内部同步触发 onStart，已设置 running=true
    // 这里再保险设置一次
    running.value = true;
    console.log("[SimBridge] start() done, timer started");
  } catch (e) {
    error.value = e.message || String(e);
    console.error("[SimBridge] start failed:", e);
  }
}

/** 停止连续模拟 */
function stop() {
  console.log("[SimBridge] stop() called");
  if (!runtime) return;
  try {
    runtime.stop();
    running.value = false;
  } catch (e) {
    error.value = e.message || String(e);
    console.error("[SimBridge] stop failed:", e);
  }
}

/**
 * 单步推进一个 tick。
 * 对齐示例：runtime.engine.update()
 * update() 内部当 tick % reportEvery === 0 时触发 reporter.update → onUpdate
 */
function step() {
  if (!runtime) {
    const ok = prepare();
    if (!ok) return;
  }
  try {
    runtime.engine.update();
    // 单步模式下 reportEveryTicks=1，每次 update 都会触发 onUpdate 回调
    // 这里再手动同步一次，确保即使回调没触发也能更新状态
    applySnapshot(runtime.engine.snapshot());
  } catch (e) {
    error.value = e.message || String(e);
    console.error("[SimBridge] step failed:", e);
    stop();
  }
}

/** 重置：停止并销毁 runtime */
function reset() {
  console.log("[SimBridge] reset() called");
  if (runtime) {
    try { runtime.stop(); } catch { /* ignore */ }
    runtime = null;
  }
  running.value = false;
  tick.value = 0;
  gameSeconds.value = 0;
  elapsedMs.value = 0;
  snapshot.value = null;
  error.value = null;
}

/**
 * 更新模拟参数。
 * - gameSecPerTick：运行中即时生效
 * - intervalMs / reportEveryTicks：需重建 runtime（createSimulation 启动时固定）
 */
function setParams(patch) {
  Object.assign(params.value, patch);
  if (!runtime) return;

  if (patch.gameSecPerTick !== undefined) {
    runtime.engine.setGameSecPerTick(params.value.gameSecPerTick);
  }

  // intervalMs 和 reportEveryTicks 在 createSimulation 闭包中固定，
  // 运行中修改需要重建 runtime
  if (
    running.value &&
    (patch.intervalMs !== undefined || patch.reportEveryTicks !== undefined)
  ) {
    stop();
    runtime = null;
    prepare();
    start();
  }
}

/* ------------------------------------------------------------------ */
/*  统计计算                                                            */
/* ------------------------------------------------------------------ */

const machineCount = computed(() => {
  const storageStore = useStorageStore();
  const current = storageStore.blueprints[storageStore.current_blueprint];
  const machines = current?.content?.machines || storageStore.machines;
  return Object.keys(machines).length;
});

const beltCount = computed(() => {
  const storageStore = useStorageStore();
  const current = storageStore.blueprints[storageStore.current_blueprint];
  const belts = current?.content?.belts || storageStore.belts;
  return Object.keys(belts).length;
});

const pipeCount = computed(() => {
  const storageStore = useStorageStore();
  const current = storageStore.blueprints[storageStore.current_blueprint];
  const pipes = current?.content?.pipes || storageStore.pipes;
  return Object.keys(pipes).length;
});

/* ------------------------------------------------------------------ */
/*  导出                                                                */
/* ------------------------------------------------------------------ */

export {
  running,
  tick,
  gameSeconds,
  elapsedMs,
  snapshot,
  error,
  params,
  panelCollapsed,
  machineCount,
  beltCount,
  pipeCount,
  prepare,
  start,
  stop,
  step,
  reset,
  setParams,
};
