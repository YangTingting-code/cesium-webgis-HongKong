import localForage from "localforage"
import type { DeliveryOrder, NodePoint, CombinedOrder, SlotData } from "@/interface/takeaway/interface"
import { classifyDeliveryNodes } from "@/utils/toolbar/takeaway/parseData"
import { generateDeliveryOrders, buildCombineOrder } from "@/utils/toolbar/takeaway/generateOrders"

export class OrderStore {
  private store
  private combinedStore
  private timeslotStore
  private baiduAK = 'W9LoZ3gGO0lNAI33uUDics2Rar5NyJRw'
  private riderStart: [number, number] = [0, 0] // 骑手起点（先写死，后续可响应式） lng lat
  private timeslot2slotKey: Record<number, string> = {
    9: 'morning',
    12: 'lunch',
    16: 'afternoon',
    18: 'dusk',
    22: 'night'
  }
  constructor() {
    this.store = localForage.createInstance({
      name: 'osmBaiduOrder',
      storeName: 'orders'
    })
    this.combinedStore = localForage.createInstance({
      name: 'osmBaiduOrder',
      storeName: 'combinedOrders'
    })
    //事件聚合表
    this.timeslotStore = localForage.createInstance({
      name: 'osmBaiduOrder',
      storeName: 'timeslotData'
    })
  }




  // 保存单条订单
  async saveOrder(order: DeliveryOrder) {
    await this.store.setItem(order.riderId, order)
  }

  //保存整批数据
  async saveOrders(orders: DeliveryOrder[]) {
    const promises = orders.map(order => this.store.setItem(order.riderId, order))
    await Promise.all(promises)
    console.log('所有订单已保存到localForage')
  }

  async saveOrdersWithPrefix(orders: DeliveryOrder[], prefix: string) {
    const promises = orders.map(order => this.store.setItem(`${prefix}_${order.riderId}`, order))
    await Promise.all(promises)
    console.log(`[${prefix}]所有订单已保存到localForage`)
  }

  //读取数据库所有订单 ,那后续要是有很多订单了呢？很多不同时间?
  async getOrder(): Promise<Record<string, DeliveryOrder>> {
    const order: Record<string, DeliveryOrder> = {}
    const keys = await this.store.keys()
    for (let i = 0; i < keys.length; i++) {
      const o = await this.store.getItem(keys[i]) as DeliveryOrder
      order[keys[i]] = o
    }
    return order
  }

  //根据riderId 获取订单
  async getOrderByRider(riderId: string): Promise<DeliveryOrder | null> {
    return await this.store.getItem(riderId) as DeliveryOrder | null
  }

  //读取时按照timeslot过滤
  //只会返回那些以 "region_timeslot_" 开头的订单
  async getOrdersByTimeslot(region: string, timeslot: number): Promise<DeliveryOrder[]> {
    const prefix = `${region}_${timeslot}_` //不同部分的 key 更容易区分
    const keys = await this.store.keys()
    const result: DeliveryOrder[] = []

    for (let i = 0; i < keys.length; i++) {
      if (keys[i].startsWith(prefix)) { //startsWith是什么意思?
        const o = await this.store.getItem(keys[i]) as DeliveryOrder
        result.push(o)
      }
    }
    return result
  }

  //根据区域、时间、骑手id获取对应数据
  public async getCombinedOrderById(region: string, timeslot: number, riderId: string) {

    await this.timeslotStore.ready() // ✅ 确保数据库初始化完成
    const regionTimeslotData: SlotData | null = await this.timeslotStore.getItem(`${region}_${timeslot}_timeslotData`)
    if (!regionTimeslotData) {
      console.warn('没有找到对应的区域时间数据')
      return
    }
    const combinedOrder = regionTimeslotData.combinedOrders[riderId]
    const orderStepSegments = regionTimeslotData.orderStepSegments[riderId]

    const startTimeIso = regionTimeslotData.startTimeIso
    return {
      combinedOrder: combinedOrder,
      orderStepSegments: orderStepSegments,
      startTimeIso: startTimeIso
    }
  }

  public async getOrdersByCombinedOrder(region: string, timeslot: number, combinedOrder: CombinedOrder): Promise<DeliveryOrder[]> {
    const subOrdersId: string[] = []
    const subKey: string[] = []
    const orderGroup: DeliveryOrder[] = []
    combinedOrder.subOrders.forEach(subOrder => {
      subOrdersId.push(subOrder.orderId)
    })

    subOrdersId.forEach(id => {
      subKey.push(`${region}_${timeslot}_${id}`)
    })

    for (let i = 0; i < subKey.length; i++) {
      const subOrder: DeliveryOrder | null = await this.store.getItem(subKey[i])
      if (subOrder)
        orderGroup.push(subOrder)
    }
    return orderGroup
  }

  /**
   * 返回 某行政区某时间段的所有 骑手id_combined , 用于检索到组合订单数据
   * @param region 行政区
   * @param timeslot 时间段
   * @returns 骑手id_combined 字符串 e.g. rider_3cc1_combined 
   */
  public async getRiderIdsByRegionTimeslot(region: string, timeslot: number): Promise<string[]> {
    const key = region + '_' + timeslot + '_timeslotData'
    const data = await this.timeslotStore.getItem(key) as SlotData//这个区域这个时间段的数据 
    if (!data) {
      console.log(`获取${region}_${timeslot}的数据失败`)
      return []
    }
    const riderIds_combined = Object.keys(data.combinedOrders)
    return riderIds_combined
  }

  async getOrderFirst() {
    const keys = await this.store.keys()
    return await this.store.getItem(keys[0]) as DeliveryOrder | null
  }

  //清空所有订单
  async clear() {
    await this.store.clear()
  }

  //判断有无数据
  async hasData() {
    const keys = await this.store.keys()
    if (keys.length > 0) {
      return true
    } else {
      return false
    }
  }

  // 目前存储的是用九龙城区的取餐点和送货点 中午12点的数据 的数据生成的， 
  async prepareOrders(region: string, timeslot: number, subOrdersAmount: number) {
    const keyPrefix = `${region}_${timeslot}`

    const rawNodePoints = await getRawPointsByRegion(region)
    const rawBuildingPolys = await getRawBuildingPolyByRegion(region)

    //当前时段主品类
    const { pickupNodes, dropoffNodes } = classifyDeliveryNodes(timeslot, rawNodePoints, rawBuildingPolys)

    //额外: 混入相邻时段的节点(少量)
    const neighborSlot = this.getNeighborTimeslot(timeslot)
    const { pickupNodes: neighborPickups } = classifyDeliveryNodes(neighborSlot, rawNodePoints, rawBuildingPolys)
    const mixedPickups = this.mixPickupNodes(pickupNodes, neighborPickups, 0.15) //混入15%

    const length = mixedPickups.length
    const ordersAmount = subOrdersAmount //固定了每次生成的订单总数
    const idxArr: number[] = this.getRandomOrder(ordersAmount, length)

    // 存储取货点 
    let orders: DeliveryOrder[] = []
    const targetPickupNodes: NodePoint[] = []
    for (let i = 0; i < ordersAmount; i++) {
      const pickupNode = mixedPickups[idxArr[i]]
      targetPickupNodes.push(pickupNode)
      const order = await generateDeliveryOrders(timeslot, [pickupNode], dropoffNodes, this.baiduAK, {})
      orders.push(order[0])
    }
    // 结果存入本地
    await this.saveOrdersWithPrefix(orders, keyPrefix)

    // 汇总 取餐点的品类信息
    this.updateCategoryMatrix(region, timeslot, targetPickupNodes)
  }

  // 返回相邻时间段（用于“溢出混入”）
  private getNeighborTimeslot(timeslot: number): number {
    if (timeslot >= 7 && timeslot < 10) return 11 //早->午
    if (timeslot >= 11 && timeslot < 14) return 9     // 午 → 早
    if (timeslot >= 14 && timeslot < 17) return 12    // 下午 → 午
    if (timeslot >= 17 && timeslot < 20) return 16    // 晚 → 下午
    if (timeslot >= 20) return 18                     // 深夜 → 晚
    return 12
  }

  // 从主节点中混入少量其他节点
  private mixPickupNodes(main: NodePoint[], extra: NodePoint[], ratio: number): NodePoint[] {
    const mixCount = Math.floor(main.length * ratio) //混入的数量占主要节点的15%
    const extras = this.getRandomSample(extra, mixCount)
    return [...main, ...extras]
  }

  // 随机抽样辅助
  private getRandomSample<T>(arr: T[], count: number): T[] {
    const copy = [...arr]
    const result: T[] = []
    for (let i = 0; i < count && copy.length > 0; i++) {
      const idx = Math.floor(Math.random() * copy.length)
      result.push(copy.splice(idx, 1)[0]) //splice() 会直接修改原数组（删除元素）  splice 删除元素会把那个元素返回
    }
    return result
  }

  //汇总(累加)订单数据
  // 之前汇总过的也会拉进来一起汇总 不会被覆盖
  public async updateCategoryMatrix(region: string, timeslot: number, pickupNodes: NodePoint[]) {
    //1.读取旧数据
    const key = `categoryMatrix_${region}`
    const oldCategoryMatrix: Record<string, Record<string, number>> = await this.timeslotStore.getItem(key) || {} //morning:{cafe:3,xx:2},lunch:{resterant:4}

    const slotKey = this.timeslot2slotKey[timeslot]
    //如果该时段还没有数据 先初始化
    oldCategoryMatrix[slotKey] ??= {}

    //2.合并新数据
    pickupNodes.forEach(n => {
      const cat = n.category || 'unknown' //是已经统一名称的
      oldCategoryMatrix[slotKey][cat] = (oldCategoryMatrix[slotKey][cat] || 0) + 1
    })

    //3.写回数据库
    this.timeslotStore.setItem(key, oldCategoryMatrix)
    console.log(`${region}${slotKey}品类汇总已更新:`, oldCategoryMatrix[slotKey])
  }
  public async deleteMatrixSlotKey(region: string, slotKey: string) {
    const key = `categoryMatrix_${region}`
    const categoryMatrix: Record<string, Record<string, number>> | null = await this.timeslotStore.getItem(key)

    if (categoryMatrix) {
      delete categoryMatrix[slotKey]
    }

    this.timeslotStore.setItem(key, categoryMatrix)

  }

  //检查 CombinedData 中的 key在子订单中是否存在
  public async checkCombinedSubKey(region: string, timeslot: number) {
    const orders = await this.getOrder()
    const start = `${region}_${timeslot}_`

    const keys = Object.keys(orders)
    const targetkeys: string[] = []
    keys.forEach(k => {
      if (k.startsWith(start)) {
        targetkeys.push(k)
      }
    })

    //处理成combined后缀的样子
    const result: string[] = []
    targetkeys.forEach(k => {

      const tmp = k.replace(start, '')
      result.push(tmp + '_combined')
    })

    //九龙城区_18_timeslotData
    const keyCombined = `${region}_${timeslot}_timeslotData`

    const timeslotData: SlotData | null = await this.timeslotStore.getItem(keyCombined)

    if (timeslotData) {
      const combinedOrders = timeslotData.combinedOrders
      const keys = Object.keys(combinedOrders)

      //找出子订单中没有的 没有的就是要删除
      const needDelete = []
      for (let i = 0; i < keys.length; i++) {
        if (!result.includes(keys[i])) {
          needDelete.push(keys[i])
        }
      }
      return needDelete
    }
  }

  async deleteCombinedData(region: string, timeslot: number, riderCombinedIdArr: string[]) {

    const key = region + '_' + timeslot + '_timeslotData'

    const data = await this.timeslotStore.getItem(key) as SlotData

    for (let i = 0; i < riderCombinedIdArr.length; i++) {
      //删除后数据
      delete data.combinedOrders[riderCombinedIdArr[i]]
      delete data.orderStepSegments[riderCombinedIdArr[i]]
    }


    //删除之后存入数据
    await this.timeslotStore.setItem(key, data)
  }

  public async prepareData(region: string, timeslot: number, subOrdersAmount: number) {

    const orderStore = new OrderStore()
    //生成 subOrdersAmount 个单订单
    await orderStore.prepareOrders(region, timeslot, subOrdersAmount)
    //每三个订单为一组生成组合数据
    await orderStore.combinedOrders(region, timeslot)
  }

  public async deleteCombinedDataTimeslot(region: string, timeslot: number) {
    const orders = await this.getOrder()

    const start = `${region}_${timeslot}_`

    const keys = Object.keys(orders)
    const targetkeys: string[] = []
    keys.forEach(k => {
      console.log(k)
      if (k.startsWith(start)) {
        targetkeys.push(k)
      }
    })

    // await this.saveOrders(orders)
    for (let i = 0; i < targetkeys.length; i++) {
      await this.store.removeItem(targetkeys[i])
    }

    const newOrders = await this.getOrder()
    console.log('newOrders', newOrders)
    console.log('新存入数组的长度newOrders.length', Object.keys(newOrders).length)
  }


  /**
   * 
   * @param count 要生产的订单数量
   * @param length 抽样数组的长度
   * @returns 返回抽样数组的索引号
   */
  private getRandomOrder(count: number, length: number): number[] {
    const randomIdx: number[] = []
    for (let i = 0; i < count; i++) {
      const num = Math.floor(Math.random() * length) // [0-length - 1]
      if (randomIdx.includes(num)) {
        i-- //因为和之前的重复了 i--再多一次循环
        continue
      }
      randomIdx.push(num)
    }
    return randomIdx
  }

  // 随机生成一个骑手起点，距离取餐点 200-500 米
  private getRandomNearbyPoint(lng: number, lat: number, minDist = 200, maxDist = 500): [number, number] //lng lat
  {
    // 1°纬度大约 111 km，1°经度大约 = 111km * cos(lat)
    const R = 6371000; // 地球半径（米）
    const dist = minDist + Math.random() * (maxDist - minDist); // 随机距离
    const bearing = Math.random() * 2 * Math.PI; // 随机方向

    const dLat = (dist * Math.cos(bearing)) / R;
    const dLng = (dist * Math.sin(bearing)) / (R * Math.cos(lat * Math.PI / 180));

    const newLat = lat + dLat * 180 / Math.PI;
    const newLng = lng + dLng * 180 / Math.PI;
    return [newLng, newLat];
  }

  async saveCombinedOrder(combinedOrder: CombinedOrder) {
    await this.combinedStore.setItem(combinedOrder.riderId, combinedOrder)
  }
  async getCombinedOrders() {
    const keys = await this.combinedStore.keys()
    const combinedOrders: CombinedOrder[] = []
    for (let i = 0; i < keys.length; i++) {
      const cOrder = await this.combinedStore.getItem<CombinedOrder>(keys[i])
      if (cOrder)
        combinedOrders.push(cOrder)
    }
    return combinedOrders
  }

  async getCombinedOrder(region: string, timeslot: number) {
    return await this.combinedStore.getItem(`combined_${region}_${timeslot}`) as CombinedOrder
  }


  //改造点 3：合并订单时区分时段
  async combinedOrders(region: string, timeslot: number) {

    const orders = await this.getOrdersByTimeslot(region, timeslot) //单个订单多条

    if (!orders.length) {
      console.warn(`[${region}][${timeslot}] 无订单数据`)
      return
    }
    //第一步：按批次分组 生成单条订单数据的时候是三条三条生成的 （每个骑手配送3单）(没有按照实际骑手id划分 因为每一个订单的骑手id都不一样)
    const groupSize = 3
    const validOrders = orders.slice(0) // 跳过前0张订单
    const groupOrders: DeliveryOrder[][] = [] //期望是三组
    for (let i = 0; i < validOrders.length; i += groupSize) {
      groupOrders.push(validOrders.slice(i, i + groupSize)) //每三个一组
    }

    const pathUtils = await import('@/utils/toolbar/takeaway/pathUtils')

    // const today = new Date().toString().split('T')[0] //获取T之前的
    const startTimeIso = `T${timeslot.toString().padStart(2, '0')}:00:00+08:00`

    const key = `${region}_${timeslot}_timeslotData`
    const existing: SlotData = (await this.timeslotStore.getItem(key)) || {
      combinedOrders: {},
      orderStepSegments: {},
      startTimeIso
    }

    //为每个骑手生成组合订单
    for (const group of groupOrders) {
      const firstPickup = group[0].pickupNodes[0]
      this.riderStart = this.getRandomNearbyPoint(firstPickup.lng, firstPickup.lat, 200, 500) //lng,lat

      const combinedOrder = await buildCombineOrder(group, this.riderStart, this.baiduAK)

      if (!combinedOrder) {
        console.warn('combinedOrder生成失败')
        return
      }
      //生成路径分段
      const orderStepSegments = await pathUtils.pathUtils.preapareStepSegments(combinedOrder)

      //累加数据
      existing.combinedOrders[combinedOrder.riderId] = combinedOrder

      if (orderStepSegments) {
        existing.orderStepSegments[combinedOrder.riderId] = orderStepSegments
      }


    }

    //存回本地
    // existing[slotKey] = slotData
    //合并写入，保留其他时段
    console.log('再次检key,existing', key, existing)
    await this.timeslotStore.setItem(key, existing)

    console.log(`[${region}][${timeslot}] 已生成 ${groupOrders.length} 名骑手的组合订单`)
  }

}


/**
 * 分区获取原始功能点
 * @param region 行政区的名字 string
 */
async function getRawPointsByRegion(region: string) {
  const nodeStore = localForage.createInstance({
    name: 'osmNodePoint',
    storeName: 'nodes'
  })
  const keys = await nodeStore.keys()
  const rawNodePoints: NodePoint[] = []
  for (let i = 0; i < keys.length; i++) {
    const tempPoint: NodePoint | null = await nodeStore.getItem(keys[i])
    if (tempPoint && region === tempPoint.region) {
      rawNodePoints.push(tempPoint)
    }
  }
  return rawNodePoints
}

async function getRawBuildingPolyByRegion(region: string) {
  const buildingStore = localForage.createInstance({
    name: 'osmBuilding',
    storeName: 'buildings',
  })
  const keys = await buildingStore.keys()
  const rawBuildingPolys: any = []
  for (let i = 0; i < keys.length; i++) {
    const tempPoint: NodePoint | null = await buildingStore.getItem(keys[i])
    if (tempPoint && region === tempPoint.region) {
      rawBuildingPolys.push(tempPoint)
    }
  }
  return rawBuildingPolys
}