import * as Cesium from 'cesium'

export class ClockController {
  private viewer
  private startTime: Cesium.JulianDate | null = null

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
  }

  setupClock(startTimeISO: string, duration: number) {
    const startTime = Cesium.JulianDate.fromIso8601(startTimeISO)
    const stopTime = Cesium.JulianDate.addSeconds(startTime, duration, new Cesium.JulianDate())

    const clock = this.viewer.clock

    clock.startTime = startTime.clone()
    clock.currentTime = startTime.clone()
    clock.stopTime = stopTime
    clock.clockRange = Cesium.ClockRange.CLAMPED
    clock.multiplier = 10 // 可以配置化
    clock.shouldAnimate = true
    this.viewer.timeline.zoomTo(startTime, stopTime)

    this.startTime = startTime
    return {
      startTime
    }
  }

  resetClock() {
    //获取本地时间
    const startTime = Cesium.JulianDate.now()
    //设置默认范围
    const stopTime = Cesium.JulianDate.addDays(startTime, 1, new Cesium.JulianDate())

    const clock = this.viewer.clock

    clock.startTime = startTime.clone()
    clock.stopTime = stopTime.clone()
    clock.currentTime = startTime.clone()

    clock.clockRange = Cesium.ClockRange.UNBOUNDED //Clock#tick 将始终沿当前方向推进时钟。
    clock.multiplier = 1
    clock.shouldAnimate = true

    this.viewer.timeline.zoomTo(startTime, stopTime)
  }

  pauseAnimation() {
    this.viewer.clock.shouldAnimate = false
  }

  resumeAnimation() {
    this.viewer.clock.shouldAnimate = true
  }

  stopAnimation() {
    if (!this.viewer || !this.viewer.isDestroyed()) return
    this.viewer.clock.shouldAnimate = false
  }

  setAnimationSpeed(multiplier: number) {
    this.viewer.clock.multiplier = Math.max(0.1, multiplier)
  }

  getElapsed() {
    if (!this.startTime) return 0
    return Cesium.JulianDate.secondsDifference(this.viewer.clock.currentTime, this.startTime)
  }

  getStart() {
    return this.startTime
  }

  seekSeconds(seconds: number) {
    if (!this.startTime) return
    //需要把时钟映射到对应的时间才行
    const newTime = Cesium.JulianDate.addSeconds(
      this.startTime,
      seconds,
      new Cesium.JulianDate()
    )
    this.viewer.clock.currentTime = newTime
  }

}