<template>
  <!-- <div v-if="isReady"> -->
  <!-- 控制按钮 -->
  <div
    class="toggle-btn"
    :class="{ open: sidebarOpen }"
    @mouseenter="isBtnHover = true"
    @mouseleave="isBtnHover = false"
    @click="sidebarOpen = !sidebarOpen"
  >
    <span>{{ sidebarOpen ? '关闭' : '查看周边' }}</span>
  </div>
  <div 
    class="sidebar" 
    :class="{open:sidebarOpen}"
  >
    <CircleControlPanel 
      v-show="showControl"
      v-model:radius="radius"
      :hover="isBtnHover"
      :is-start-disabled="isStartDisabled"
      :is-stop-disabled="isStopDisabled"
      @start="onStart"
      @stop="onStop"
    />
  </div>
</template>

<script setup lang="ts">
import CircleControlPanel from '@/components/spatialSearch/CircleControlPanel.vue'
  import { ref,inject ,type Ref} from 'vue'
  import * as Cesium from 'cesium';
  import {useCircleSearch} from '@/composables/cesium/spatialSearch/useCircleSearch'

  const sidebarOpen = ref(false) //鼠标点击了按钮之后 这个会变成true 然后sidebar 多一个open类
  const isBtnHover = ref(false) //当鼠标在关闭按钮的时候 控制面板也会跟着放大发光

    interface CesiumInjection {
      viewerRef:Ref<Cesium.Viewer|undefined>,
      tilesetRef:Ref<Cesium.Cesium3DTileset|undefined>,
      isReady:Ref<boolean>
    }
    const {viewerRef,tilesetRef,isReady} = inject<CesiumInjection>('cesium')!
  
      const res = useCircleSearch(viewerRef, tilesetRef)

const { radius, isStartDisabled,isStopDisabled, showControl, startSearch, stopSearch } = res

// 搜索功能面板的显隐
const isListen = ref(false); //哨兵

// 控制面板点击事件（开始 / 停止按钮）
function onStart() {
  isStartDisabled.value = true;
  isStopDisabled.value = false;
  // 启用点击事件 → 查询 OSM → 渲染圆圈 + 弹窗
  startSearch()
  isListen.value = true; //此时开始监听屏幕点击事件
}

function onStop(){
  stopSearch()
}
</script>

<style scoped lang="scss">
/* 按钮 */
.toggle-btn {
  position: absolute;
  top: 2rem;
  left: 0;
  width: 2.5rem;
  height: 6rem;
  background: rgba(57, 147, 138, 0.85);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  writing-mode: vertical-rl; /* 垂直文字 */
  border-radius: 0 .5rem .5rem 0;
  cursor: pointer;
  transition: all 0.5s ease;
  z-index: 10;
  &:hover {
    transform: translateX(0.5rem) scale(1.1);
    box-shadow: 0 0 1rem rgba(0,255,255,0.6),0 0 1.5rem rgba(0,255,255,0.4)
  }
  &.open {
    left: 24.5rem; /* 跟随侧边栏宽度 */
    width: 2rem;
    height: 5rem;
    font-size: 0.8rem;
    border-radius: 0 .5rem .5rem 0;
  }
}

/* 侧边栏 */
.sidebar {
  position: absolute;
  top: -0.5%;
  left: 0;
  width: 25rem;
  height: 12rem;
  background: transparent;
  transform: translateX(-100%);
  transition: all 0.5s ease;
  z-index: 1;
  overflow-y: hidden;
  opacity: 0;
  pointer-events: none;
  &.open {
    transform: translateX(0);
    opacity: 1;
    pointer-events:auto;
    
  }
}

</style>
