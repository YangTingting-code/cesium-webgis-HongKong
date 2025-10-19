import * as Cesium from 'cesium'
import { type SegmentType } from '@/interface/takeaway/interface'
export class PathInterpolator {
  private order0
  private driverPosition: Cesium.Cartesian3 | null = null
  private nextPos: Cesium.Cartesian3 | null = null
  private lastDistance: number = 0

  constructor(order0: any) {
    this.order0 = order0
  }
  public setInitialPosition(driverPos: Cesium.Cartesian3) {
    this.driverPosition = Cesium.Cartesian3.clone(driverPos)
  }
  public calculateDriverPosition(duration: number, stepSegments: Record<string, SegmentType[]>): number | null {
    const order = this.order0 // 局部引用
    if (!order) return null //前提是 order 数据准备好

    // 如果骑行时间超过总时长，返回总距离
    if (duration > this.order0.duration) {
      this.setDriverPositionToEnd()
      return order.distance
    }

    // 二分法找到第一个大于duration的step索引
    const stepIndex = this.findStepIndex(duration)


    // 计算 stepIndex 后，构造当前 step 的起始累计时长
    const prevStepCum = (() => {
      if (stepIndex === 0) return 0
      return order.steps[stepIndex - 1].cumduration
    })()

    // const prevStepCum = stepIndex === 0 ? 0 : this.order0.steps[stepIndex - 1].cumduration
    const localTime = duration - prevStepCum

    let segIndex: number
    let seg: any
    let segStartTime: number
    let progress: number
    const stepsCount = Object.keys(stepSegments).length
    if (stepSegments && stepIndex >= 0 && stepIndex < stepsCount) {

      segIndex = this.findSegmentIndex(localTime, stepSegments[stepIndex])

      seg = stepSegments[stepIndex][segIndex]
      if (!seg) {
        return order.distance
      }
      // 对应seg的起始局部时间
      segStartTime = seg.cumduration - seg.duration

      // 计算骑手在当前seg的占比
      progress = Math.min(1, Math.max(0, (localTime - segStartTime)) / seg.duration)

      if (!this.driverPosition) return 0

      // 插值得到骑手当前的Cartesian3坐标
      if (seg.startC3 && seg.endC3) {
        if (Cesium.Cartesian3.equals(seg.startC3, seg.endC3)) {
          return this.lastDistance
        }

        Cesium.Cartesian3.lerp(seg.startC3, seg.endC3, progress, this.driverPosition)
      }
      //给骑手加一个高度
      const carto = Cesium.Cartographic.fromCartesian(this.driverPosition) //经纬度（弧度制）
      this.driverPosition = Cesium.Cartesian3.fromRadians(
        carto.longitude,
        carto.latitude,
        carto.height + 20 //模型拉高10m?
      )

      this.nextPos = seg.endC3

      //更新骑手朝向
      // this.computeOrientation()
    } else {
      return order.steps[stepsCount - 1].distance
    }

    // 计算累计距离
    const cumRiderDistance = this.calculateCumulativeDistance(stepIndex, segIndex, seg, progress, stepSegments)

    this.lastDistance = cumRiderDistance
    return cumRiderDistance
  }

  getDriverPos() {
    return this.driverPosition
  }
  getNextPos() {
    return this.nextPos
  }

  /**
     * 设置骑手位置到路径终点
     */
  private setDriverPositionToEnd() {
    if (this.order0 && this.order0.fullpath && this.order0.fullpath.length > 0) {
      const endPoint = this.order0.fullpath[this.order0.fullpath.length - 1]
      this.driverPosition = Cesium.Cartesian3.fromDegrees(endPoint[0], endPoint[1])
    }
  }

  /**
   * 二分法查找step索引
   */
  private findStepIndex(duration: number): number {
    if (!this.order0 || !this.order0.steps) return 0

    let left = 0
    let right = this.order0.steps.length - 1

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const pivot = this.order0.steps[mid].cumduration
      if (pivot <= duration) {
        left = mid + 1
      } else {
        right = mid - 1
      }
    }

    return Math.max(0, Math.min(left, this.order0.steps.length - 1))
  }

  /**
   * 查找segment索引
   */
  private findSegmentIndex(localTime: number, segments: any[]): number {
    let left = 0
    let right = segments.length - 1

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      if (segments[mid].cumduration <= localTime) {
        left = mid + 1
      } else {
        right = mid - 1
      }
    }

    return left
  }

  /**
   * 计算累计距离
   */
  private calculateCumulativeDistance(stepIndex: number, segIndex: number, seg: any, progress: number, stepSegments): number {
    let cumRiderDistance = 0

    // 1. 加上当前step之前的所有step的累计距离
    if (stepIndex > 0) {
      cumRiderDistance += this.order0.steps[stepIndex - 1].cumdistance
    }

    // 2. 加上当前step内，当前seg之前的所有seg的距离
    if (segIndex > 0) {
      const prevSeg = stepSegments[stepIndex][segIndex - 1]
      cumRiderDistance += prevSeg.cumdistance
    }

    // 3. 加上当前seg内已经行走的距离
    cumRiderDistance += seg.distance * progress

    return cumRiderDistance
  }
}