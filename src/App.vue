<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import EditorShell from "@/components/editor/EditorShell.vue";
import UpdateLogModal from "@/components/common/UpdateLogModal.vue";

const { tm } = useI18n();

/** localStorage 中记录的用户上次已读版本 */
const SEEN_KEY = "t2industry.last_seen_version";

/** 当前版本：由 vite-plugin-version-mark 注入（head 脚本运行时写入 globalThis） */
function readCurrentVersion() {
  try {
    return globalThis["__T2INDUSTRY_V2_VERSION__"] || "";
  } catch {
    return "";
  }
}

const currentVersion = readCurrentVersion();

/** 更新日志（i18n 数据，已按新 → 旧排列） */
const logs = computed(() => tm("versionLog.logs"));

const showUpdateLog = ref(false);

/** 取用户上次已读版本之后的更新日志；上次版本不在列表中时展示全部 */
function collectNewLogs(lastSeen, allLogs) {
  const seenIdx = allLogs.findIndex((l) => l.version === lastSeen);
  return seenIdx === -1 ? allLogs : allLogs.slice(0, seenIdx);
}

onMounted(() => {
  if (!currentVersion) return;
  const lastSeen = localStorage.getItem(SEEN_KEY) || "";
  if (lastSeen === currentVersion) return;
  if (collectNewLogs(lastSeen, logs.value).length) {
    showUpdateLog.value = true;
  }
});

/** 关闭弹窗时记录已读版本，避免下次再弹 */
function closeUpdateLog() {
  showUpdateLog.value = false;
  if (currentVersion) {
    localStorage.setItem(SEEN_KEY, currentVersion);
  }
}
</script>

<template>
  <EditorShell />
  <UpdateLogModal
    :visible="showUpdateLog"
    :version="currentVersion"
    :logs="logs"
    @close="closeUpdateLog"
  />
</template>
