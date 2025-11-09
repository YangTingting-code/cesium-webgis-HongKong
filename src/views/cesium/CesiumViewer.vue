<template>
  <toolbar />
  <div id="cesiumContainer" />
</template>

<script lang="ts" setup>
import { onMounted, ref, provide, computed, onUnmounted, inject,watch} from 'vue';
import * as Cesium from 'cesium';
import { createViewer } from '../../service/loaders/viewer';
import {loadDefuat,makeRegionPoly,clearRegionPoly,regionPersistance,loadMask} from '@/service/loaders/index'
import {useRegionStore} from'@/store/useRegionStore'
//热力图会话状态
import {heatmapPersistence} from '@/service/cesium/heatmap/heatmap-persistence'
//加载建筑
import { loadOSMBuildings } from '../../service/OSMBuilding/BuildingService'

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

//监听用户行政区选择变化
const regionStore = useRegionStore()
//监听区域选择变化
watch(()=>regionStore.currRegions,(newV)=>{
  if(!viewerRef.value){
    console.log('此时viewer还未创建')
    return
  }

  clearRegionPoly(viewerRef.value,regionStore.lastRegions)
  let isFlyTo = true
  //如果当前是绘制热力图状态就不要flyto
  if(heatmapPersistence.getIsHeatmap()) isFlyTo = false
  makeRegionPoly(viewerRef.value,newV,isFlyTo,true)
})

onMounted(async () => {
  //创建viewer
  viewerRef.value = await createViewer('cesiumContainer');
  (window as any).viewer  = viewerRef.value; // 把viewer对象挂到全局window
  loadDefuat(viewerRef.value,true)//加载默认底图

  //创建行政区掩膜
  loadMask(viewerRef.value)

  //加载osm 3dbuilding Cesium Ion访问失败
  //图层管理之Cesium - osm三维模型加载
  tilesetRef.value = await loadOSMBuildings(viewerRef.value)
})

onUnmounted(()=>{
  if(viewerRef.value)
    clearRegionPoly(viewerRef.value,regionStore.lastRegions)

  //刷新之后销毁
  viewerRef.value?.destroy()
  regionPersistance.delRegion() //不用写把 标签页持久化
})

defineExpose({ viewerRef, tilesetRef});
</script>

<style>
#cesiumContainer {
  width: 100%;
  height: 100%;
}
</style>
