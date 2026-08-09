import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 项目站部署时通过 VITE_BASE 注入 base（如 /t2industry-v2/）
  base: process.env.VITE_BASE || "/",
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.join(import.meta.dirname, './src'),
    },
  },
});
