import { defineStore } from 'pinia'
import type { DeliveryOrder, CombinedOrder } from '@/views/cesium/toolbar/takeaway/interface-nouse'
// import { getDistanceM } from '@/views/cesium/toolbar/takeaway/utils/pathUtils';
// import {type Ref} from 'vue' //Pinia 会自动把 state 变成响应式的
export const useOrderStore = defineStore('order', {
  state: () => ({
    //Pinia 会自动把 state 变成响应式的
    //存放需要共享的数据
    sequOrders: [] as DeliveryOrder[],
    combinedOrder: {} as CombinedOrder,
    ordersInfo: {} as Record<string, Record<string, Record<string, unknown>>>, //订单详情
    orderStatusMap: { //这个后续能不能根据实际订单数量初始化？ 比如两个订单 
      '第一单': '赶往商家',
      '第二单': '赶往商家',
      '第三单': '赶往商家',
    } as Record<string, string>, //每单的状态
    currentUpdateOrder: {} as Record<string, string>,
    sequLngLatPickDrop: {} as Record<string, Record<string, number[]>>, //每单的取餐送餐坐标

  }),

  actions: {
    getOrdersInfo() {
      return this.ordersInfo
    },
    getStatusMap() {
      return this.orderStatusMap
    },
    getCombinedOrder() {
      return this.combinedOrder
    },
    getStatusKeyById(riderId: string): string | null { //根据索引号推断是orderStatusMap的第几单
      for (let i = 0; i < this.sequOrders.length; i++) {
        if (this.sequOrders[i].riderId === riderId) {
          return i === 0 ? '第一单' : i === 1 ? '第二单' : '第三单'
        }
      }
      return null
    },
    getStatusByKey(key: string) {
      return this.orderStatusMap[key]
    },
    getStatus() {
      return this.orderStatusMap
    },

    getUpdatedOrder() {
      return this.currentUpdateOrder
    },

    saveSequOrders(sequOrders: DeliveryOrder[]) {
      this.sequOrders = sequOrders
    },
    saveCombinedOrder(combinedOrder: CombinedOrder) {
      this.combinedOrder = combinedOrder
    },


    initOrders() {//初始化订单
      const indexMap: Record<number, string> = {
        0: '一',
        1: '二',
        2: '三',
      }
      this.sequOrders.forEach((o, idx) => {
        this.ordersInfo[`第${indexMap[idx]}单`] = { '取餐点': {}, '送餐点': {} }
        this.ordersInfo[`第${indexMap[idx]}单`]['取餐点']['name'] = o.pickupNodes[0].tag['name:zh'] ? o.pickupNodes[0].tag['name:zh'] : o.pickupNodes[0].tag['name'] as string
        this.ordersInfo[`第${indexMap[idx]}单`]['取餐点']['street'] = o.pickupNodes[0].tag['addr:street:zh'] ? o.pickupNodes[0].tag['addr:street:zh'] : o.pickupNodes[0].tag['addr:street']
        this.ordersInfo[`第${indexMap[idx]}单`]['取餐点']['housenumber'] = o.pickupNodes[0].tag['addr:housenumber']

        this.ordersInfo[`第${indexMap[idx]}单`]['送餐点']['name'] = o.dropoffNodes[0].tag['name:zh'] ? o.dropoffNodes[0].tag['name:zh'] : o.dropoffNodes[0].tag['name']
        this.ordersInfo[`第${indexMap[idx]}单`]['送餐点']['description'] = o.dropoffNodes[0].tag['description:zh'] ? o.dropoffNodes[0].tag['description:zh'] : o.dropoffNodes[0].tag['description']

        //可以做地理编码 地点找到地址

        //存储取餐送餐点的坐标
        this.sequLngLatPickDrop[`第${indexMap[idx]}单`] = { '取餐点': [], '送餐点': [] }
        this.sequLngLatPickDrop[`第${indexMap[idx]}单`]['取餐点'] = [o.pickupNodes[0].lng, o.pickupNodes[0].lat]
        this.sequLngLatPickDrop[`第${indexMap[idx]}单`]['送餐点'] = [o.dropoffNodes[0].lng, o.dropoffNodes[0].lat]
      })
    },

    resetStatus() {
      Object.keys(this.orderStatusMap).forEach(k => {
        this.setStatusByKey(k, '赶往商家')
      })
    },

    setStatusByKey(statusKey: string, status: string) {
      this.orderStatusMap[statusKey] = status
      this.currentUpdateOrder['orderId'] = statusKey
      this.currentUpdateOrder['orderStatus'] = status
    },

  }
})