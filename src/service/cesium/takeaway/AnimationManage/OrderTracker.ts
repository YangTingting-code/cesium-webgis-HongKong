// 专门负责“里程碑追踪与订单状态更新”
import { useOrderStore } from '@/store/takeaway/orderStore'
import { type Milestone } from '@/interface/takeaway/interface'
export class OrderTracker {
  private orderStore = useOrderStore()
  private lastCumDistance: number = 0
  private lastMilestoneIndex: number = 0

  public checkMilestoneProgress(riderCumDistance: number) {

    const combinedOrder = this.orderStore.getCombinedOrder()
    const milestones = combinedOrder?.milestones || []
    if (milestones.length === 0) return

    const DIST_TOLERANCE = 5

    const prevDistance = this.lastCumDistance
    const nextDistance = riderCumDistance

    const isBack = this.isBack(riderCumDistance)

    // const isBack = prevDistance > riderCumDistance //如果之前距离大于现在的距离 那么就是true 否则是false
    if (isBack) {
      //遍历之前的里程碑
      for (let i = this.lastMilestoneIndex; i > 0; i--) {
        const current = milestones[i]
        if (nextDistance <= current.cumDistance &&
          prevDistance > current.cumDistance
        ) {
          this.lastMilestoneIndex = i - 1
          this.updateOrderStatus(current, isBack)
        }
      }
    } else {
      //这个循环是从上一次触发的里程碑开始 遍历后面所有的里程碑 依次检查
      for (let i = this.lastMilestoneIndex + 1; i < milestones.length; i++) { //骑手出生点不算
        const current = milestones[i]

        //只要骑手从上次距离跨越了当前里程碑，就触发
        if (current.cumDistance >= prevDistance - DIST_TOLERANCE &&
          current.cumDistance <= nextDistance + DIST_TOLERANCE
        ) {
          this.lastMilestoneIndex = i
          this.updateOrderStatus(current, isBack)
        }
      }
    }

    //最后更新记录
    // 放在循环外：确保每帧检查“上一帧到当前帧”区间内跨越的所有里程碑，不漏检
    this.lastCumDistance = riderCumDistance //为什么不是写在if语句？  因为写在if里面起不到跨越检测的效果 写在里面的话上一帧的距离被立马更新成骑手当前距离 ，问题是骑手上一帧到这一帧之间跨越的距离很长(因为倍速变大 时间差变大 骑手距离变大),距离很长跨越了多个送货点 导致部分送货点会漏掉更新  写在外面就是把所有剩下的里程碑(送货点)都检查过一边  这样就不会漏
  }

  private updateOrderStatus(milestone: Milestone, isBack: boolean) {
    const orderId = milestone.orderId
    if (!orderId) return
    const statusMapKey = this.orderStore.getStatusKeyById(orderId)
    if (!statusMapKey) return

    if (statusMapKey) {
      if (isBack) {
        if (milestone.type === 'pickup') {
          this.orderStore.setStatusByKey(statusMapKey, '赶往商家')
        } else if (milestone.type === 'dropoff') {
          this.orderStore.setStatusByKey(statusMapKey, '配送中')
        }
      } else {
        if (milestone.type === 'pickup') {
          this.orderStore.setStatusByKey(statusMapKey, '配送中')
        } else if (milestone.type === 'dropoff') {
          this.orderStore.setStatusByKey(statusMapKey, '已送达')
        }
      }
    }
  }

  public isBack(riderCumDistance: number): boolean { //外界要获取是 isBack 这个函数需要在checkMilestoneProgress之前调用 因为checkMilestoneProgress调用完毕之后 isBack 永远是true  this.lastCumDistance === riderCumDistance
    return this.lastCumDistance > riderCumDistance
  }

  //复用准备
  public reset() {
    this.lastCumDistance = 0
    this.lastMilestoneIndex = 0
  }

}