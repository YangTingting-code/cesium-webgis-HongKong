import * as Cesium from 'cesium'
import { AnimationService } from '../AnimationManage/AnimationService'
import { PointService } from '@/service/cesium/takeaway/PointManage/PointService'
import { PathService } from '../PathManage/PathService'
import type { CombinedOrder, SegmentType, DeliveryOrder } from '@/interface/takeaway/interface'

// import { getSequOrders } from '../utils/sequOrders'
import { registerServices, clearServices } from '@/service/cesium/takeaway/GlobalServices'
import { useOrderStore } from '@/store/takeaway/orderStore'

import { ScenePersistence } from '@/service/cesium/takeaway/SceneManage/ScenePersistence'
import { CameraService } from '@/service/cesium/takeaway/SceneManage/CameraService'
import { DataService } from '@/service/cesium/takeaway//SceneManage/DataService'

export class SceneStateManager {
  private viewer: Cesium.Viewer
  private animationService: AnimationService | null = null
  private pointService: PointService | null = null
  private pathService: PathService | null = null

  private orders: DeliveryOrder[] | null = null
  private combinedOrder: CombinedOrder | null = null
  private orderStepSegments: Record<string, SegmentType[]> | null = null
  private order0StartIso: string | null = null

  private setTimeOutNumber: number | null = null

  private orderStorePinia = useOrderStore()

  //全局状态驱动
  private globalStatusInterval: number | null = null

  private combinedorderControl = ScenePersistence.getCombinedorderControl() //提前存在localstorage
  private currentTimeslot: number = this.combinedorderControl.currentTimeslot
  private currentRegion: string = this.combinedorderControl.currentRegion
  private currentRiderIdx: number = this.combinedorderControl.currentRiderIdx ?? 0

  private ridersIds: string[] = []

  // 类里新增字段
  private cameraService: CameraService | null = null
  private dataService = new DataService()

  //服务是否初始化的标志
  private isInitialized = false

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
  }

  // ---- 数据加载 ----//
  //第三步：根据时间段 和 区域 加载骑手数据
  public async loadRiderDataByRegionTime(region: string, timeslot: number) {

    const { riderids_combined, currentRiderId, currentIdx } = await this.dataService.loadRiderDataByRegionTime(region, timeslot, this.currentRiderIdx)
    this.ridersIds = riderids_combined
    this.currentRiderIdx = currentIdx

    this.combinedorderControl = ScenePersistence.getCombinedorderControl() //更新一下数据 因为可能索引号超过了 在订单面板组件层修改了索引号 但是这里的索引号还是旧的 旧的依旧会覆盖

    this.currentTimeslot = timeslot
    this.currentRegion = region

    Object.assign(this.combinedorderControl, {
      currentTimeslot: timeslot,
      currentRegion: region,
      currentRiderIdx: this.currentRiderIdx
    })

    ScenePersistence.setCombinedorderControl(this.combinedorderControl)

    //加载第一个骑手的数据 !!切换订单的话这里要同步数据
    const bundle = await this.loadRiderData(region, timeslot, currentRiderId)

    return bundle
  }


  // --- 切换骑手 --- //
  //第四步：点击切换骑手(也就是切换订单)
  public async switchRider() {
    if (this.ridersIds.length === 0) {
      console.log('没有骑手ids，无法切换')
      return
    }

    const { nextIdx, nextId } = this.dataService.getNextRider(this.currentRiderIdx, this.ridersIds)

    this.currentRiderIdx = nextIdx

    Object.assign(this.combinedorderControl, {
      currentRiderIdx: this.currentRiderIdx
    })
    ScenePersistence.setCombinedorderControl(this.combinedorderControl)

    //清除上一个骑手的数据
    this.clear()//全局定时器已关闭

    const timeslot = this.currentTimeslot

    //加载骑手的数据
    const bundle = await this.loadRiderData(this.currentRegion, timeslot, nextId)

    //初始化 : 服务 相机监听 回显
    await this.initialize()

    //订单状态重置
    this.orderStorePinia.resetStatus()

    return bundle

    //再次开启全局定时器
    // this.startGlobalStatusTimer()
  }


  // --- 订单状态重置 ---- //
  public resetOrderControlStatus() {
    this.orderStorePinia.resetStatus()
  }

  // --- 初始化服务 --- //
  async initialize() {
    if (this.isInitialized) return

    // 初始化服务 orders必须有值
    this.initServices()

    // --- 相机服务 --- //
    if (!this.cameraService) this.cameraService = new CameraService(this.viewer)

    this.cameraService.start({
      getRiderPos: () => this.pathService?.getRiderPos(),
      getRiderOri: () => this.pathService?.getRiderOri(),
      getPopupState: () => this.pointService?.getPopupState(),
      getClockElapsed: () => Cesium.JulianDate.secondsDifference(
        this.viewer.clock.currentTime,
        this.viewer.clock.startTime
      )
    })

    if (ScenePersistence.getIsPath()) {
      await this.restoreScene()
    }

    this.isInitialized = true

  }


  // --- 加载数据 --- //
  /**
   * 
   * @param orderStore 管理数据的类
   * @param region 区域
   * @param timeslot 时间点
   * @param riderId 组合订单的id e.g. rider_9bv9_combined 
   */
  private async loadRiderData(region: string, timeslot: number, riderId: string) {
    const bundle = await this.dataService.loadRiderData(region, timeslot, riderId)

    if (!bundle) {
      console.log('骑手数据没有准备好')
      return
    }

    this.combinedOrder = bundle.combinedOrder
    this.orderStepSegments = bundle.orderStepSegments
    this.order0StartIso = bundle.order0StartIso
    this.orders = bundle.sequOrders

    return bundle //结果返回出去给 useSceneLifecycle 处理, 把订单数据显示在ui面板上
  }

  // --- PathService、AnimationService、PointService初始化 --- //
  public initServices() {
    //初始化服务
    this.pathService = new PathService(this.viewer)
    this.animationService = new AnimationService(this.viewer, this.pathService)
    this.pointService = this.orders ? new PointService(this.viewer, this.orders) : null

    //注册到全局
    registerServices({
      pathService: this.pathService,
      animationService: this.animationService,
      pointService: this.pointService
    })
  }

  // --- 刷新前状态恢复 --- //
  private restoreScene = async () => {
    if (!this.pointService || !this.pathService || !this.animationService) return

    // 点位回显
    await this.pointService.drawCombinedStops()

    // --- 恢复照相机位置 --- //
    this.cameraService?.restore()

    // 获取骑手位置 
    const riderPosOri = ScenePersistence.getRiderPosOri()

    if (riderPosOri) {
      //恢复骑手模型
      this.pathService.restoreRiderModel(riderPosOri.riderPos, riderPosOri.riderOri)
    }
    //路径数据设置 
    if (!this.combinedOrder || !this.orderStepSegments || !this.order0StartIso) return

    this.animationService.setAnimationData(this.combinedOrder, this.orderStepSegments)
    // 开始动画
    this.animationService.startAnimation(this.combinedOrder.duration, this.order0StartIso)

    // 新增： 读取上次保存的进度时间（s）  //延迟回显骑手的进度
    let lastElapsed = ScenePersistence.getLastElapsed()

    //具体计算骑手位置和朝向
    this.setTimeOutNumber = setTimeout(() => { //过一会在更新骑手位置
      this.animationService?.seekToTime(lastElapsed)
    }, 20)

    //弹窗回显 获取弹窗状态
    const popupShowState = ScenePersistence.getPopupShowState()

    this.pointService.reshowPopup(popupShowState)

    //面板数据回显
    //加载
  }

  // --- 清理 --- //
  public clear() {
    this.destroyServices()
    ScenePersistence.setIsPath(false)

    //相机 与 beforeunload
    this.cameraService?.stop()
    this.cleanupResources()

    //清理会话态持久化
    ScenePersistence.clearSessionKeys()

    this.isInitialized = false
  }

  private destroyServices() {

    this.animationService?.destroy() //销毁动画服务
    this.pointService?.clear() //清除弹窗、图钉图标
    //确保动画服务在路径服务之前销毁
    this.pathService?.cleanup()

    clearServices()
  }

  private cleanupResources() {
    //清除延时器
    if (this.setTimeOutNumber)
      clearTimeout(this.setTimeOutNumber)

    //清除实例
    this.pathService = null
    this.pointService = null
    this.animationService = null
  }

  //--- 外界得到服务 --- //
  public getServices() {
    return {
      animationService: this.animationService,
      pathService: this.pathService,
      pointService: this.pointService
    }
  }

  // --- 外界得到数据 --- //
  public getData() {
    return {
      // combinedOrders: this.combinedOrders,
      orderStepSegments: this.orderStepSegments,
      combinedOrder: this.combinedOrder,
      order0StartIso: this.order0StartIso  //`2025-10-09T12:00:00+08:00`
    }
  }


  public async initializeOrders(region: string, timeslot: number) {
    const bundle = await this.loadRiderDataByRegionTime(region, timeslot)

    await this.initialize()

    return bundle
  }
}