import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import './style.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// 初始化主题
import { useThemeStore } from './stores/themeStore';
const themeStore = useThemeStore(pinia);
themeStore.loadTheme();

app.mount('#app');
