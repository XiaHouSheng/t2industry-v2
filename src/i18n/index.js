/**
 * i18n 配置：vue-i18n（Composition API 模式）
 * 语言偏好持久化到 localStorage。
 */
import { createI18n } from "vue-i18n";
import zhCN from "./locales/zh-CN.js";
import enUS from "./locales/en-US.js";

const STORAGE_KEY = "t2industry_locale";
const SUPPORTED = ["zh-CN", "en-US"];

function initialLocale() {
  const saved =
    typeof localStorage !== "undefined"
      ? localStorage.getItem(STORAGE_KEY)
      : null;
  return SUPPORTED.includes(saved) ? saved : "zh-CN";
}

const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: "zh-CN",
  messages: {
    "zh-CN": zhCN,
    "en-US": enUS,
  },
});

/** 切换语言并持久化 */
export function setLocale(locale) {
  if (!SUPPORTED.includes(locale)) return;
  i18n.global.locale.value = locale;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, locale);
  }
}

export default i18n;
