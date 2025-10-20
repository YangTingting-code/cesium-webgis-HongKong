import * as Cesium from 'cesium'
import type { SegmentType } from '@/interface/takeaway/interface'
import { ScenePersistence } from '../SceneManage/ScenePersistence'
export class PathCalculationService {
  private order0: any = null
  private stepSegments: Record<string, SegmentType[]> = {} //外界传入 stepSegments
  private driverPosition: Cesium.Cartesian3 = new Cesium.Cartesian3()
  private nextPos: Cesium.Cartesian3 = new Cesium.Cartesian3()  //下一个坐标 用于计算其骑手朝向
  private orientation: Cesium.Quaternion = new Cesium.Quaternion()
  private lastDistance: number = 0

  /**
   * 设置路径数据
   * @param order0 订单数据
   * @param stepSegments 路径分段数据
   */
  public setPathData(order0: any, stepSegments: Record<string, SegmentType[]>) {
    this.order0 = order0
    this.stepSegments = stepSegments

    //看此时是否是数据回显阶段
    const isPath = ScenePersistence.getIsPath()

    // 初始化骑手位置为路径起点 //如果此时不是数据回显阶段 才初始化骑手位置为路径起点
    if (order0 && order0.fullpath && order0.fullpath.length > 0 && !isPath) {

      if (this.stepSegments[0][0].startC3)
        this.driverPosition = this.stepSegments[0][0]?.startC3

      //初始化骑手下一个位置  ,取出第一个step 中的第一个segment 的第
      const nextPoint = this.stepSegments[0][0]?.endC3
      if (!nextPoint || nextPoint === this.driverPosition) { //如果第一个step的第一个segment没有下一个点 或者说下一个点等于第一个点
        if (this.stepSegments[0][1].startC3)
          this.nextPos = this.stepSegments[0][1].startC3 ?? this.stepSegments[1][0].startC3 //那么获取第一个step的第二个segment的起点, 如果没有第二个segment 那么就获取下一个step的第一个seg的起点
      } else {
        this.nextPos = nextPoint //第一个step的第一个seg的终点为nextPos
      }

      //初始化骑手朝向 此时this.nextPos 和 this.driverPosition 都有值
      this.computeOrientation()
    }
  }

  /**
   * 计算骑手位置和累计距离 以及记录骑手的下一个点的位置 因为骑手位置是根据两个点插值出来的,所以可以根据插值出来的点和下一个点当作相邻两个点计算方向向量
   * @param duration 骑行时间（秒）
   * @returns 累计距离（米）
   */
  public calculateDriverPosition(duration: number): number {
    const order = this.order0 // 局部引用
    if (!order) return 0 //前提是 order 数据准备好

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
    const stepsCount = Object.keys(this.stepSegments).length
    if (this.stepSegments && stepIndex >= 0 && stepIndex < stepsCount) {

      segIndex = this.findSegmentIndex(localTime, this.stepSegments[stepIndex])

      seg = this.stepSegments[stepIndex][segIndex]
      if (!seg) {
        return order.distance
      }
      // 对应seg的起始局部时间
      segStartTime = seg.cumduration - seg.duration

      // 计算骑手在当前seg的占比
      progress = Math.min(1, Math.max(0, (localTime - segStartTime)) / seg.duration)

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
        carto.height + 10 //模型拉高10m?
      )

      this.nextPos = seg.endC3

      //更新骑手朝向
      this.computeOrientation()
    } else {
      return order.steps[stepsCount - 1].distance
    }

    // 计算累计距离
    const cumRiderDistance = this.calculateCumulativeDistance(stepIndex, segIndex, seg, progress)

    this.lastDistance = cumRiderDistance
    return cumRiderDistance
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
  private calculateCumulativeDistance(stepIndex: number, segIndex: number, seg: any, progress: number): number {
    let cumRiderDistance = 0

    // 1. 加上当前step之前的所有step的累计距离
    if (stepIndex > 0) {
      cumRiderDistance += this.order0.steps[stepIndex - 1].cumdistance
    }

    // 2. 加上当前step内，当前seg之前的所有seg的距离
    if (segIndex > 0) {
      const prevSeg = this.stepSegments[stepIndex][segIndex - 1]
      cumRiderDistance += prevSeg.cumdistance
    }

    // 3. 加上当前seg内已经行走的距离
    cumRiderDistance += seg.distance * progress

    return cumRiderDistance
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

  /**
   * 计算骑手当前朝向
   */
  private computeOrientation() {
    if (!this.driverPosition && !this.nextPos) return //如果没有骑手当前位置 也没有下一个点的位置 那么即可返回
    const dir = Cesium.Cartesian3.subtract(this.nextPos, this.driverPosition, new Cesium.Cartesian3())

    // 检查向量是否接近零
    const magnitude = Cesium.Cartesian3.magnitude(dir);
    if (!isFinite(magnitude) || magnitude < 1e-6) {
      // 如果距离太近，跳过朝向更新
      return;
    }

    Cesium.Cartesian3.normalize(dir, dir)
    // 方向向量算反了？
    // const dir = Cesium.Cartesian3.subtract(this.driverPosition, this.nextPos, new Cesium.Cartesian3())
    // Cesium.Cartesian3.normalize(dir, dir) //把归一化的结果再传给dir吗？
    const localTransform = Cesium.Transforms.eastNorthUpToFixedFrame(this.driverPosition) //局部创建x-y-z坐标系 东-北-z 
    //提取局部坐标系里的 “东”和“北”
    const east = Cesium.Matrix4.getColumn(localTransform, 0, new Cesium.Cartesian4())
    const north = Cesium.Matrix4.getColumn(localTransform, 1, new Cesium.Cartesian4())

    const heading = Math.atan2( //atan2(x, y) = 求反正切角，能正确返回“在哪个象限”的角度
      Cesium.Cartesian3.dot(dir, east), //dot(a, b) = 向量点积，表示两个向量之间的夹角关系
      Cesium.Cartesian3.dot(dir, north)
    );

    const hpr = new Cesium.HeadingPitchRoll(heading, 0, 0); //三维角度容器
    this.orientation = Cesium.Transforms.headingPitchRollQuaternion(this.driverPosition, hpr);

    //用 CallbackProperty 动态更新 orientation
  }


}