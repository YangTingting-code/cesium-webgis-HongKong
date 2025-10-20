/**
 * 拾取经纬度
 * @param {Cesium.Viewer} viewer
 * @param {Cesium.Cartesian2} mousePosition
 * @returns
 */

import * as Cesium from 'cesium';
export function getLngLat(
  viewer: Cesium.Viewer,
  mousePosition: Cesium.Cartesian2
) {
  //笛卡尔直角坐标系的位置
  const positionCartesian3 = viewer.scene.pickPosition(mousePosition);
  //直角坐标系转地理坐标
  if (Cesium.defined(positionCartesian3)) {
    //把直角坐标系转换为地理坐标系 此时的结果是弧度 需要转换成度数
    const cartographic = Cesium.Cartographic.fromCartesian(positionCartesian3);
    const lng = Cesium.Math.toDegrees(cartographic.longitude).toFixed(6);
    const lat = Cesium.Math.toDegrees(cartographic.latitude).toFixed(6);
    const height = cartographic.height.toFixed(2);
    console.log('lng,lat,h', lng, lat, height);
    return { lng, lat, height };
  }
}
