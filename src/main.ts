import { createApp } from 'vue';
import App from './App.vue';
import DataVVue3 from '@kjgl77/datav-vue3';
import './assets/scss/style.scss';
import './assets/icon/iconfont.css';
import router from './router/index';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import zhCn from 'element-plus/es/locale/lang/zh-cn'
// import '@/lib/element-plus-theme/slider.scss'
// import '@/lib/element-plus-theme/button.scss'
// @import url('../../../lib/element-plus-theme/slider.scss');
// @import url('../../../lib/element-plus-theme/button.scss');
// import './lib/element-plus-theme/index.scss'

import 'mapbox-gl/dist/mapbox-gl.css';

import { createPinia } from 'pinia';

// import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia();
// pinia.use(piniaPluginPersistedstate) //持久化插件
const app = createApp(App);

app.use(ElementPlus, {
  locale: zhCn,
});
app.use(DataVVue3);
app.use(router);
app.use(pinia);
app.mount('#app');
