import * as Cesium from 'cesium';
/* export function correctPosition(
  viewer: Cesium.Viewer,
  click: Cesium.ScreenSpaceEventHandler.PositionedEvent
) {
  const rect = viewer.canvas.getBoundingClientRect();
  // 计算当前缩放比例
  const scaleX = rect.width / viewer.canvas.width;
  const scaleY = rect.height / viewer.canvas.height;
  // 修正坐标
  const correctedPosition = new Cesium.Cartesian2(
    click.position.x / scaleX,
    click.position.y / scaleY
  );
  return correctedPosition;
} */

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

/* export function bindFixedTimeline(viewer: Cesium.Viewer, baseWidth = 1920, baseHeight = 1080) {
  const timeline = viewer.timeline
  if (!timeline) return
  timeline.addEventListener("click", (e: MouseEvent) => {
    console.log("触发监听");

    // 1. 修正缩放后的坐标
    const scaleX = window.innerWidth / baseWidth
    const fixedX = e.clientX / scaleX //e.clientX是什么？ 是鼠标未缩放的 X值 , 那不应该是 * scaleX 吗？

    // 2. 计算点击对应的时间
    const startJulian = viewer.clock.startTime
    const endJulian = viewer.clock.stopTime
    //时间转换
    const startTime = Cesium.JulianDate.toGregorianDate(startJulian)
    const endTime = Cesium.JulianDate.toGregorianDate(endJulian)

    const totalDuration = Cesium.JulianDate.secondsDifference(startJulian, endJulian)
    const rect = timeline.container.getBoundingClientRect() //timeline的外边框
    const percent = (e.clientX - rect.left) / rect.width //修正后的x坐标 - 外边框左边的位置 得到这一段的距离 ，再除以整个的长度 得到当前占比
    const seconds = percent * totalDuration
    const newTime = Cesium.JulianDate.addSeconds(startJulian, seconds, new Cesium.JulianDate())
    const newTime0 = Cesium.JulianDate.toGregorianDate(newTime)
    console.log('tartTime,endTime,newTime0', startTime, endTime, newTime0);
    // 3. 设置当前时间 （滑块会自动跳过去）
    viewer.clock.currentTime = newTime
  })
} */

export function bindFixedTimeline(viewer: Cesium.Viewer, baseWidth = 1920) {
  const timeline = viewer.timeline
  if (!timeline) return

  timeline.addEventListener("click", (e: MouseEvent) => {
    const rect = timeline.container.getBoundingClientRect() //rect是未被缩放的 e.clientX是视觉坐标 被缩放过
    const percent = (e.clientX - rect.left) / rect.width
    // const percent = (e.clientX - rect.left) / rect.width
    // 2. 计算对应时间
    const startJulian = viewer.clock.startTime
    const endJulian = viewer.clock.stopTime
    const totalDuration = Cesium.JulianDate.secondsDifference(endJulian, startJulian)
    const seconds = percent * totalDuration
    const newTime = Cesium.JulianDate.addSeconds(startJulian, seconds, new Cesium.JulianDate())
    // ✅ 打印本地时间（带时区）
    console.log("startJulian local:", Cesium.JulianDate.toDate(startJulian))
    console.log("endJulian local:", Cesium.JulianDate.toDate(endJulian))
    console.log("newTime local:", Cesium.JulianDate.toDate(newTime))

    // 3. 设置当前时间
    viewer.clock.currentTime = newTime
  })

}
