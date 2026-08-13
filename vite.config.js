import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import { vitePluginVersionMark } from "vite-plugin-version-mark";
// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 项目站部署时通过 VITE_BASE 注入 base（如 /t2industry-v2/）
  base: process.env.VITE_BASE || "/",
  plugins: [
    vue(),
    // 版本维护：注入 __T2INDUSTRY_V2_VERSION__ 全局变量、HTML meta 与 console 标记，
    // 构建时在 dist 输出 version.json（{ "version": "..." }）供运行时版本检测
    vitePluginVersionMark({
      name: "t2industry-v2",
      ifGlobal: true,
      ifLog: true,
      ifMeta: true,
      outputFile: (version) => ({
        path: "version.json",
        content: JSON.stringify({ version }),
      }),
    }),
  ],
  resolve: {
    alias: {
      "@": path.join(import.meta.dirname, './src'),
    },
  },
});
