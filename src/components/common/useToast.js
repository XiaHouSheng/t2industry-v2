/**
 * useToast — 全局 Toast 组合式函数
 *
 * 模块级响应式数组 + 命令式调用：
 *   const { toast } = useToast();
 *   toast("保存成功", "success");
 */
import { ref } from "vue";

const toasts = ref([]);
let seq = 0;

export function useToast() {
  function removeToast(id) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  function toast(message, type = "success", duration = 2500) {
    const id = ++seq;
    toasts.value.push({ id, message, type });
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }

  return { toasts, toast, removeToast };
}