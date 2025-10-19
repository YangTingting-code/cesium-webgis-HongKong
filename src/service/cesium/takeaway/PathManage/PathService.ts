console.info('[PathService] v1 Facade baseline');

import { TerrainService } from './TerrainService'
import { PathGeometryService } from './PathGeometryService'
import { PathRenderService } from './PathRenderService'
import * as Cesium from 'cesium'
import { pathUtils } from '@/utils/takeaway/pathUtils'
import { PathCalculationService } from '@/service/cesium/takeaway/PathCalcu/index'
import { ModelService } from '@/service/cesium/takeaway/modelService'
import type { CombinedOrder, SegmentType, SegmentBuckets } from '@/views/cesium/toolbar/takeaway/interface-nouse'
import type { Position } from '@/interface/globalInterface';

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
    this.pathRenderService.drawBuckets(pastPoints, currentPoints, futurePoints)
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


  private collectPoint(indices: number[]): Cesium.Cartesian3[] {
    const pointsC3: Cesium.Cartesian3[] = [];
    for (let i = 0; i < indices.length; i++) {
      const flattened = this.getFlattened()
      const seg = flattened[indices[i]].segment;
      // 重新构造“干净”的 Cartesian3
      pointsC3.push(
        seg.startC3?.x && seg.startC3?.y && seg.startC3?.z
          ? new Cesium.Cartesian3(seg.startC3.x, seg.startC3.y, seg.startC3.z)
          : Cesium.Cartesian3.fromDegrees(seg.start[0], seg.start[1])
      );
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


  /**
   * 更新骑手位置和路径进度（基于精确计算）
   * @param duration 骑行时间（秒）
   */
  public updateRiderByDuration(duration: number, currentSegs: number[], isDataReload: boolean) {
    // 使用精确算法计算累计距离
    const cumDistance = this.pathCalculationService.calculateDriverPosition(duration)

    // 更新骑手位置
    this.riderPosition = this.pathCalculationService.getDriverPosition() //获取pathCalculationService 调用calculateDriverPosition 计算更新后的riderPosition
    //更新骑手方向
    this.orientation = this.pathCalculationService.getDriverOrientation() //和riderPosition 同理

    // 更新路径材质进度
    this.updatePathProgressByDistance(cumDistance, currentSegs, isDataReload)

    return cumDistance
  }

  public getCumDistance(duration: number) {
    const cumDistance = this.pathCalculationService.calculateDriverPosition(duration)

    this.riderPosition = this.pathCalculationService.getDriverPosition() //获取pathCalculationService 调用calculateDriverPosition 计算更新后的riderPosition
    //更新骑手方向
    this.orientation = this.pathCalculationService.getDriverOrientation() //和riderPosition 同理

    return cumDistance
  }

  /**
   * 根据累计距离更新路径进度 全局累计距离 转换 成局部累计距离
   */
  public updatePathProgressByDistance(cumDistance: number, currentSegs: number[], isDataReload: boolean): number | null {

    let secondLastCurrentSegs
    let startSegIdx = currentSegs[0]
    let endSegIdx = currentSegs[currentSegs.length - 1]

    if (startSegIdx == null || endSegIdx == null || startSegIdx >= this.getFlattened().length) return null

    if (isDataReload && currentSegs.length < 1) { //显性知道骑手当前是在倒数第二个buckets轨迹？
      secondLastCurrentSegs = JSON.parse(localStorage.getItem('secondLastCurrentSegs') || '[]')
      startSegIdx = secondLastCurrentSegs[0]
      endSegIdx = secondLastCurrentSegs[secondLastCurrentSegs.length - 1]
    }

    const flattened = this.getFlattened()

    const startGlobal = flattened[startSegIdx].globalStart
    // this.flattenedSegments[startSegIdx].globalStart
    const endGlobal = flattened[endSegIdx].globalEnd
    // this.flattenedSegments[endSegIdx].globalEnd

    if (
      !this.pathRenderService.getCurr() || !this.pathCalculationService) return null

    const order0 = (this.pathCalculationService as any).order0
    if (!order0 || order0.distance === 0) return null

    const progress = Math.min((cumDistance - startGlobal) / (endGlobal - startGlobal), 1)

    this.updatePathProgress(progress)
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