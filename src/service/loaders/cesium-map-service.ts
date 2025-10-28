import { mapPersistence } from './load-persistence'
import { forceReloadGlobe, modifyMap, isFilterActive } from './modify-map-shader'
import { mapstyleDictionary, type buildingShaderColorSchemeGrouped } from '@/data/layersData'
//三维样式
import { createBuildingShaderGrouped, tileShader } from '@/service/OSMBuilding/building-shader'
import * as Cesium from 'cesium'

export function applyBaselayer(viewer: Cesium.Viewer, tileset: Cesium.Cesium3DTileset, mapId: string) {
  const layers = viewer.scene.imageryLayers
  layers.removeAll() //先移除其他影像图层
  switch (mapId) {
    case 'Cesium_Ion':
      layers.add(Cesium.ImageryLayer.fromWorldImagery({}))
      forceReloadGlobe(viewer)
      modifyMap(viewer, true) //开启过滤

      tileset.customShader = tileShader
      return

    case 'standard_satellite':
      layers.addImageryProvider(mapstyleDictionary[mapId] as Cesium.ImageryProvider)
      forceReloadGlobe(viewer)
      modifyMap(viewer, true) //开启过滤

      tileset.customShader = tileShader

      return

    default:
      layers.addImageryProvider(mapstyleDictionary[mapId] as Cesium.ImageryProvider)
      tileset.customShader = createBuildingShaderGrouped(mapId as keyof typeof buildingShaderColorSchemeGrouped)
  }
  if (isFilterActive() && mapId !== 'Cesium_Ion') { //如果当前处于滤镜状态并type不是tile类型的 需要移除并且重建globe
    // modifyMap(viewer, false)
    forceReloadGlobe(viewer)
    modifyMap(viewer, false)

  }

  mapPersistence.setMapstyle(mapId)


  //osm三维建筑样式修改



}