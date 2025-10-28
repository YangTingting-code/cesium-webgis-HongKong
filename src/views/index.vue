<template>
  <div class="screen-wrapper">
    <div
      id="index"
      ref="appRef"
    >
      <div class="bg">
        <!-- 一开始是显示loading中间那个圈圈一直在转 中间圈圈就是加载时最大的图块? 所以是lcp优化的假象-->
        <dv-loading v-if="loading"> 
          Loading...
        </dv-loading>
        <div
          v-else
          class="host-body"
        >
          <div class="decoration">
            <!-- 第一行 -->
            <div class="d-flex jc-between top">
              <!-- 装饰 -->
              <dv-decoration-10 class="dv-dec-10" />

              <dv-decoration-8 class="dv-dec-8" />

              <div class="title">
                <span class="title-text">{{ title }}</span>
                <dv-decoration-6
                  class="dv-dec-6"
                  :reverse="true"
                  :color="['#50e3c2', '#67a1e5']"
                />
              </div>

              <dv-decoration-8
                :reverse="true"
                class="dv-dec-8"
              />

              <dv-decoration-10 class="dv-dec-10-s" />
            </div>
            <!-- 第二行 -->
            <div class="d-flex jc-between">
              <div class="d-flex aside-width">
                <div class="react-left react-l-l">
                  <span class="react-before" />
                  <topRegSel />
                </div>
                <div class="react-left">
                  <span class="text">{{ title }}</span>
                </div>
              </div>
              <div class="d-flex aside-width">
                <div class="react-right">
                  <span class="text">{{ title }}</span>
                </div>
                <div class="react-right react-r-l">
                  <span class="react-after" />
                  <nowTime />
                </div>
              </div>
            </div>
          </div>
          <!-- 第三行 -->
          <div class="body-box">
            <div class="left-box">
              <dv-border-box-12>
                <left />
              </dv-border-box-12>
            </div>
            <div class="map-box">
              <cesium />
            </div>
            <div class="right-box">
              <dv-border-box-12> 
                <right />
              </dv-border-box-12>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  provide,
  ref,
  onMounted,
  onBeforeUnmount,
} from 'vue';
import { title } from '../constant/index';
import cesium from './cesium/index.vue';
import left from './leftPanel/index.vue'
import right from './rightPanel/index.vue'
import topRegSel from '@/views/top/RegionSelection.vue'
import nowTime from '@/views/top/NowTime.vue'
import {Viewer} from 'cesium'

const viewerInstance= ref<Viewer|null>(null)
provide('getViewer',(viewer:Viewer)=>{
  console.log('孙组件传来的viewer',viewer)
  viewerInstance.value = viewer
})

provide('viewerInstance',viewerInstance)


const loading = ref(true);

// rem.ts
function setRem() {
  const baseWidth = 2200; // 设计稿宽度
  const html = document.documentElement;
  const clientWidth = html.clientWidth;
  
  // 1rem = (屏幕宽度 / 1920) * 16px
  html.style.fontSize = (clientWidth / baseWidth) * 16 + 'px';
}
const cancelLoading = () => {
  // 模拟加载
  setTimeout(() => { //不需要 setTimeout 延迟了 这个是处于加载完cesium地图资源的渲染阻碍吗？
    loading.value = false;
  }, 500);
};

onMounted(() => {
  cancelLoading(); 
  window.addEventListener('resize', setRem);
  setRem();
});
// 修改成watch

onBeforeUnmount(() => {
  window.removeEventListener('resize', setRem);
});

</script>

<style lang="scss" scoped>
@import url('../assets/scss/index.scss');
</style>
