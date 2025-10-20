<template>
  <div class="map-wrapper">
    <cesiumMap ref="viewerRef" />
    <changeLayers
      class="layer-control"
      @change-layer="switchLayer"
    />
  </div>
</template>

<script setup lang="ts">
import {ref, watch } from 'vue';
import cesiumMap from './CesiumViewer.vue';
import changeLayers from './loaders/changeLayers.vue';
import {mapPersistence} from '@/service/loaders/index'
import {applyBaselayer} from '@/service/loaders/cesium-map-service'

const viewerRef = ref<any>();

function switchLayer(type: string) {
  const viewer = viewerRef.value?.viewerRef
  if (!viewer) return;

  applyBaselayer(viewer,type)
 
}
watch(
  ()=>viewerRef.value?.viewerRef,
  (viewer)=>{
    const mapId = mapPersistence.getMapstyle() //得到mapId 根据Id 加载对应地图
    applyBaselayer(viewer,mapId)

})

</script>

<style scoped lang="scss">
.map-wrapper {
  position: relative;
  height: 100%;
  width: 100%;
  .layer-control {
    position: absolute;
    right: .4375rem;
    top: .4375rem;
  }
}
</style>
