<template>
  <div class="map-wrapper">
    <cesiumMap ref="viewerTileRef" />
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

const viewerTileRef = ref<any>()

function switchLayer(type: string) {
  const viewer = viewerTileRef.value?.viewerRef
  const tileset = viewerTileRef.value?.tilesetRef
  if (!viewer || !tileset) return

  applyBaselayer(viewer,tileset,type)
}

watch(
  ()=>[viewerTileRef.value?.viewerRef,viewerTileRef.value?.tilesetRef],
  ([vRef,tRef])=>{
    if(!vRef || !tRef) return
    const mapId = mapPersistence.getMapstyle() //得到mapId 根据Id 加载对应地图
    applyBaselayer(vRef,tRef,mapId)

},{immediate:true})

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
