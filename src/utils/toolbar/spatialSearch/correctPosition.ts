import * as Cesium from 'cesium';


import type { Cartesian2 } from 'cesium';

/** 统一修正坐标：
 *  event 可以是
 *    1. PositionedEvent     -> 用 event.position
 *    2. 裸 Cartesian2       -> 直接用
 */
export function correctPosition(
  viewer: Cesium.Viewer,
  event: Cartesian2 | { position: Cartesian2 }
): Cartesian2 {
  const rect = viewer.canvas.getBoundingClientRect();
  const scaleX = rect.width / viewer.canvas.width;
  const scaleY = rect.height / viewer.canvas.height;

  // 取出真正的屏幕坐标
  const src = 'position' in event ? event.position : event;

  return new Cesium.Cartesian2(src.x / scaleX, src.y / scaleY);
}

export function getScale(viewer: Cesium.Viewer) {
  const rect = viewer.canvas.getBoundingClientRect();
  // 计算当前缩放比例
  const scaleX = rect.width / viewer.canvas.width;
  const scaleY = rect.height / viewer.canvas.height;
  return { scaleX, scaleY };
}