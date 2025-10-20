import {
  mapbox_navigation_night,
  Cesium_Ion
} from '@/data/layersData'
import { modifyMap, mapPersistence } from './index'

import * as Cesium from 'cesium'

export function loadDefuat(viewer: Cesium.Viewer, loadTile: boolean) {

  viewer.scene.imageryLayers.removeAll()

  if (loadTile) {
    //默认添加CesiumIon影像
    if (!mapPersistence.getMapstyle()) { //没有存东西的时候才需要初始化
      viewer.scene.imageryLayers.add(Cesium_Ion)
      mapPersistence.setMapstyle('Cesium_Ion')
    }

    modifyMap(viewer, true)

  } else {
    //默认添加mapbox底图
    viewer.scene.imageryLayers.addImageryProvider(
      mapbox_navigation_night //不会存储上一次的样式 每次默认用这个夜间导航底图
    )
    mapPersistence.setMapstyle('mapbox_navigation_night')
  }
}