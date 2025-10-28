import { Viewer, Clock } from 'cesium'
import { ClockController } from './ClockController'
import type { PathTracker } from './PathTracker'
import type { OrderTracker } from './OrderTracker'
import { ScenePersistence } from '../SceneManage/ScenePersistence'

export class TickLoop {
  private listener: any
  private viewer: Viewer
  private destroyed = false
  private clockController

  private pathTracker
  private orderTracker

  private globalProgress = 0.0

  private order: any

  constructor(viewer: Viewer, deps: {
    pathTracker: PathTracker,
    orderTracker: OrderTracker,
    clockController: ClockController,
    order: any
  }) {
    this.viewer = viewer
    this.clockController = deps.clockController
    this.pathTracker = deps.pathTracker
    this.orderTracker = deps.orderTracker
    this.order = deps.order
  }

  start() {
    let useLastElapsed = false
    let lastElapsed: number
    const isPath = ScenePersistence.getIsPath()

    if (isPath) {
      useLastElapsed = true
      lastElapsed = ScenePersistence.getLastElapsed()
    }

    //在onTick回调之前用 销毁锁 判断是否已执行过销毁逻辑 
    if (this.destroyed) return

    const tickHandler = (clock: Clock) => {
      if (this.destroyed) return

      if (!clock.shouldAnimate) return

      const elapsed = useLastElapsed ? lastElapsed : this.clockController.getElapsed()
      useLastElapsed = false

      const cumDistance = this.pathTracker.getCumDistance(elapsed)

      //更新骑手朝向位置 ,此时不是回显 填flase 直接计算出骑手的朝向和位置
      this.pathTracker.updateRiderPosition(false)

      // const isBack = this.lastCumDistance > cumDistance //上一次的距离大于这一次的距离 说明时间倒流
      const isBack = this.orderTracker.isBack(cumDistance)

      //绘制轨迹线
      this.pathTracker.updateFrame(isBack)

      // 新增：根据骑手位置更新订单状态 
      this.orderTracker.checkMilestoneProgress(cumDistance)

      if (this.order && this.order.distance > 0) {
        //这里也要改 不用改 正整条路径
        this.globalProgress = Math.min(cumDistance / this.order.distance, 1.0)
      }

      // 触发进度更新事件 为什么要有这个函数？ 更新进度回调 添加自定义的进度处理逻辑
      // this.onProgressUpdate(this.globalProgress, cumDistance, elapsed)

      // 检查动画是否完成
      if (this.shouldStop(elapsed, cumDistance) && this.viewer.clock.multiplier > 0) {
        this.clockController.stopAnimation()
        this.pathTracker.reset()
      }

    }

    this.listener = tickHandler
    this.viewer.clock.onTick.addEventListener(this.listener)
  }

  private shouldStop(elapsed: number, cumDistance: number): boolean {
    console.log('cumDistance', cumDistance)
    console.log('this.order.distance', this.order.distance)
    console.log('this.order.distance - 0.01', this.order.distance - 0.01)
    if (!this.order) return false
    return (
      elapsed >= this.order.duration ||
      this.globalProgress >= 1 - 1e-6 ||
      this.order && cumDistance >= this.order.distance - 0.01
    )
  }

  stop() {
    this.clockController.stopAnimation()

    if (this.listener) {
      this.viewer.clock.onTick.removeEventListener(this.listener)
      this.listener = null
    }
  }

  destroy() {
    this.stop()
    this.destroyed = true
  }

}