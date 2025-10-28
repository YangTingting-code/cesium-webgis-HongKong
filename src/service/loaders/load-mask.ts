import { heatmapPersistence } from '@/service/cesium/heatmap/heatmap-persistence'
import { makeRegionPoly, regionPersistance } from '@/service/loaders/index'
import { useRegionStore } from '@/store/useRegionStore'
import type { Viewer } from 'cesium'

export function loadMask(viewer: Viewer) {
  const regionStore = useRegionStore()
  //数据回显-掩膜
  //如果session存了地区并且此时不是绘制热力图的情况下
  if (regionPersistance.getRegion() && !heatmapPersistence.getIsHeatmap()) {
    makeRegionPoly(viewer, regionPersistance.getRegion(), false)
    // 本地会话数据和pinia当前regions数据不一致时才更新到pinia
    if (!regionStore.currRegions === regionPersistance.getRegion())
      regionStore.updateRegion(regionPersistance.getRegion())
    //如果是绘制热力图状态 并且有保存刷新前的参数 那么凸显热力图正在绘制的区域
  } else if (heatmapPersistence.getIsHeatmap() && heatmapPersistence.getLastOption()) {
    const lastRegions = heatmapPersistence.getLastOption().regions
    regionStore.updateRegion(lastRegions)
  } else {
    //session没有保存地区 获取regionStore默认的地区 那如果不存一个默认的区域是不是就无法凸显任何一个区域？不会 顶部行政区默认是选择“九龙城区”, 把默认的“九龙城区”存入会话 和 pinia
    makeRegionPoly(viewer, regionStore.currRegions, false)
  }
}
