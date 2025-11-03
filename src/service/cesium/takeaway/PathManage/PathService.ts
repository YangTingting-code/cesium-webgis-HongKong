console.info('[PathService] v1 Facade baseline');

import { TerrainService } from './TerrainService'
import { PathGeometryService } from './PathGeometryService'
import { PathRenderService } from './PathRenderService'
import * as Cesium from 'cesium'
import { pathUtils } from '@/utils/toolbar/takeaway/pathUtils'
import { PathCalculationService } from '@/service/cesium/takeaway/PathCalcu/PathCalculateService'
import { ModelService } from '@/service/cesium/takeaway/modelService'
import type { CombinedOrder, SegmentType, SegmentBuckets } from '@/interface/takeaway/interface'
import type { Position } from '@/interface/globalInterface'
import { ScenePersistence } from '../SceneManage/ScenePersistence';

export class PathService {

  private viewer: Cesium.Viewer
  private currentPath: [number, number][] | null = null

  private riderPosition: Cesium.Cartesian3 = new Cesium.Cartesian3()

  private pathCalculationService: PathCalculationService = new PathCalculationService()
  private modelService: ModelService | null = null
  private orientation: Cesium.Quaternion = new Cesium.Quaternion

  private pathGeometryService = new PathGeometryService()
  private pathRenderService


  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
    this.modelService = new ModelService(this.viewer)
    this.pathRenderService = new PathRenderService(this.viewer)
  }

  /**
   * 设置路径数据（包含精确的分段信息）
   */
  public setPathData(order0: CombinedOrder, stepSegments: Record<string, SegmentType[]>) {

    if (!order0 || !stepSegments || Object.keys(stepSegments).length === 0) {
      console.warn('[PathService] 无效的订单或路径数据')
      return
    }

    this.pathCalculationService.setPathData(order0, stepSegments)
    this.pathGeometryService.setPathData(order0, stepSegments)
    this.currentPath = this.pathGeometryService.getCurrentPath()

  }

  //debug用 返回flattenStepSeg
  public getFlattened() {
    return this.pathGeometryService.getFlattened()
  }

  //传入当前累计路程
  public getSegmentBuckets(currentDistance: number, isBack: boolean): SegmentBuckets | null {
    return this.pathGeometryService.updateBuckets(currentDistance, isBack)
  }


  // 根据segmentType重新创建三种样式的primitive

  public applySegmentBuckets({ currentSegs, pastSegs, futureSegs }: SegmentBuckets) {
    const pastPoints = this.collectPoint(pastSegs)
    const currentPoints = this.collectPoint(currentSegs)
    const futurePoints = this.collectPoint(futureSegs)
    //等距离采样 只有中间需要光带跟随骑手运动的需要
    const sampledcurrPts = this.resamplePathByDistance(currentPoints, 1)
    this.pathRenderService.drawBuckets(pastPoints, sampledcurrPts, futurePoints)
  }


  /**
 * 将路径按实际距离重新采样为等间距点
 * @param {Cesium.Cartesian3[]} points 原始路径点
 * @param {number} step 采样间距（米），默认 5 米
 */
  private resamplePathByDistance(points: Cesium.Cartesian3[], step = 5): Cesium.Cartesian3[] {
    if (points.length < 2) return points

    // 1️⃣ 计算原路径的分段长度
    const segmentLengths: number[] = []
    let totalLength = 0
    for (let i = 0; i < points.length - 1; i++) {
      const d = Cesium.Cartesian3.distance(points[i], points[i + 1])
      segmentLengths.push(d)
      totalLength += d
    }

    // 2️⃣ 计算要生成的点数
    const newPoints: Cesium.Cartesian3[] = [points[0]]
    let currentDist = step
    let segIndex = 0

    // 3️⃣ 逐段插值生成新点
    while (currentDist < totalLength && segIndex < segmentLengths.length) {
      const segLen = segmentLengths[segIndex]
      const p1 = points[segIndex]
      const p2 = points[segIndex + 1]

      if (currentDist > segLen) {
        currentDist -= segLen
        segIndex++
      } else {
        // 当前段插值比例
        const ratio = currentDist / segLen
        const interp = Cesium.Cartesian3.lerp(p1, p2, ratio, new Cesium.Cartesian3())
        newPoints.push(interp)
        currentDist += step
      }
    }

    // 4️⃣ 加上终点
    newPoints.push(points[points.length - 1])
    return newPoints
  }


  /**
 * 生成圆形线的点集（世界坐标）
 * @param center 圆心的 Cartesian3 坐标
 * @param radius 半径（米）
 * @param segments 分段数（越大越圆）
 */
  private createCirclePos(center: Cesium.Cartesian3, radius: number, segments = 64): Cesium.Cartesian3[] {
    const ellipsoid = Cesium.Ellipsoid.WGS84
    const centerCarto = Cesium.Cartographic.fromCartesian(center)
    const result: Cesium.Cartesian3[] = []

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const offsetLon = radius * Math.cos(angle) / (ellipsoid.maximumRadius * Math.cos(centerCarto.latitude))
      const offsetLat = radius * Math.sin(angle) / ellipsoid.maximumRadius

      const lon = centerCarto.longitude + offsetLon
      const lat = centerCarto.latitude + offsetLat

      result.push(Cesium.Cartesian3.fromRadians(lon, lat, centerCarto.height))
    }

    return result
  }

  //因为取餐点和送货点有时候不在路边 路径规划时终点是吸附在目标点最近的道路上的，如果没有保留最后一个点的话会导致路径绘制出来不合理，有突然转向不沿道路的问题
  private findEndSeg() {
    //每个里程碑最后一段的终点都要塞进去
    const legs = this.pathGeometryService.getLegs()
    // 收集里程碑最后一个
    const endSegs = legs.map(l => l.segmentIndices.at(-1))   // 不用pop 不修改原数组
    return endSegs
  }
  private collectPoint(indices: number[]): Cesium.Cartesian3[] {
    const endSegs = this.findEndSeg()

    const pointsC3: Cesium.Cartesian3[] = [];
    for (let i = 0; i < indices.length; i++) {
      const flattened = this.getFlattened()
      const segIndex = indices[i]
      const seg = flattened[segIndex].segment;
      // 重新构造“干净”的 Cartesian3
      pointsC3.push(
        seg.startC3?.x && seg.startC3?.y && seg.startC3?.z
          ? new Cesium.Cartesian3(seg.startC3.x, seg.startC3.y, seg.startC3.z)
          : Cesium.Cartesian3.fromDegrees(seg.start[0], seg.start[1])
      )

      //找到送货点、取餐点 ，因为这些可能不在路边，路径规划是把目标点吸附在最近的道路上，那这样的话我future和past没有给里程碑分界的那一段做包边，里程碑所在的那一段需要塞入起点和终点，如果只是塞起点，那么终点（吸附道路上那个点）就丢失了，导致future和past路径不连贯，直接用里程碑所在那一段的起点和送货点的经纬度连接。
      if (endSegs.includes(segIndex)) {
        pointsC3.push(
          seg.endC3?.x && seg.endC3?.y && seg.endC3?.z
            ? new Cesium.Cartesian3(seg.endC3.x, seg.endC3.y, seg.endC3.z)
            : Cesium.Cartesian3.fromDegrees(seg.end[0], seg.end[1])
        )
      }

      //最后一段，把终点push进去
      if (i === indices.length - 1) {

        pointsC3.push(
          seg.endC3?.x && seg.endC3?.y && seg.endC3?.z
            ? new Cesium.Cartesian3(seg.endC3.x, seg.endC3.y, seg.endC3.z)
            : Cesium.Cartesian3.fromDegrees(seg.end[0], seg.end[1])
        );
      }
    }
    return pointsC3;
  }

  public async initPath(path: [number, number][], options: any) {
    const {
      lineWidth = 5,
      densifyStep = 5
    } = options
    //1.处理数据
    const pathC3 = await this.handlePath(path, densifyStep, false) //得到路径car3数组

    //2.绘制骑手路径动态管道
    this.pathRenderService.drawDynamicPolyline(pathC3, lineWidth, true)

    // 3.添加postRender 动态修改管道宽度失败，后续考虑把管道改成二维的，用shader控制宽度
    // this.recreatePrimitiveListener(pathC3)

    // 3. 创建骑手实体 callbackProperty 根据骑手和照相机位置调整骑手大小
    this.modelService?.initRiderModel(() => this.riderPosition, () => this.orientation)

  }

  public createRiderModel() {
    //初始化骑手位置 和 默认朝向
    this.initRiderPos()
    this.modelService?.initRiderModel(() => this.riderPosition, () => this.orientation)

  }


  public restoreRiderModel(riderPos: Cesium.Cartesian3, riderOri: Cesium.Quaternion) {//数据回显重建骑手模型
    this.riderPosition = Cesium.Cartesian3.clone(riderPos)
    this.orientation = riderOri
    // modelService 可能被 clear() 清空，这里补建
    if (!this.modelService) {
      this.modelService = new ModelService(this.viewer)
    }

    // 确保旧实体被移除
    this.modelService.removeRiderModelEntity?.()

    this.modelService.initRiderModel(() => this.riderPosition, () => this.orientation)
  }

  private initRiderPos() {
    if (this.currentPath) {
      this.riderPosition = Cesium.Cartesian3.fromDegrees(this.currentPath[0][0], this.currentPath[0][1])
      this.orientation = Cesium.Quaternion.IDENTITY //默认朝向 朝东
    } else {
      console.log('骑手位置初始化失败')
    }
  }

  public followRider(enable: boolean) {
    this.modelService?.followRider(enable, () => this.riderPosition, () => this.orientation)
  }

  public setCameraByRiderPosOri() {

    this.modelService?.setCameraPosToRider(false, () => this.riderPosition, () => this.orientation)
  }

  public removeFollow() {
    this.modelService?.removeFollow()
  }

  private async handlePath(path: Position[], densifyStep: number, densify: boolean): Promise<Cesium.Cartesian3[]> {
    const targetPath = densify ? pathUtils.densifyPath(path, densifyStep) : path
    const { car3Array } = await TerrainService.getInstance().toCartesian3(targetPath as Position[])
    return car3Array
  }


  public getCumDistance(duration: number) {
    const cumDistance = this.pathCalculationService.calculateDriverPosition(duration)
    return cumDistance
  }

  public updateRiderPosOri() {
    this.riderPosition = this.pathCalculationService.getDriverPosition() //获取pathCalculationService 调用calculateDriverPosition 计算更新后的riderPosition
    // //更新骑手方向
    this.orientation = this.pathCalculationService.getDriverOrientation() //和riderPosition 同理
  }
  public updateRiderPosOriBySession() {
    // 更新骑手位置
    const { riderOri, riderPos } = ScenePersistence.getRiderPosOri()
    this.riderPosition = riderPos
    this.orientation = riderOri
  }

  /**
   * 根据累计距离更新路径进度 全局累计距离 转换 成局部累计距离
   */
  public updatePathProgressByDistance(cumDistance: number, currentSegs: number[]): number | null {

    let startSegIdx = currentSegs[0]
    let endSegIdx = currentSegs[currentSegs.length - 1]

    if (startSegIdx == null || endSegIdx == null || startSegIdx >= this.getFlattened().length) return null

    const flattened = this.getFlattened()

    const startGlobal = flattened[startSegIdx].globalStart
    // this.flattenedSegments[startSegIdx].globalStart
    const endGlobal = flattened[endSegIdx].globalEnd
    // this.flattenedSegments[endSegIdx].globalEnd

    if (!this.pathRenderService.getCurr() || !this.pathCalculationService) return null

    const order0 = (this.pathCalculationService as any).order0
    if (!order0 || order0.distance === 0) return null

    const progress = Math.min((cumDistance - startGlobal) / (endGlobal - startGlobal), 1)

    this.updatePathProgress(progress)
    console.log('progress', progress)
    return progress
  }

  /**
   * 建圆形路径截面
   * @param radius 半径（原来的 width 可以理解为半径）
   * @param segments 圆的分段数（越多越圆） 段数越少性能越好
   * @returns 
   */
  private createRadiusShape(radius: number, segments = 32): Cesium.Cartesian2[] {
    const shape: Cesium.Cartesian2[] = []
    const angleStep = Math.PI * 2 / segments
    for (let i = 0; i < segments; i++) {
      const angle = angleStep * i
      const x = radius * Math.cos(angle)
      const y = radius * Math.sin(angle)
      shape.push(new Cesium.Cartesian2(x, y))
    }
    return shape
  }

  /** 
   * 获取骑手位置 笛卡尔3
   */
  public getRiderPos() {
    return this.riderPosition
  }
  /** 
  * 获取骑手位置 笛卡尔3
  */
  public getRiderOri() {
    return this.orientation
  }

  /**
   * 更新路径进度（用于动画）
   * @param progress 进度值 0-1
   */
  public updatePathProgress(progress: number) {
    if (!this.pathRenderService || typeof progress !== 'number') return
    this.pathRenderService.updateCurrentProgress(progress)
  }


  /**
   * 清理路径绘制
   */
  cleanup() {
    //清空渲染层
    this.pathRenderService.clear()

    //重置几何与计算
    this.pathGeometryService.reset()
    this.pathCalculationService = new PathCalculationService()

    //清除模型
    this.modelService?.clear()
    this.modelService = null

    //释放状态
    this.currentPath = null
    this.riderPosition = new Cesium.Cartesian3()
    this.orientation = new Cesium.Quaternion()

    console.log('[PathService] 已彻底清空')
  }
}