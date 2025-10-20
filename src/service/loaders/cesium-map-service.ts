import { mapPersistence } from './map-persistence'
import { forceReloadGlobe, modifyMap, isFilterActive } from './modify-map-shader'
import { mapstyleDictionary } from '@/data/layersData'
import * as Cesium from 'cesium'

export function applyBaselayer(viewer: Cesium.Viewer, mapId: string) {
  const layers = viewer.scene.imageryLayers
  layers.removeAll() //先移除其他影像图层
  switch (mapId) {
    case 'Cesium_Ion':
      layers.add(Cesium.ImageryLayer.fromWorldImagery({}))
      forceReloadGlobe(viewer)
      modifyMap(viewer, true) //开启过滤
      return

    default:
      layers.addImageryProvider(mapstyleDictionary[mapId] as Cesium.ImageryProvider)
  }
  if (isFilterActive() && mapId !== 'Cesium_Ion') { //如果当前处于滤镜状态并type不是tile类型的 需要移除并且重建globe
    modifyMap(viewer, false)
    forceReloadGlobe(viewer)
  }

  mapPersistence.setMapstyle(mapId)

}