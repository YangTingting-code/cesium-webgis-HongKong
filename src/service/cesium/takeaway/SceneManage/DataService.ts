
// import { ScenePersistence } from './ScenePersistence'
import { OrderStore } from '@/data/takeaway/OrderStore'
import type { DeliveryOrder } from '@/interface/takeaway/interface'
import { getSequOrders } from '@/utils/toolbar/takeaway/sequOrders'
// import { useOrderStore } from '@/views/rightPanel/top/store/orderStore'

export class DataService {
  private orderStore = new OrderStore()

  // private order0StartIso: string | null = null

  private todayIso(baseIso: string): string {
    const d = new Date() //生成当天时间

    const z = (n: number) => (n < 10 ? '0' : '') + n
    const today = d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate())
    return `${today}${baseIso}`
  }

  // 主函数：加载一个骑手的完整数据包
  async loadRiderData(region: string, timeslot: number, riderId: string) {
    //根据区域、时间、骑手 获取组合订单、stepSegement并赋值给全局
    const orderStore = new OrderStore()
    const comOrSeg = await orderStore.getCombinedOrderById(region, timeslot, riderId)
    if (!comOrSeg) return

    const order0StartIso = this.todayIso(comOrSeg.startTimeIso)

    const orders: DeliveryOrder[] = await orderStore.getOrdersByCombinedOrder(region, timeslot, comOrSeg.combinedOrder)

    const sequOrders = await getSequOrders(orders, comOrSeg.combinedOrder) //订单按照取餐顺序排序

    return {
      combinedOrder: comOrSeg.combinedOrder,
      orderStepSegments: comOrSeg.orderStepSegments,
      order0StartIso,
      sequOrders,
    }

  }

  async getRiderIds(region: string, timeslot: number): Promise<string[]> {
    return await this.orderStore.getRiderIdsByRegionTimeslot(region, timeslot)
  }

  async loadRiderDataByRegionTime(region: string, timeslot: number, currentIdx: number) {
    const riderids_combined = await this.getRiderIds(region, timeslot)
    if (riderids_combined.length === 0) throw new Error('没有可用骑手数据')
    const lastIdx = riderids_combined.length - 1

    const minId = Math.min(lastIdx, currentIdx)
    const currentRiderId = riderids_combined[minId]
    return {
      riderids_combined, currentRiderId, currentIdx: minId
    }
  }

  getNextRider(currentRiderIdx: number, ridersIds: string[]) {
    const nextIdx = (currentRiderIdx + 1) % ridersIds.length //可以一直累+1 不用关心会不会超出骑手总数
    const nextId = ridersIds[nextIdx]
    return { nextIdx, nextId }
  }

}
