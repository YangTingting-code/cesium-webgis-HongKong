<template>
  <toolbar />
  <div id="cesiumContainer" />
</template>

<script lang="ts" setup>
import { onMounted, ref, provide, computed, onUnmounted, inject,watch} from 'vue';
import * as Cesium from 'cesium';
import { createViewer } from '../../service/loaders/viewer';
import {loadDefuat} from '@/service/loaders/index'

//加载建筑
import { loadOSMBuildings } from '../../service/OSMBuilding/BuildingService';
import toolbar from './toolbar/index.vue'

const viewerRef = ref<Cesium.Viewer>();
const tilesetRef = ref<Cesium.Cesium3DTileset>();
const isReady = computed(()=>!!viewerRef.value && !!tilesetRef.value) //就绪状态


  const attrsViewer = inject('getViewer') as (viewer:Cesium.Viewer)=>void

  watch(()=>viewerRef.value,(newValue)=>{
    if(newValue)
      attrsViewer(newValue)
  })
  //注意一定要先inject再provide 因为provide会建立新的作用域 导致当前组件没法接收到父组件的函数
  provide('cesium',{
    viewerRef,
    tilesetRef,
    isReady
  })

onMounted(async () => {
  //创建viewer
  viewerRef.value = await createViewer('cesiumContainer');
  loadDefuat(viewerRef.value,true)//加载默认底图

  //加载osm 3dbuilding Cesium Ion访问失败
  tilesetRef.value = await loadOSMBuildings(viewerRef.value)

})

onUnmounted(()=>{
  //刷新之后销毁
  viewerRef.value?.destroy()
})

defineExpose({ viewerRef });
</script>

<style>
#cesiumContainer {
  width: 100%;
  height: 100%;
}
</style>
