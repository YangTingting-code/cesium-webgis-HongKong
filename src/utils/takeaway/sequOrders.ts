
import type { DeliveryOrder, NodePoint, CombinedOrder } from '../interface'

/**
 * 
 * @param orders 需要排序的订单（3张单）
 * @param combinedOrder 一张组合订单
 * @returns 返回排好序的三张单
 */
export async function getSequOrders(orders: DeliveryOrder[], combinedOrder: CombinedOrder) {
  //按照取餐顺序显示订单内容

  const pLngLatOrder: Record<string, DeliveryOrder> = {} // 用 lnglat2Key 把lng lat 坐标转换成 key,存储的是一整个订单
  const pLngLatArr: string[] = []

  orders.forEach(o => {
    const pickupNode = o.pickupNodes[0]
    const lnglatKey = lnglat2Key([pickupNode.lng, pickupNode.lat])
    pLngLatArr.push(lnglatKey) //存储pickup的经纬度 string

    pLngLatOrder[lnglatKey] = o
  })

  const milestones = combinedOrder.milestones
  const sequOrder: DeliveryOrder[] = []

  for (let i = 0; i < milestones.length; i++) {
    const lnglatKey = lnglat2Key([milestones[i].lng, milestones[i].lat]) // milestones[i] 是[lng,lat]

    if (pLngLatArr.includes(lnglatKey)) {
      sequOrder.push(pLngLatOrder[lnglatKey])
    }
  }

  return sequOrder

}

/**
 * 
 * @param orders 遍历的订单(有序的 /无序都行)
 * @param index 当前发现有重复的索引
 * @param lnglat 当前重复的位置 wgs84
 * @param isDropoff 是检查送货点重复还是取餐点重复
 */
export function getIndexByLnglat(option: { orders: DeliveryOrder[], index: number, lnglat: [number, number], isDropoff: boolean }): number | null {

  const { orders, index, lnglat, isDropoff } = option

  if (isDropoff) {
    for (let i = 0; i < index; i++) {
      const dropoffNode = orders[i].dropoffNodes[0]
      if (isLngLatSame(lnglat, dropoffNode)) {
        return i
      }
    }
  } else {
    //下面是pickupNodes重复
    for (let i = 0; i < index; i++) {
      const pickupNode = orders[i].pickupNodes[0]
      if (isLngLatSame(lnglat, pickupNode)) {
        return i
      }
    }
  }
  return null
}

function isLngLatSame(lnglat: [number, number], nodePoint: NodePoint): boolean {
  return (Math.abs(lnglat[0] - nodePoint.lng) <= 1e-6 && Math.abs(lnglat[1] - nodePoint.lat) <= 1e-6) ? true : false
}

//工具函数 lnglat坐标转换成字符串
function lnglat2Key(lnglat: number[]) {
  return `${lnglat[0]},${lnglat[1]}`
}

