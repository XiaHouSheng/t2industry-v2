# T2industry 游戏蓝图编辑器

<p align="center">
  <img src="docs/assests/logo_512px_transparent.png" alt="T2 工业蓝图编辑器 logo" width="128" />
</p>

一个运行在浏览器中的 **《明日方舟：终末地》** 蓝图 / 工厂布局编辑器，基于 Vue 3 与 PIXI.js 构建。你可以在网格画布上放置机器、传送带与管道，切换蓝图，并配置机器的配方与端口图标——全部在浏览器内完成，无需后端。

> **English version: [README.md](README.md)**

## 演示

<p align="center">
  <img src="docs/assests/2026-08-09115620-ezgif.com-cut.gif" alt="编辑器演示" width="720" />
</p>

## 功能特性

- **蓝图管理** — 新建 / 切换 / 删除蓝图，支持导入导出文件，浏览器本地持久化保存
- **画布舞台** — 基于网格的放置，支持缩放 / 平移 / 复位视图（PIXI.js 渲染）
- **机器与节点栏** — 底部悬浮栏，按 `category` 分组展示机器（目前全部归入"默认"类）以及节点（传送带 / 管道的分流、合流、十字）
- **配方选择** — 点击机器弹出配方模态框，可从可选配方中切换，并查看当前配方的输入 / 输出物料
- **端口图标配置** — 按机型配置输出端口图标（`po1/po2`、`bo1–bo6`、`pi1` …），每个端口有独立的候选列表，并提供"清空"选项
- **快捷键** — `X` 选择、`E` 传送带、`Q` 管道、`R` 旋转、`F` 删除、`Esc` 取消、`Ctrl+S` 保存
- **国际化** — 简体中文与英文，可在顶部栏一键切换，语言偏好持久化

## 技术栈

- [Vue 3](https://vuejs.org/)（`<script setup>`）+ [Vite](https://vitejs.dev/)
- [Pinia](https://pinia.vuejs.org/) + 持久化插件
- [PIXI.js](https://pixijs.com/) 8.x 画布渲染
- [vue-i18n](https://vue-i18n.intlify.dev/) 国际化

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

引擎与 UI 完全解耦：所有 UI 组件仅通过 `src/engine/plugin/api.js` 门面与引擎通信；`engine/` 目录为 PIXI 画布引擎，UI 层不应直接修改其内部实现。

## 项目结构（概览）

```
src/
├── components/
│   ├── SimCanvas.vue          # PIXI 舞台挂载
│   └── editor/
│       ├── EditorShell.vue    # 布局与 UI↔引擎桥接
│       ├── TopBar.vue         # 顶部工具栏：蓝图、工具、语言切换
│       ├── PlaceBar.vue       # 底部悬浮机器 / 节点放置栏
│       ├── RecipeModal.vue    # 配方与端口图标配置
│       ├── SpriteIcon.vue     # icons.webp 精灵图图标
│       └── StatusBar.vue      # 底部状态栏
├── engine/                    # PIXI 画布引擎（解耦）
├── i18n/                      # vue-i18n 配置与文案
├── stores/                    # UI 状态
└── main.js
public/
├── configs/                   # machines.json / data.json / recipes 等配置
└── resources/                 # 贴图、icons.webp、machine_icons 等资源
```

## 国际化

- 文案文件：`src/i18n/locales/zh-CN.js` 与 `src/i18n/locales/en-US.js`
- 默认语言：**简体中文**；可通过顶部栏的 `EN / 中文` 按钮切换到英文
- 语言选择保存在 `localStorage` 中

## 免责声明

本项目为 **非官方的同人工具**，与鹰角网络（Hypergryph）及其子公司**没有任何关联、认可或合作关系**。

- 《明日方舟：终末地》及其相关游戏资源（美术、图标、名称、配置等）均归各自权利方所有。
- 本项目使用的游戏数据仅用于学习与参考，随时可能被修改或移除。
- 本项目仅供**个人 / 学习交流**使用，**禁止用于商业分发**。
- 如您认为相关内容侵犯了您的权益，请联系维护者，我们将及时处理。
