import * as Cesium from 'cesium'
import type { SegmentType } from '@/interface/takeaway/interface'
import { PathInterpolator } from './PathInterpolator'
import { computeOrientation } from './OrientationHelper'

export class PathCalculationService {
  private order0: any = null
  private stepSegments: Record<string, SegmentType[]> = {} //外界传入 stepSegments
  private driverPosition: Cesium.Cartesian3 = new Cesium.Cartesian3()
  private nextPos: Cesium.Cartesian3 = new Cesium.Cartesian3()  //下一个坐标 用于计算其骑手朝向
  private orientation: Cesium.Quaternion = new Cesium.Quaternion()

  private pathInterpolator: PathInterpolator | null = null

  /**
   * 设置路径数据
   * @param order0 订单数据
   * @param stepSegments 路径分段数据
   */
  public setPathData(order0: any, stepSegments: Record<string, SegmentType[]>) {

    this.order0 = order0
    this.stepSegments = stepSegments

    this.pathInterpolator = new PathInterpolator(order0)

    //看此时是否是数据回显阶段
    const isPath = JSON.parse(localStorage.getItem('isPath') || 'false')


    // 初始化骑手位置为路径起点 //如果此时不是数据回显阶段 才初始化骑手位置为路径起点
    if (order0 && order0.fullpath && order0.fullpath.length > 0 && !isPath) {

      if (this.stepSegments[0][0].startC3) {
        this.driverPosition = this.stepSegments[0][0]?.startC3
        this.pathInterpolator.setInitialPosition(this.driverPosition)
      }

      //初始化骑手下一个位置  ,取出第一个step 中的第一个segment 的第
      const nextPoint = this.stepSegments[0][0]?.endC3
      if (!nextPoint || nextPoint === this.driverPosition) { //如果第一个step的第一个segment没有下一个点 或者说下一个点等于第一个点
        if (this.stepSegments[0][1].startC3)
          this.nextPos = this.stepSegments[0][1].startC3 ?? this.stepSegments[1][0].startC3 //那么获取第一个step的第二个segment的起点, 如果没有第二个segment 那么就获取下一个step的第一个seg的起点
      } else {
        this.nextPos = nextPoint //第一个step的第一个seg的终点为nextPos
      }

      //初始化骑手朝向 此时this.nextPos 和 this.driverPosition 都有值
      const orientation = computeOrientation(this.driverPosition, this.nextPos)
      if (orientation) {
        this.orientation = orientation
      }
    }
  }

  /**
   * 计算骑手位置和累计距离 以及记录骑手的下一个点的位置 因为骑手位置是根据两个点插值出来的,所以可以根据插值出来的点和下一个点当作相邻两个点计算方向向量
   * @param duration 骑行时间（秒）
   * @returns 累计距离（米）
   */
  public calculateDriverPosition(duration: number): number | null {
    if (!this.pathInterpolator) return null

    const cumDistance = this.pathInterpolator.calculateDriverPosition(duration, this.stepSegments)

    const driverPos = this.pathInterpolator.getDriverPos()
    const nextPos = this.pathInterpolator.getNextPos()

    this.driverPosition = driverPos ? driverPos : this.driverPosition
    this.nextPos = nextPos ? nextPos : this.nextPos

    const orientation = computeOrientation(this.driverPosition, this.nextPos)
    if (orientation) {
      this.orientation = orientation
    }

    return cumDistance
  }


  /**
   * 获取当前骑手位置
   */
  public getDriverPosition(): Cesium.Cartesian3 {
    return this.driverPosition
  }
  /**
   * 获取当前骑手运动方向
   */
  public getDriverOrientation(): Cesium.Quaternion {
    return this.orientation
  }

  /**
   * 获取路径进度（0-1）
   */
  public getPathProgress(duration: number): number {
    if (!this.order0 || this.order0.distance === 0) return 0
    const distance = this.calculateDriverPosition(duration)
    if (!distance) return 0
    return Math.min(distance / this.order0.distance, 1)
  }

  /**
  * 重置计算服务
  */
  public reset() {
    this.order0 = null
    this.stepSegments = {}
    this.driverPosition = new Cesium.Cartesian3()
  }

}