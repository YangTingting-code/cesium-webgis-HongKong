import axios from 'axios';
import type { NodePoint, DeliveryOrder, CombinedOrder, MatrixNode, Milestone } from '../interface';
import coordtransform from 'coordtransform'
import * as turf from '@turf/turf'

interface StepType {
  direction: number,
  distance: number,
  duration: number,
  end_location: { lat: number, lng: number },
  instruction: string,
  name: string,
  path: string,
  restrictions_info: string,
  road_types: string,
  start_location: { lat: number, lng: number },
  turn_type: string
}
// 电动车平均速度 km/h
const AVG_SPEED_KMH = 20;

// 30分钟的最大直线距离（km）
const MAX_DISTANCE_KM = (AVG_SPEED_KMH / 60) * 30; // 约10km

// Haversine 公式计算两点直线距离
function getDistanceKm(p1: NodePoint, p2: NodePoint): number {
  const R = 6371; // 地球半径 km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  console.log(p1, p2)
  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 调用百度骑行 API 获取实际耗时（分钟）和路径  
/**
 * 
 * @param pickupPoint //lng,lat
 * @param dropoffPoint //lng,lat
 * @param ak //web端baidu key
 * @returns 
 */
async function getEstimatedTime(pickupPoint: [number, number], dropoffPoint: [number, number], ak: string) {
  const API_BASE = '/api/baidu'
  try {
    const res = await axios.get(`${API_BASE}/directionlite/v1/riding`, {
      params: {
        origin: `${(pickupPoint[1]).toFixed(6)},${(pickupPoint[0]).toFixed(6)}`, //lat lng
        destination: `${(dropoffPoint[1]).toFixed(6)},${(dropoffPoint[0]).toFixed(6)}`,
        ak,
        riding_type: '1',//电动车
        coord_type: 'wgs84',
        ret_coordtype: 'gcj02' //返回火星
      },
    });

    // 检查百度API返回状态
    if (res.data.status !== 0) {
      console.log('origin', `${(pickupPoint[0]).toFixed(6)},${(pickupPoint[1]).toFixed(6)}`)
      console.log('destination', `${(dropoffPoint[0]).toFixed(6)},${(dropoffPoint[1]).toFixed(6)}`)

      console.error('百度API返回错误状态:', res.data.status, res.data.message);
      return null;
    }
    // 检查是否存在routes
    if (!res.data.result || !res.data.result.routes || res.data.result.routes.length === 0) {
      console.error('百度API返回的路线为空');
      return null;
    }
    console.log('res', res)

    const route = res.data.result.routes[0];

    // 拼接各个路段的path得到fullpath
    const steps: any = []
    const fullPath: [number, number][] = []
    let cumduration = 0 //存储step累计时间
    let cumdistance = 0 //存储step累计距离
    route.steps.forEach((step: StepType) => { //遍历每一条段路线 
      const stepPath = []
      const pathArray = (step.path as string).split(';')
      for (let i = 0; i < pathArray.length; i++) {
        //坐标转换
        const wgs84 = coordtransform.gcj02towgs84(pathArray[i].split(',')[0], pathArray[i].split(',')[1])
        //检查这个step的第一个点是否和前一个step的最后一个点的相同 , 需要fullPath里面已经存储了至少一个step 

        if (i === 0 && fullPath.length > 0) { //浮点数如何比较是否相同 差值是否小于一个很小的阈值
          console.log('fullPath[fullPath.length - 1][0]', fullPath[fullPath.length - 1][0])
          console.log('wgs84[0]', wgs84[0])
          console.log('fullPath[fullPath.length - 1][0]', fullPath[fullPath.length - 1][1])
          console.log('wgs84[0]', wgs84[1])
          if (fullPath[fullPath.length - 1][0] - wgs84[0] < 1e-9 && //lng相等
            fullPath[fullPath.length - 1][1] - wgs84[1] < 1e-9 // 并且lat也相等
          ) {
            continue //如果前一个step的最后一个点和后一个step的第一个点相同的话 这个点就不要保存进pathArray
          }
        }
        stepPath.push(wgs84) //存入小路的路径 已转到wgs84

        if (i === 1 && steps.length > 0) { //百度api返回的step从第二个开始 前面两个点都是重复的 之前已经过滤了一次 这次还需要单独给fullpath再过滤一次
          if (fullPath[fullPath.length - 1][0] - wgs84[0] < 1e-9 && //lng相等
            fullPath[fullPath.length - 1][1] - wgs84[1] < 1e-9 // 并且lat也相等
          ) {
            // stepPath.push(wgs84)
            continue //如果前一个step的最后一个点和后一个step的第一个点相同的话 这个点就不要保存进pathArray
          }
        }
        fullPath.push(wgs84) //存入整条路径
      }
      //解构 除了 start_location 和 end_location 都存入
      const { start_location, end_location, ...bare } = step
      cumduration += step.duration
      cumdistance += step.distance
      steps.push({
        cumdistance: cumdistance,
        cumduration: cumduration,
        stepPath_wgs84: stepPath, //该小段的路径 已转到wgs84
        ...bare //剩下的全部存入
      })
    })
    return {
      totalMinutes: Math.floor(route.duration / 60),// 秒转分钟
      duration: route.duration,
      distance: res.data.result.routes[0].distance, //总路程
      fullPath: fullPath,
      steps: steps //每一小段路的结果也返回了 转换了为wgs84
    };
  } catch (err) {
    console.error('百度 API 调用失败', err);
    return null;
  }
}

// 概率分布，可以调整
const distanceProb = [
  { max: 3, prob: 0.6 },
  { max: 7, prob: 0.3 },
  { max: 10, prob: 0.08 }
];

// 根据距离抽样是否选择该 dropoff
function shouldSelect(distanceKm: number): boolean {
  for (const d of distanceProb) {
    if (distanceKm <= d.max) {
      return Math.random() < d.prob;
    }
  }
  return false;
}

export async function generateDeliveryOrders(
  timeslot: number,
  pickupNodes: NodePoint[],
  dropoffNodes: NodePoint[],
  baiduAk: string,
  option: {
    maxOrdersPerPickup?: number, // 每个取餐点最多生成多少单 默认3单
    prioritizeNearest?: boolean, // 是否优先选择最近的送货点 ,默认false 即步优先选择最近的送货点
    propOrder?: boolean, //默认随机选中
  }
): Promise<DeliveryOrder[]> {
  //解构默认值
  const {
    maxOrdersPerPickup = 10,
    prioritizeNearest = false,
    propOrder = true
  } = option
  const orders: DeliveryOrder[] = [];

  //补充 转换 起点和候选点的 坐标
  for (const pickup of pickupNodes) {
    //第一步：用直线距离筛选候选
    let candidates = dropoffNodes
      .map(dropoff => ({
        dropoff,
        distance: getDistanceKm(pickup, dropoff)
      }))
      .filter(c => c.distance <= MAX_DISTANCE_KM)
    if (candidates.length === 0) continue //如果取货点没有找到合适的送货点，那么放弃这个取货点 ，匹配下一个送货点

    //第二步：排序或打乱,选前N个
    if (candidates.length > maxOrdersPerPickup) {
      if (propOrder === true) {
        candidates = candidates.filter(c => {
          return shouldSelect(c.distance) //根据距离随机选择候选点
        })
      } else if (prioritizeNearest) {
        candidates.sort((a, b) => a.distance - b.distance) //数组按照 distance（距离）从小到大排序,如果 a.distance < b.distance，就把 a 排在前面,排序之后 candidate[0] 就是最近的
      } else {
        candidates = candidates.sort(() => Math.random() - 0.5) //不是筛选点 而是把候选点的顺序随机化
      }
      candidates = candidates.slice(0, maxOrdersPerPickup) //筛选前面 maxOrdersPerPickup 个
    }
    console.log('2:candidates', candidates)
    let i = 0


    //第三步：只对选中的N个调API 
    for (const c of candidates) {
      if (i === 1) break
      i++
      const res = await getEstimatedTime([pickup.lng, pickup.lat], [c.dropoff.lng, c.dropoff.lat], baiduAk)

      if (!res) continue


      if (res.totalMinutes <= 30) { //候选点再次筛选时间小于30分钟的 小于5分钟的太短看不出效果？
        orders.push({
          riderId: `rider_${Math.random().toString(36).substring(2, 6)}`, //那三个订单都给一个骑手送呢？现在是生成独立的订单
          duration: res.duration,
          distance: res.distance,
          totalMinutes: res.totalMinutes,
          pickupNodes: [pickup],
          dropoffNodes: [c.dropoff],
          fullpath: res.fullPath,
          steps: res.steps,
          category: pickup.category,
          timeslot: timeslot
        })
      }
    }
  }
  return orders;
}

export async function buildCombineOrder(
  orders: DeliveryOrder[],
  riderStart: [number, number], //lng,lat
  ak: string
): Promise<CombinedOrder | null> {

  if (!orders.length) return null

  //1. 构建节点数组：index=0 为骑手
  const nodes: MatrixNode[] = [
    { type: 'start', position: riderStart }
  ]
  // (取送点都放在一起)
  orders.forEach(order => {
    const pickup = order.pickupNodes[0]
    const dropoff = order.dropoffNodes[0]
    nodes.push(
      { orderId: order.riderId, type: 'pickup', position: [pickup.lng, pickup.lat] }, //纬度经度 lng lat
      { orderId: order.riderId, type: 'dropoff', position: [dropoff.lng, dropoff.lat] }
    )
  })

  // ===== 2. 调用 RouteMatrix 得到距离/耗时矩阵 ===== //
  const origins = nodes.map(n => `${n.position[1].toFixed(6)},${n.position[0].toFixed(6)}`).join('|') //A1,A2|B1,B2|C1,C2 //lat lng 
  const destinations = origins //全组合矩阵 A1,A2|B1,B2|C1,C2
  const API_BASE = '/api/baidu'
  const matrixRes = await axios.get(`${API_BASE}/routematrix/v2/riding`, {
    params: {
      ak,
      coord_type: 'wgs84',
      origins,
      destinations,
      riding_type: '1', //1 电动自行车
    }
  })
  if (matrixRes.data.status !== 0) {
    console.error('RouteMatrix 返回错误', matrixRes.data)
    return null
  }
  const matrix = matrixRes.data.result as Array<{ //这是在做什么?
    distance: { value: number },
    duration: { value: number }
  }>

  const size = nodes.length // 含骑手起点
  //[[Infinity, Infinity, Infinity],[],[]],[],[]
  const distanceMatrix: number[][] = Array.from({ length: size }, () =>
    Array<number>(size).fill(Number.POSITIVE_INFINITY) //[Infinity, Infinity, Infinity]
  )
  const durationMatrix: number[][] = Array.from({ length: size }, () =>
    Array<number>(size).fill(Number.POSITIVE_INFINITY)
  )

  // 返回顺序：origin0-dest0, origin0-dest1, ..., origin1-dest0 ...
  //一维数组就被还原成了一个 size × size 的二维关系表
  matrix.forEach((item, index) => {
    const originIdx = Math.floor(index / size)
    const destIdx = index % size
    if (originIdx === destIdx) return
    distanceMatrix[originIdx][destIdx] = item.distance.value
    durationMatrix[originIdx][destIdx] = item.duration.value
  })

  // ===== 3. 贪心：就近 + 先取后送 ===== //
  const visitIndices: number[] = []
  const pending = new Set<number>()
  const picked = new Set<string>()

  // 节点 1..N-1 全部待访问 （不包含骑手吗？）
  for (let i = 1; i < size; i++) pending.add(i)
  let currentIdx = 0  // 从 start (索引 0) 出发
  while (pending.size) {
    let bestIdx: number | null = null
    let bestCost = Number.POSITIVE_INFINITY

    for (const idx of pending) {
      const node = nodes[idx]
      if (node.type === 'dropoff' && !picked.has(node.orderId!)) continue //未取餐不能送

      //时间
      const cost = durationMatrix[currentIdx][idx]  // 或 distanceMatrix，看需求
      if (cost < bestCost) {
        bestCost = cost
        bestIdx = idx
      }
    }

    if (bestIdx === null) {
      console.warn('没有合法候选，提前结束')
      break
    }

    visitIndices.push(bestIdx)
    pending.delete(bestIdx)

    const bestNode = nodes[bestIdx]
    if (bestNode.type === 'pickup' && bestNode.orderId) picked.add(bestNode.orderId)

    currentIdx = bestIdx
  }
  // 4. 按顺序调用 directionlite 拼接完整路线 
  //准备里程碑 7个节点存入

  const milestones: Milestone[] = [{
    lng: nodes[0].position[0],
    lat: nodes[0].position[1],
    type: 'start',
    orderId: null,
    cumDistance: 0
  }]

  let fromIdx = 0
  const combinedFullPath: [number, number][] = []
  const combinedSteps: DeliveryOrder['steps'] = [] //只是DeliveryOrder类型里面 step属性? 
  let totalDuration = 0
  let totalDistance = 0
  const subOrders: CombinedOrder['subOrders'] = []
  let segment = null

  let combinedDistance = 0
  let combinedDuration = 0

  for (const idx of visitIndices) { //刚刚用贪心算法排的节点访问顺序
    const origin = nodes[fromIdx].position
    const destination = nodes[idx].position

    const dist = turf.distance(turf.point(origin), turf.point(destination), { units: 'metres' })

    if (dist < 10) { //防止距离太短
      segment = buildFallbackSegment(origin, destination, dist)
    } else {
      segment = await getEstimatedTime(origin, destination, ak) //lng lat
      if (!segment) {
        segment = buildFallbackSegment(origin, destination, dist)
      }
    }

    // fullpath 拼接
    if (!combinedFullPath.length) {
      combinedFullPath.push(...segment.fullPath)
    } else {
      const last = combinedFullPath[combinedFullPath.length - 1]
      segment.fullPath.forEach((coord, i) => {
        if (i === 0) {
          if (!isSamePoint(last, coord)) combinedFullPath.push(coord)
        } else {
          combinedFullPath.push(coord)
        }
      })
    }

    // steps 加标签 累加时间 方便后面动态线计算progress
    segment.steps.forEach((step: any) => {
      combinedDuration += step.duration
      combinedDistance += step.distance
      combinedSteps.push({
        ...step,
        cumduration: combinedDuration,        // 重置为全局
        cumdistance: combinedDistance,      // 同步累计
        // combinedDistance: combinedDistance,
        // combinedDuration: combinedDuration,
        orderId: nodes[idx].orderId,
        nodeType: nodes[idx].type
      } as any)
    })

    milestones.push({
      lng: nodes[idx].position[0],
      lat: nodes[idx].position[1],
      type: nodes[idx].type as 'pickup' | 'dropoff',
      orderId: nodes[idx].orderId ?? null,
      cumDistance: combinedDistance
    })

    totalDistance += segment.distance
    totalDuration += segment.duration

    //此时当前路径已结束 存入距离存入里程碑
    //判断这个点是否接近里程碑? 20m容差?

    if (nodes[idx].type === 'dropoff' && nodes[idx].orderId) {
      //获取完整订单信息
      const original = orders.find(o => o.riderId === nodes[idx].orderId)!
      subOrders.push({
        orderId: original.riderId,
        pickup: [original.pickupNodes[0].lng, original.pickupNodes[0].lat],
        dropoff: [original.dropoffNodes[0].lng, original.dropoffNodes[0].lat],
        // 合并路线使用的距离/时长
        mergedDistance: segment.distance,
        mergedDuration: segment.duration,
        // 保留原始订单数据
        originalDistance: original.distance,
        originalDuration: original.duration,
      }),
        milestones
    }

    fromIdx = idx
  }

  if (!combinedFullPath.length) {
    console.error('未生成任何路径')
    return null
  }

  // 拿第一单的元信息做基准，生成合并订单
  const base = orders[0]
  return {
    ...base,
    riderId: `${base.riderId}_combined`,
    duration: totalDuration,
    distance: totalDistance,
    fullpath: combinedFullPath,
    steps: combinedSteps,
    subOrders,
    milestones: milestones
  }
}

// 判断两个经纬度点是否重复
function isSamePoint(a: [number, number], b: [number, number], eps = 1e-9) {
  return Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps
}


function buildFallbackSegment(origin: [number, number], destination: [number, number], distMeters: number) {
  const distance = Math.floor(distMeters) //distMeters || 20           // 避免 0
  const duration = Math.max(distance / 4, 5) // 假设 4 m/s，至少 5 秒
  return {
    distance,
    duration,
    fullPath: [origin, destination],
    steps: [{
      distance,
      duration,
      stepPath_wgs84: [origin, destination],
      instruction: 'fallback segment',
      cumdistance: distance,
      cumduration: duration,
    }],
  }
}


