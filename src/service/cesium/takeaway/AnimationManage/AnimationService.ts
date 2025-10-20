import * as Cesium from 'cesium'
import type { CombinedOrder, DeliveryOrder, SegmentType } from '@/interface/takeaway/interface'
// import { useBucketStore } from '../store/bucketStore'
import { ClockController } from '@/service/cesium/takeaway/AnimationManage/ClockController'
import { OrderTracker } from '@/service/cesium/takeaway/AnimationManage/OrderTracker'
import { PathTracker } from '@/service/cesium/takeaway/AnimationManage/PathTracker'
import { TickLoop } from '@/service/cesium/takeaway/AnimationManage/TickLoop'

export class AnimationService {

  private viewer: Cesium.Viewer

  private isAnimating: boolean = false
  private duration: number = 0
  private globalProgress: number = 0
  private order0: DeliveryOrder | null = null

  private clockController: ClockController
  private orderTracker: OrderTracker = new OrderTracker()
  private pathTracker: PathTracker

  private tickLoop: TickLoop | null = null

  constructor(viewer: Cesium.Viewer, pathService: any) {
    this.viewer = viewer
    this.clockController = new ClockController(viewer)
    this.pathTracker = new PathTracker(pathService)

  }

  /**
   * 设置动画数据
   * @param orders 订单数据数组
   * @param stepSegments 路径分段数据
   */
  public setAnimationData(order: CombinedOrder, perStepSegments: Record<string, SegmentType[]>) {
    this.order0 = order
    this.duration = order.duration

    this.pathTracker.setPathData(order, perStepSegments)
  }


  /**
   * 开始路径动画
   * @param {number} duration - 动画总时长（秒）
   * @param {string} startTimeISO - 开始时间ISO字符串
   */
  public startAnimation(duration: number, startTimeISO: string) {
    if (this.isAnimating) {
      console.warn('动画已在运行中')
      return
    }
    if (!this.order0) {
      console.error('动画数据未设置，请先调用 setAnimationData()')
      return
    }

    this.duration = duration
    this.isAnimating = true
    this.globalProgress = 0
    // 设置Cesium时钟

    this.clockController.setupClock(startTimeISO, duration)

    //自动飞到骑手附近 第一次创建的时候飞过去 数据回显阶段不要飞过去
    //但问题是切换订单之后 isPath 状态什么样? 
    this.pathTracker.isSetCamera()

    // 开始动画循环
    this.tickLoop = new TickLoop(this.viewer, {
      pathTracker: this.pathTracker,
      orderTracker: this.orderTracker,
      clockController: this.clockController,
      order: this.order0
    })
    this.tickLoop.start()
  }


  /**
   * 跳转到指定时间点
   * @param targetTime 目标时间（秒）
   */
  seekToTime(targetTime: number, isDataReload: boolean) {
    const start = this.clockController.getStart()
    if (!start) return

    const deltaSeconds = Math.max(0, Math.min(targetTime, this.duration))

    this.clockController.seekSeconds(deltaSeconds)

    // 更新骑手位置和进度
    const cumDistance =
      this.pathTracker.updateRiderPosition(deltaSeconds, isDataReload)

    if (this.order0 && this.order0.distance > 0) {
      this.globalProgress = Math.min(cumDistance / this.order0.distance, 1.0)
    }
  }

  /**
   * 跳转到指定进度
   * @param progress 进度值 0-1
   */
  seekToProgress(progress: number) {
    const targetTime = progress * this.duration
    this.seekToTime(targetTime, false)
  }

  /**
  * 获取当前动画状态
  */
  getAnimationState() {
    return {
      // isAnimating: this.isAnimating,
      globalProgress: this.globalProgress,
      elapsedTime: this.clockController.getElapsed(),
      totalDuration: this.duration,
      animationSpeed: this.viewer.clock.multiplier
    }
  }

  /**
   * 进度更新回调（可以被子类重写或通过事件监听）
   */
  protected onProgressUpdate(progress: number, distance: number, elapsedTime: number) {
    // 可以在这里添加自定义的进度处理逻辑
    // 例如：更新UI进度条、触发自定义事件等
  }

  /**
   * 动画完成回调
   */
  protected onAnimationComplete() {
    this.pathTracker.reset()
    console.log('骑手动画完成！')
    // 可以在这里添加动画完成后的处理逻辑
    // 例如：显示完成提示、自动开始下一个动画等
  }


  /**
   * 销毁服务，清理资源
   */
  destroy() {
    if (this.tickLoop) {
      this.tickLoop.destroy()
    }
    this.clockController.stopAnimation()
    this.order0 = null
    console.log('AnimationService 已销毁')
  }
}
