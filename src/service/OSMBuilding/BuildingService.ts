import * as Cesium from 'cesium';
export async function loadOSMBuildings(viewer: Cesium.Viewer) {
  const tileset = await Cesium.createOsmBuildingsAsync()
  viewer.scene.primitives.add(tileset)

  // // 2. 调整基础渲染环境
  viewer.scene.globe.enableLighting = true
  viewer.shadows = false //模拟日照光影 光影会影响泛光的统一亮度

  return tileset;
}



