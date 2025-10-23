import { heatmapPersistence } from '@/service/cesium/heatmap/heatmap-persistence'
import { makeRegionPoly, regionPersistance } from '@/service/loaders/index'
import { useRegionStore } from '@/store/useRegionStore'
import type { Viewer } from 'cesium'

export function loadMask(viewer: Viewer) {
  const regionStore = useRegionStore()
  //待封装 数据回显 掩膜
  //数据回显-掩膜
  if (regionPersistance.getRegion() && !heatmapPersistence.getIsHeatmap()) {
    makeRegionPoly(viewer, regionPersistance.getRegion(), false)
    // 本地会话数据和pinia当前regions数据不一致时才更新到pinia
    if (!regionStore.currRegions === regionPersistance.getRegion())
      regionStore.updateRegion(regionPersistance.getRegion())
  } else if (heatmapPersistence.getIsHeatmap() && heatmapPersistence.getLastOption()) {
    const lastRegions = heatmapPersistence.getLastOption().regions
    regionStore.updateRegion(lastRegions)
  } else {
    makeRegionPoly(viewer, regionStore.currRegions, false)
  }
}
