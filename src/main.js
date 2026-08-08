import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { initLoader } from './engine/plugin/api.js'

const app = createApp(App)
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)

// 引擎资源加载（机器配置/纹理等）完成后，再挂载 UI
initLoader().finally(() => {
  app.mount('#app')
})
