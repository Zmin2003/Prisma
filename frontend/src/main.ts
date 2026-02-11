import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './style.css';

function updateAppHeight() {
  const height = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${Math.round(height)}px`);
}

updateAppHeight();
window.addEventListener('resize', updateAppHeight, { passive: true });
window.addEventListener('orientationchange', updateAppHeight, { passive: true });
window.visualViewport?.addEventListener('resize', updateAppHeight, { passive: true });

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// 初始化主题
import { useThemeStore } from './stores/themeStore';
const themeStore = useThemeStore(pinia);
themeStore.loadTheme();

app.mount('#app');
