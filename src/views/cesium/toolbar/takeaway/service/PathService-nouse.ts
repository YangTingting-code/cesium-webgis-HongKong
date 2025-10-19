import * as Cesium from 'cesium'
import * as turf from '@turf/turf'
import { pathUtils } from '../utils/pathUtils'
import { PathCalculationService } from './PathCalculationService'
import { ModelService } from '../../../../../service/cesium/takeaway/modelService'
import type { CombinedOrder, SegmentType, SegmentBuckets } from '../interface-nouse'

console.info('[PathService] v0 Baseline loaded');

export class PathService000000 {

  private viewer: Cesium.Viewer
  // private riderEntity: Cesium.Entity | undefined
  private currentPath: [number, number][] | null = null
  private animationState = 'idle'
  private riderPosition: Cesium.Cartesian3 = new Cesium.Cartesian3()

  private pathCalculationService: PathCalculationService = new PathCalculationService()
  private modelService: ModelService | null = null
  private orientation: Cesium.Quaternion = new Cesium.Quaternion
  private render: Cesium.Event.RemoveCallback | null = null
  private width = 5

  //下面是三种primitive的状态
  private pastPrimitive: Cesium.Primitive | null = null
  private currentPrimitive: Cesium.Primitive | null = null
  private futurePrimitive: Cesium.Primitive | null = null

  private flattenedSegments: Array<{
    segment: SegmentType
    globalStart: number //存储距离
    globalEnd: number //存储距离
    stepIndex: number
    segmentIndex: number
  }> = []
  private legs: any[] = []
  private activeLegIndex = -1

  private static sharedTerrainProvider: Cesium.TerrainProvider | null = null //共享地形提供器


  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
    this.modelService = new ModelService(this.viewer)
  }

  /**
   * 设置路径数据（包含精确的分段信息）
   */
  public setPathData(order0: CombinedOrder, stepSegments: Record<string, SegmentType[]>) {
    this.pathCalculationService.setPathData(order0, stepSegments)
    this.currentPath = order0.fullpath || null

    let accumulatedDistance = 0
    //1. 展平段数据
    //sort 在这里什么作用
    Object.keys(stepSegments).sort((a, b) => Number(a) - Number(b)).forEach(stepKey => {
      const segs = stepSegments[stepKey]

      segs.forEach((seg, idx) => {
        const globalStart = accumulatedDistance
        const globalEnd = accumulatedDistance + seg.distance
        this.flattenedSegments.push({
          segment: seg, globalStart, globalEnd, stepIndex: Number(stepKey), segmentIndex: idx
        })
        accumulatedDistance = globalEnd
      })
    })

    //2. 按里程碑划分 leg
    let searchStart = 0
    const scale = order0.milestones[order0.milestones.length - 1].cumDistance / this.flattenedSegments[this.flattenedSegments.length - 1].globalEnd //全局比例 cumDistance < flattenedDistance ,cumDistance / scale => cumDistance2flattenedDistance

    for (let i = 0; i < order0.milestones.length - 1; i++) {

      const currentMilestone = order0.milestones[i]
      const nextMilestone = order0.milestones[i + 1]

      const startD = currentMilestone.cumDistance
      const endD = nextMilestone.cumDistance

      // debugger
      const startIdx = this.findSegmentIndexByRealCum(startD, searchStart, scale)
      const endIdx = this.findSegmentIndexByRealCum(endD, startIdx, scale) + 1


      let startDistance = this.flattenedSegments[startIdx].globalStart
      let endDistance = this.flattenedSegments[endIdx - 1].globalEnd

      this.legs.push({
        startMilestone: i,
        endMilestone: i + 1,
        segmentIndices: this.range(startIdx, endIdx), //[startIdx,endIdx)的段
        //用于几何范围判断?
        startDistance,
        endDistance,

        //用于边界校准
        startCum: startD,
        endCum: endD
      })

      searchStart = endIdx
    }

    //最后一段 endDistance 对齐 order0.distance（修正几何偏差）
    // 那如果每一段的endDistance 都修正呢?
    if (this.legs.length > 0 && order0.distance) {
      const lastLegIdx = this.legs.length - 1
      const lastLeg = this.legs[lastLegIdx]
      //考虑三个送货点都在一起
      const reverseSecondLeg = this.legs[lastLegIdx - 1] //倒数第二个
      const reverseThirdLeg = this.legs[lastLegIdx - 2] //倒数第三个

      if (lastLeg.endDistance > order0.distance) {
        if (Math.abs(lastLeg.startDistance - lastLeg.endDistance) <= 1e-2) { //如果开始距离等于结束距离 且他们都大于订单总距离
          lastLeg.startDistance = order0.distance
          lastLeg.endDistance = order0.distance
        } else {
          lastLeg.endDistance = order0.distance
        }

        if (reverseSecondLeg.endDistance > order0.distance) {
          if (Math.abs(reverseSecondLeg.startDistance - reverseSecondLeg.endDistance) <= 1e-2) { //如果开始距离等于结束距离 且他们都大于订单总距离
            reverseSecondLeg.startDistance = order0.distance
            reverseSecondLeg.endDistance = order0.distance
          } else {
            reverseSecondLeg.endDistance = order0.distance
          }
          if (reverseThirdLeg.endDistance > order0.distance) {
            if (Math.abs(reverseThirdLeg.startDistance - reverseThirdLeg.endDistance) <= 1e-2) { //如果开始距离等于结束距离 且他们都大于订单总距离
              reverseThirdLeg.startDistance = order0.distance
              reverseThirdLeg.endDistance = order0.distance
            } else {
              reverseThirdLeg.endDistance = order0.distance
            }
          }
        }
        console.warn(
          `⚠️ flatten 总长(${lastLeg.endDistance.toFixed(2)}) > order.distance(${order0.distance.toFixed(2)}), 自动对齐`
        )

        // lastLeg.endDistance = order0.distance
      }
    }
  }

  //debug用 返回flattenStepSeg
  public getFlattened() {
    return this.flattenedSegments
  }

  //传入当前累计路程
  public updateSegmentsType(currentDistance: number, isBack: boolean): SegmentBuckets | null {

    const currentSegs: number[] = []
    const pastSegs: number[] = []
    const futureSegs: number[] = []
    let activeIndex = -1

    const pastIndex = this.activeLegIndex //-1

    // 如果骑手仍在上一次的路径段内，不重新计算 bucket（防止重复刷新）
    // 但有时运动到整个路径终点 仍然不更新 因为有浮点误差导致 比如99.99停下来了 但是总共是100m 那么最终状态不会更新
    //this.legs[pastIndex].endDistance存储的距离比实际计算出来的距离要大，导致最后终点轨迹状态更新失败，最后骑手运行到终点 仍然会被这句话弹出来，被误认为还是在上一段。
    const EPS = 0.01
    const toleranceD = 2

    //提前判断是否仍在当前段
    if (pastIndex >= 0 && this.legs[pastIndex]) {
      const pastLeg = this.legs[pastIndex]
      if (isBack) {
        // 当 currentDistance 仍大于上一段的起点时，还没真正“退过”该段
        if (pastLeg.startDistance - toleranceD < currentDistance + EPS)
          return null
      } else {
        if (pastLeg.endDistance - toleranceD > currentDistance + EPS)
          return null
      }

    }

    if (isBack) {
      for (let i = Math.min(this.legs.length - 1, pastIndex); i >= 0; i--) {
        const leg = this.legs[i]
        if (currentDistance <= leg.endDistance && currentDistance > leg.startDistance) {
          activeIndex = i
          break
        }
      }
    } else {
      // 1. 找到第一个 endDistance 大于 currentDistance 的 leg
      for (let i = 0; i < this.legs.length; i++) {
        const leg = this.legs[i]
        if (currentDistance >= leg.startDistance && currentDistance < leg.endDistance) {
          activeIndex = i
          break
        }
      }

      // 2.如果所有 leg 都走完，全部归入 past 当前的distance大于最后一共leg的endDistance 说明没有当前段和未来段，所有段落都归入past
      // 没有找到任何段

    }
    if (activeIndex === -1) {
      if (isBack) {
        this.activeLegIndex = 0
        const firstLeg = this.legs[0]
        if (!firstLeg) return null
        currentSegs.push(...firstLeg.segmentIndices)
        for (let i = 1; i < this.legs.length; i++) {
          futureSegs.push(...this.legs[i].segmentIndices)
        }
      } else {
        this.activeLegIndex = this.legs.length - 1
        for (const leg of this.legs) {
          pastSegs.push(...leg.segmentIndices)
        }
      }
    } else {
      // 3. 正常情况：切分为 past / current / future
      this.activeLegIndex = activeIndex

      currentSegs.push(...this.legs[activeIndex].segmentIndices)

      //和正向时的逻辑一样，在activeIndex之前的为past，之后的为future 
      for (let i = 0; i < activeIndex; i++) {
        pastSegs.push(...this.legs[i].segmentIndices)
      }

      for (let i = activeIndex + 1; i < this.legs.length; i++) {
        futureSegs.push(...this.legs[i].segmentIndices)
      }

    }

    return {
      currentSegs: currentSegs,
      pastSegs: pastSegs,
      futureSegs: futureSegs
    }

  }



  // 根据segmentType重新创建三种样式的primitive

  public applySegmentBuckets({ currentSegs, pastSegs, futureSegs }: SegmentBuckets) {
    const pastPoints = this.collectPoint(pastSegs)
    const currentPoints = this.collectPoint(currentSegs)
    const futurePoints = this.collectPoint(futureSegs)

    if (this.pastPrimitive) this.viewer.scene.primitives.remove(this.pastPrimitive) //先移除之前存的
    if (this.futurePrimitive) this.viewer.scene.primitives.remove(this.futurePrimitive) //先移除之前存的

    if (this.currentPrimitive) this.viewer.scene.primitives.remove(this.currentPrimitive)
    const PURPLE_COLOR = new Cesium.Color(0.659, 0.184, 0.988, 1.0);  //rgb(222,149,186)
    const BLUE_COLOR = new Cesium.Color(0.0, 0.6, 1.0, 0.4)
    if (pastPoints && pastPoints.length > 0)
      this.rebuildPastPrimitive(pastPoints, 5, PURPLE_COLOR, true)
    if (currentPoints && currentPoints.length > 0)
      this.drawDynamicPolyline(currentPoints, 4, true) //当前的是3d
    if (futurePoints && futurePoints.length > 0)
      this.rebuildFuturePrimitive(futurePoints, 5, BLUE_COLOR)
  }

  private rebuildPastPrimitive(pointsC3: Cesium.Cartesian3[], lineWidth: number, color: Cesium.Color, is3D: boolean) {
    const cleanPos = pointsC3.map(p => Cesium.Cartesian3.clone(p))
    const cleanShape = this.createPathShape(lineWidth).map(s => Cesium.Cartesian2.clone(s))

    pointsC3.map(p => Cesium.Cartesian3.clone(p))
    // 1. 准备几何
    const geometry = is3D
      ? new Cesium.PolylineVolumeGeometry({
        polylinePositions: cleanPos,
        shapePositions: cleanShape
      })
      : new Cesium.PolylineGeometry({
        positions: cleanPos,
        width: lineWidth
      })

    // 2. 创建primitive
    const primitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry
      }),
      appearance: this.createPastAppearance(color, is3D)
    })

    this.viewer.scene.primitives.add(primitive)
    this.pastPrimitive = primitive
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


  private createPastAppearance(color: Cesium.Color, is3D: boolean) {
    const material = new Cesium.Material({
      fabric: {
        type: 'pastFeaturePath3D',
        uniforms: {
          color,
          percent: 0.5
        },
        source: this.getFuturePathShaderSource()
      }
    })
    return is3D
      ? new Cesium.MaterialAppearance({
        material,
        // closed: true, //想要闭合 但没有用
        // translucent: false
      })
      : new Cesium.PolylineMaterialAppearance({ material })
  }

  private rebuildFuturePrimitive(pointsC3: Cesium.Cartesian3[], lineWidth: number, color: Cesium.Color) {
    const cleanPos = pointsC3.map(p => Cesium.Cartesian3.clone(p))
    const cleanShape = this.createPathShape(lineWidth).map(s => Cesium.Cartesian2.clone(s))
    // 1. 准备几何
    const geometry = new Cesium.PolylineVolumeGeometry({
      polylinePositions: cleanPos,
      shapePositions: cleanShape
    })

    // 2. 创建primitive
    const primitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry
      }),
      appearance: this.createFutureAppearance(color)
    })

    this.viewer.scene.primitives.add(primitive)
    this.futurePrimitive = primitive
  }

  private createFutureAppearance(color: Cesium.Color) {
    const material = new Cesium.Material({
      fabric: {
        type: 'futurePath3D',
        uniforms: {
          color,
          percent: 0.2
        },
        source: this.getFuturePathShaderSource()
      }
    })
    return new Cesium.MaterialAppearance({ material })
  }

  private getFuturePathShaderSource() {
    return `
      uniform vec4 color;               //传入颜色
      uniform float percent;           // 光带长度比例 (米数/总长)

      czm_material czm_getMaterial(czm_materialInput materialInput){
        vec4 outColor = color;
        czm_material material = czm_getDefaultMaterial(materialInput);

        vec2 st = materialInput.st;

        // =====================
        // 1. 基础轨迹 (全程均匀 + 呼吸)
        // =====================
        float time = fract(czm_frameNumber / 144.0); // [0.0 - 1.0)
        // float timePow = pow(time,0.1);
        float startPosition = time;

        outColor.a = 0.0; //默认透明度为0

        if(st.s > startPosition - percent && st.s < startPosition){
          float value = (st.s - (startPosition - percent)) / percent;
          outColor.a = value;
        }

        material.diffuse = czm_gammaCorrect(outColor.rgb);
        material.alpha = outColor.a; 
      
        return material;
    }
    `
  }

  private collectPoint(indices: number[]): Cesium.Cartesian3[] {
    const pointsC3: Cesium.Cartesian3[] = [];
    for (let i = 0; i < indices.length; i++) {
      const seg = this.flattenedSegments[indices[i]].segment;
      // 重新构造“干净”的 Cartesian3
      pointsC3.push(
        seg.startC3?.x && seg.startC3?.y && seg.startC3?.z
          // seg.startC3 instanceof Cesium.Cartesian3
          ? new Cesium.Cartesian3(seg.startC3.x, seg.startC3.y, seg.startC3.z)
          : Cesium.Cartesian3.fromDegrees(seg.start[0], seg.start[1])
      );
      if (i === indices.length - 1) {
        pointsC3.push(
          // seg.endC3 instanceof Cesium.Cartesian3
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
    this.drawDynamicPolyline(pathC3, lineWidth, true) //primitive已经存入currentPrimitive类变量
    // this.drawDynamicPolyline2D(pathC3, lineWidth) //primitive已经存入currentPrimitive类变量

    // 3.添加postRender 动态修改管道宽度失败，后续考虑把管道改成二维的，用shader控制宽度
    // this.recreatePrimitiveListener(pathC3)

    // 3. 创建骑手实体 callbackProperty 根据骑手和照相机位置调整骑手大小
    this.modelService?.initRiderModel(() => this.riderPosition, () => this.orientation)
    //4.照相机视野变化 目前是测试阶段 会缩放到路线全局观察
    // this.setCameraToPath(path)

  }

  public createRiderModel() {
    //初始化骑手位置 和 默认朝向
    this.initRiderPos()
    this.modelService?.initRiderModel(() => this.riderPosition, () => this.orientation)

  }


  public recreatRiderModel(riderPos: Cesium.Cartesian3, riderOri: Cesium.Quaternion) {//数据回显重建骑手模型
    // this.riderPosition = riderPos //这里一个
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

  private async handlePath(path: [number, number][], densifyStep: number, densify: boolean): Promise<Cesium.Cartesian3[]> {
    if (densify) {
      // 1. 等距离采样路径
      const densifiedPath = pathUtils.densifyPath(path, densifyStep)
      console.warn('densifiedPath多少个点? 采样完之后就1000多个点了 原本才100多个点 不要采样了吧', densifiedPath.length) //采样完之后就1000多个点了 原本才100多个点 不要采样了吧
      const { car3Array } = await this.lnglatToCartesian3(path)
      return car3Array //返回每隔一定距离采样一次的car3数组
    } else {
      const { car3Array } = await this.lnglatToCartesian3(path)
      return car3Array //返回每隔一定距离采样一次的car3数组
    }
  }

  //工具函数 从展平的step segment中找对应的点
  //算法是 从头检索到尾，返回距离里程碑最近的segment 里程碑距离路径(segments)很远，那么会一直检索到最后一个segment 最后一个segment距离里程碑最近，因为里程碑就是靠近整条路径终点。
  private findSegmentIndexByCoord(target: [number, number], searchStart: number, epsilon = 1e-4): number { //scale是整条flatten路径基于全局缩放的比例
    let nearestIndex = searchStart
    let nearestDist = Number.POSITIVE_INFINITY

    const targetC3 = Cesium.Cartesian3.fromDegrees(target[0], target[1])

    for (let i = searchStart; i < this.flattenedSegments.length; i++) {
      const seg = this.flattenedSegments[i].segment
      if (this.isClose(seg.start, target, epsilon)) return i
      if (this.isClose(seg.end, target, epsilon)) return i + 1

      const startC3 = seg.startC3 ? seg.startC3 : Cesium.Cartesian3.fromDegrees(seg.start[0], seg.start[1])
      // fallback：找最近的 start
      const dist = Cesium.Cartesian3.distance(startC3, targetC3)
      //防止里程碑(送货点)不在路径上，距离segments很远
      //这个没有用 因为不靠近里程碑的点都很远
      /* if (dist > 100) {
        nearestIndex = searchStart //重新开始搜查 这回映射flatten距离为百度刻度 
        let currentLegNewFlattenDistance = 0
        const realEndCum = currentMilestoneEndCum
        for (let j = 0; i < this.flattenedSegments.length; j++) {
          const seg = this.flattenedSegments[j].segment
          currentLegNewFlattenDistance += seg.cumdistance * scale
          if (currentLegNewFlattenDistance > realEndCum) {
            console.log('送餐/取餐点距离路径很远 把flatten用全局比例比例缩放 和realEndCum对比 当累计距离大于realEndCum shuom')
            debugger
          }
        }
      } */
      if (dist < nearestDist) {
        nearestDist = dist
        nearestIndex = i
      }
    }
    return nearestIndex
  }

  // 根据累计距离找到里程碑对应的segmentIdx
  private findSegmentIndexByRealCum(realStartD: number, searchIdx: number, scale: number) { // cumD < FD , scale = cumD / FD , cumD => FD 需要 cumD / scale

    const real2FlattenD = realStartD / scale //第一步 Baidu里程映射到flatten
    let idx = searchIdx
    const toleranceD = 5
    for (let i = searchIdx; i < this.flattenedSegments.length; i++) {
      const seg = this.flattenedSegments[i]
      if (seg.globalStart - toleranceD <= real2FlattenD && seg.globalEnd + toleranceD >= real2FlattenD) {
        idx = i
        break
      }
    }
    return idx
  }

  // 工具函数
  private isClose(a: [number, number], b: [number, number], eps: number): boolean {
    return Math.abs(a[0] - b[0]) <= eps && Math.abs(a[1] - b[1]) <= eps
  }

  private range(startIdx: number, endIdx: number): number[] {
    const indices: number[] = []
    for (let i = startIdx; i < endIdx; i++) {
      indices.push(i)
    }
    return indices
  }


  private recreatePrimitiveListener(pathC3: Cesium.Cartesian3[]) {
    let lastWidth = 5
    let lastPrimitive = this.currentPrimitive
    let lastUpdateTime = 0

    //postRender?
    this.render = this.viewer.scene.postRender.addEventListener(() => { //每帧检查照相机位置 然后重新创建一个
      // 时间节流
      const now = Date.now()
      if (now - lastUpdateTime < 100) {
        return //时间太短不重建直接返回
      }

      lastUpdateTime = now
      // 更新width的逻辑如下 但缺少每帧更新

      const cameraPos = this.viewer.scene.camera.positionWC //1.获取照相机位置
      //2.获取管道位置 取管道第一个点
      if (this.currentPath) {
        const fullpathFirst = this.currentPath[0]
        const fullpathFirstC3 = Cesium.Cartesian3.fromDegrees(fullpathFirst[0], fullpathFirst[1])
        const distance = Cesium.Cartesian3.distance(cameraPos, fullpathFirstC3)

        const cuurentwidth = this.calWidth(distance)
        //只有width变化大的时候创建移除
        if (Math.abs(cuurentwidth - lastWidth) > 5) {
          lastWidth = cuurentwidth
          //修改primitive能不能不只修改里面的geomerty?
          //重新创建一个primitive
          this.drawDynamicPolyline(pathC3, cuurentwidth, true) //这个不能写在移除的前面 因为都是用同一个容器装currentPrimitive 先创建再移除就是移除自己了

          //移除之前创建的primitive 那会不会抖动呢？ 先创建再移除应该不会抖动吧？
          //延迟移除呢？
          this.viewer.scene.primitives.remove(lastPrimitive)

          lastPrimitive = this.currentPrimitive //把当前的存入 lastPrimitive
        }

      }
    })

  }

  private calWidth(distance: number): number { //根据照相机位置计算管道的宽度
    const minDistance = 500
    const maxDistance = 2500
    const minWitdh = 5
    const maxWidth = 50

    const progress = Cesium.Math.clamp(
      (distance - minDistance) / (maxDistance - minDistance),
      0, 1
    )
    return Cesium.Math.lerp(minWitdh, maxWidth, progress)
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

    if (isDataReload && currentSegs.length < 1) { //显性知道骑手当前是在倒数第二个buckets轨迹？
      secondLastCurrentSegs = JSON.parse(localStorage.getItem('secondLastCurrentSegs') || '[]')
      startSegIdx = secondLastCurrentSegs[0]
      endSegIdx = secondLastCurrentSegs[secondLastCurrentSegs.length - 1]
    }

    const startGlobal = this.flattenedSegments[startSegIdx].globalStart
    const endGlobal = this.flattenedSegments[endSegIdx].globalEnd

    if (!this.currentPrimitive || !this.pathCalculationService) return null

    const order0 = (this.pathCalculationService as any).order0
    if (!order0 || order0.distance === 0) return null

    const progress = Math.min((cumDistance - startGlobal) / (endGlobal - startGlobal), 1)

    this.updatePathProgress(progress)
    return progress
  }

  private async lnglatToCartesian3(points: any) {
    if (!PathService.sharedTerrainProvider) {
      PathService.sharedTerrainProvider = await Cesium.createWorldTerrainAsync()
    }
    const car3Array: Cesium.Cartesian3[] = []
    //准备地形提供器
    const terrianProvider = PathService.sharedTerrainProvider
    // 1.1.2.1 准备需要更新高程信息的点位 经纬度转换为Array.<Cartographic>
    const positionRadians = points.map((point: [number, number]) => { //转换成为弧度制的经纬度
      return Cesium.Cartographic.fromDegrees(point[0], point[1])
    })
    const updatedPosition = await Cesium.sampleTerrainMostDetailed(terrianProvider, positionRadians)
    //经纬度坐标转换
    updatedPosition.forEach((cartographic: Cesium.Cartographic) => {
      car3Array.push(Cesium.Cartesian3.fromRadians(
        cartographic.longitude,
        cartographic.latitude,
        cartographic.height
      ))

    })
    return { car3Array }
  }

  private drawDynamicPolyline(car3Path: Cesium.Cartesian3[], lineWidth: number, is3D: boolean) {
    const cleanPos = car3Path.map(p => Cesium.Cartesian3.clone(p))
    const cleanShape = this.createPathShape(lineWidth).map(s => Cesium.Cartesian2.clone(s))

    const geometry = is3D ?
      new Cesium.PolylineVolumeGeometry({
        polylinePositions: cleanPos,
        shapePositions: cleanShape //修改这里
      }) :
      new Cesium.PolylineGeometry({
        positions: cleanPos,
        width: lineWidth
      })

    const polylineVolume = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: geometry
      }),
      appearance: this.createDynamicAppearance(is3D)
    })

    this.viewer.scene.primitives.add(polylineVolume)
    this.currentPrimitive = polylineVolume
  }

  /**
  * 创建路径横截面形状
  */
  private createPathShape(width: number, height = 5) {
    return [
      new Cesium.Cartesian2(-width, -height),
      new Cesium.Cartesian2(width, -height),
      new Cesium.Cartesian2(width, height),
      new Cesium.Cartesian2(-width, height),
    ]
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
   * 创建动态材质外观
   */
  private createDynamicAppearance(is3D: boolean) {
    const material = new Cesium.Material({
      translucent: true,
      fabric: {
        type: 'RiderPath',
        uniforms: {
          // color: color,
          progress: 0.0,
          percent: 0.2,
          lineWidth: 0.5,
        },
        source: this.getPathShaderSource()
      }
    })
    return is3D ? new Cesium.MaterialAppearance({ material }) : new Cesium.PolylineMaterialAppearance({ material })
  }

  private getPathShaderSource() {
    return `
      uniform float progress;          // 光带中心 (0~1)
      uniform float percent;           // 光带长度比例 (米数/总长)

      czm_material czm_getMaterial(czm_materialInput materialInput){
      czm_material material = czm_getDefaultMaterial(materialInput);
      vec2 st = materialInput.st;

      // =====================
      // 1. 基础轨迹 (全程均匀 + 呼吸)
      // =====================
      float time = fract(czm_frameNumber / 144.0);

      // 呼吸脉冲，整条线亮度上下浮动 0.7~1.0
      float breathe = 0.9 + 0.3 * sin(time * 1.5); 
      
      // 统一的青绿底色（不随 st.s 改变，保持亮度均匀）
      vec3 trailColor = vec3(0.0, 0.8, 0.5) * breathe;

      // =====================
      // 2. 动态光带 (骑手当前位置)
      // =====================
      float dist = abs(st.s - progress);
      float halfLen = percent / 2.0;

      float intensity = smoothstep(halfLen, 0.0, dist);
      // float intensity = exp(-pow(dist / halfLen, 2.0));
      // float pulse = 0.75 + 0.25 * sin(time * 2.5 + st.s * 8.0);
      float pulse = 0.8 + 0.2 * sin(time * 3.0); // 不加 st.s，脉冲更集中在骑手位置
      vec3 glowColor = vec3(0.0, 1.0, 0.9) * intensity * pulse; // 电光蓝青

      // =====================
      // 3. 合成颜色
      // =====================
      vec3 finalColor = trailColor + glowColor;
      
      material.diffuse = czm_gammaCorrect(finalColor);
      material.alpha = 0.7; 
      // material.alpha = clamp(0.55 + 0.45 * intensity, 0.55, 1.0);

      return material;
    }
    `
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
    if (this.currentPrimitive && this.currentPrimitive.appearance.material) {
      const material = this.currentPrimitive.appearance.material
      material.uniforms.progress = progress
    }
  }


  private setCameraToPath(path: [number, number][]) {
    const line = turf.lineString(path)
    const bbox = turf.bbox(line)
    this.viewer.camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(...bbox),
      orientation: {
        heading: 0.0,
        pitch: -Cesium.Math.PI_OVER_TWO,
        roll: 0.0
      },
      duration: 2
    })
  }

  /**
   * 清理路径绘制
   */
  cleanup() {
    if (this.currentPrimitive) {
      this.viewer.scene.primitives.remove(this.currentPrimitive)
      this.currentPrimitive = null
    }
    if (this.pastPrimitive) {
      this.viewer.scene.primitives.remove(this.pastPrimitive)
      this.pastPrimitive = null
    }
    if (this.futurePrimitive) {
      this.viewer.scene.primitives.remove(this.futurePrimitive)
      this.futurePrimitive = null
    }
    this.animationState = 'idle'

    // 加上这几行 —— 彻底清空缓存
    this.flattenedSegments = []
    this.legs = []
    this.currentPath = null
    this.activeLegIndex = -1
    this.animationState = 'idle'
    this.pathCalculationService = new PathCalculationService()
    this.modelService?.clear()

    console.log('清除骑手模型之后viewer上还有没有', this.viewer.entities.getById('rider'))

    //不要销毁模型实例  因为复用 createWorldTerrainAsync ,worker
    this.modelService = null

    console.log('[PathService] 已彻底清空')

  }
}