import { OrderStore } from '../db/OrderStore'
import * as Cesium from 'cesium'
import * as turf from '@turf/turf'
import { position2bbox } from '@/utils/aboutCamera'
import { DeliveryOrder } from '../interface-nouse'
import stripeImg from '@/assets/stripe2.png'
const orderStore = new OrderStore()
const order0 = await orderStore.getOrderFirst()
const stepSegments = await preapareStepSegments() //将骑手的每一个step的小段需要的时间存到内存 car3坐标也转换缓存好了
export let driverPosition = new Cesium.Cartesian3()

export async function prepareData() {
  if (!order0) return
  const fullpath = order0.fullpath //结构: [ [lng,lat], [lng,lat], ... ]
  if (!fullpath) return
  //1.目标：把经纬度转换成Car3
  //1.1 准备高程
  //1.1.1 加载地形
  const terrianProvider = await Cesium.createWorldTerrainAsync() //提问：createWorldTerrainAsync和创建视图时候 Cesium.Terrain.fromWorldTerrain()有什么区别？ 两个可以混着用吗？为什么？
  //1.1.2 采样地形
  // 1.1.2.1 准备需要更新高程信息的点位 经纬度转换为Array.<Cartographic>
  const positionRadians = fullpath.map(point => { //转换成为弧度制的经纬度
    return Cesium.Cartographic.fromDegrees(point[0], point[1])
  })

  // 1.1.2.2 采样地形
  try {
    const updatedPosition = await Cesium.sampleTerrainMostDetailed(terrianProvider, positionRadians)
    const car3 = updatedPosition.map(cartographic => {
      //弧度经纬度 要用fromRadians
      return Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, cartographic.height)
    })
    return car3
  } catch (err) {
    console.log("采集地形失败", err)
  }
}

//二维线
export async function drawLine(car3: Cesium.Cartesian3[], viewer: Cesium.Viewer) { //绘制骑手三维路线
  if (!order0) return
  const path = order0.fullpath //结构: [ [lng,lat], [lng,lat], ... ]
  if (!path) return
  //2.目标 绘制轨迹线 primitive
  //2.1 准备Geometry
  const geometry = new Cesium.PolylineGeometry({
    positions: car3,
    width: 10,
  })

  //2.2 准备 appearance
  const appearance = new Cesium.PolylineMaterialAppearance({
    material: new Cesium.Material({
      fabric: {
        type: 'Color',
        uniforms: {
          color: Cesium.Color.CYAN.withAlpha(0.8)
        }
      }
    })
  })

  //照相机视野
  const line = turf.lineString(path)

  const bbox = turf.bbox(line)
  position2bbox(bbox, viewer)
  // const getBBoxByTurf = 
  //3 创建primitive
  const primitive = new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: geometry
    }),
    appearance: appearance
  })
  viewer.scene.primitives.add(primitive)
}


export async function drawLine_1Primitive(car3: Cesium.Cartesian3[], viewer: Cesium.Viewer) { //绘制骑手三维路线 有厚度
  const centerLine = car3 //准备中心线点
  //定义横截面形状
  const width = 5
  const height = 2
  const shape = [
    new Cesium.Cartesian2(-width, -height),
    new Cesium.Cartesian2(width, -height),
    new Cesium.Cartesian2(width, height),
    new Cesium.Cartesian2(-width, height),
  ] //可以用圆形替代

  //2.目标 绘制轨迹线 primitive
  //2.1 准备Geometry
  const geometry = new Cesium.PolylineVolumeGeometry({
    polylinePositions: centerLine,
    shapePositions: shape
  })


  //2.2 准备 appearance
  const appearance = new Cesium.MaterialAppearance({
    material: new Cesium.Material({
      fabric: {
        type: 'Color',
        uniforms: {
          color: Cesium.Color.CYAN.withAlpha(0.8)
        }
      }
      //改成image材质
      /* fabric: {
        type: 'Image',
        uniforms: {
          image: stripeImg,
          repeat: new Cesium.Cartesian2(10.0, 1.0),//控制纹理重复
          color: Cesium.Color.CYAN.withAlpha(0.8) //可选，给贴图有着色
        }
      } */
    })
  })


  //照相机视野
  if (!order0) return
  const path = order0.fullpath //结构: [ [lng,lat], [lng,lat], ... ]
  if (!path) return
  const line = turf.lineString(path)
  const bbox = turf.bbox(line)
  position2bbox(bbox, viewer)

  // const getBBoxByTurf = 
  //3 创建primitive
  const primitive = new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: geometry
    }),
    appearance: appearance
  })
  viewer.scene.primitives.add(primitive)

}

export async function drawLine_2Entity(car3: Cesium.Cartesian3[], viewer: Cesium.Viewer) {
  //定义横截面形状
  const width = 5
  const height = 5
  const shape = [
    new Cesium.Cartesian2(-width, -height),
    new Cesium.Cartesian2(width, -height),
    new Cesium.Cartesian2(width, height),
    new Cesium.Cartesian2(-width, height),
  ] //可以用圆形替代

  const lineEntity = new Cesium.Entity({
    polylineVolume: {
      positions: car3,
      shape: shape,
      material: Cesium.Color.CYAN.withAlpha(0.8)
    },
  })
  viewer.entities.add(lineEntity)

  //照相机视野
  if (!order0) return
  const path = order0.fullpath //结构: [ [lng,lat], [lng,lat], ... ]
  if (!path) return
  const line = turf.lineString(path)
  const bbox = turf.bbox(line)
  position2bbox(bbox, viewer)
}


// Haversine 公式计算两点直线距离
function getDistanceM(p1: [number, number], p2: [number, number]): number {
  const R = 6371000; // 地球半径 m
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(p2[1] - p1[1]);
  const dLng = toRad(p2[0] - p1[0]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p1[1])) * Math.cos(toRad(p2[1])) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function calStepDistance() {
  if (!order0) return
  const fullpath = order0.fullpath //结构: [ [lng,lat], [lng,lat], ... ]
  let totalDistance = 0
  const cumulativeDistances = [0]
  if (!fullpath) return
  order0.steps.forEach(step => {
    // step.distance //单位是 m
    const path = step.stepPath_wgs84
    let pathDistance = 0
    for (let i = 0; i < path.length - 1; i++) {
      pathDistance += getDistanceM(path[i], path[i + 1])
    }
    totalDistance += pathDistance
    cumulativeDistances.push(totalDistance)
    console.log('pathDistance', pathDistance)
    console.log('step.distance', step.distance)
    console.log('step.distance equals ? pathDistance', step.distance === pathDistance)
  })

  console.log('totalDistance', totalDistance)
  console.log('order0.distance', order0.distance)
  console.log('order0.distance === totalDistance', order0.distance === totalDistance)
  console.log('cumulativeDistances', cumulativeDistances)
}

/* step.duration = 20s,
step.segments = []
    {start:p0,end:p1,duration:5,cumTime:5} cumTime是step累计时间
    {start:p1,end:p2,duration:10,cumTime:15} cumTime是step累计时间
    {start:p2,end:p3,duration:5,cumTime:5} cumTime是step累计时间
] */

/**
 * @param point 
 */
export async function lnglat2Car3(points: [number, number][]) {
  const car3Array: Cesium.Cartesian3[] = []
  //准备地形提供器
  const terrianProvider = await Cesium.createWorldTerrainAsync()
  // 1.1.2.1 准备需要更新高程信息的点位 经纬度转换为Array.<Cartographic>
  const positionRadians = points.map(point => { //转换成为弧度制的经纬度
    return Cesium.Cartographic.fromDegrees(point[0], point[1])
  })
  const updatedPosition = await Cesium.sampleTerrainMostDetailed(terrianProvider, positionRadians)
  //经纬度坐标转换
  updatedPosition.forEach((cartographic: Cesium.Cartographic) => {
    car3Array.push(Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, cartographic.height))
  })
  return car3Array
}

interface SegmentType {
  start: [number, number], //lng,lat
  end: [number, number],
  startC3?: Cesium.Cartesian3,
  endC3?: Cesium.Cartesian3,
  duration: number,
  distance: number,
  cumduration: number,
  cumdistance: number,
}
//有用
export async function preapareStepSegments(order0: DeliveryOrder): Promise<Record<string, SegmentType[]> | null> {

  const steps = order0.steps //结构: [ [lng,lat], [lng,lat], ... ]
  const stepSegments: Record<string, SegmentType[]> = {} // 0:SegmentType,1:SegmentType,...

  steps.forEach((step, index) => { //遍历每一个step
    const path = step.stepPath_wgs84
    // 检查路径有效性
    if (!path || path.length < 2) {
      console.warn(`Step ${index} 的路径无效，跳过`)
      stepSegments[index] = []
      return
    }
    let cumduration = 0
    let cumdistance = 0
    const segments: SegmentType[] = [] //存储每一个step中seg的信息
    let stepTotalDistance = 0
    const segDistanceArr = []
    // 计算各段距离和总距离
    for (let i = 0; i < path.length - 1; i++) {
      const distance = getDistanceM(path[i], path[i + 1])
      // 确保距离是有效数字
      segDistanceArr.push(isNaN(distance) ? 0 : Math.max(0, distance))
      stepTotalDistance += segDistanceArr[i]
    }
    // 处理总距离为0的情况（避免除零错误）
    if (stepTotalDistance <= 0) {
      console.warn(`Step ${index} 的总距离为0或负数，使用平均分配时间`)
      const avgDuration = step.duration / Math.max(1, path.length - 1)
      for (let i = 0; i < path.length - 1; i++) {
        cumduration += avgDuration
        cumdistance += segDistanceArr[i]
        const seg: SegmentType = {
          start: path[i],
          end: path[i + 1],
          duration: avgDuration,
          distance: segDistanceArr[i],
          cumduration: cumduration,
          cumdistance: cumdistance // 保持一致性
        }
        segments.push(seg)
      }
    } else {
      // 正常计算各段时间
      //得到step的总距离之后 用它计算每一小段的时间
      for (let i = 0; i < path.length - 1; i++) { //计算相邻两个点的距离 即每一小段的距离 根据距离分配时间
        const segDuration = (segDistanceArr[i] / stepTotalDistance) * step.duration
        // 确保不是NaN
        const validDuration = isNaN(segDuration) ? 0 : Math.max(0, segDuration)
        cumduration += validDuration
        cumdistance += segDistanceArr[i]
        let seg: SegmentType = {
          start: path[i],
          end: path[i + 1],
          duration: segDuration,
          distance: segDistanceArr[i],
          cumduration: cumduration,
          cumdistance: cumdistance
        }
        segments.push(seg) //这一个seg处理完塞进去 循环处理下一个seg
      }
    }

    stepSegments[index] = segments
  })
  //拿出所有需要计算的
  console.log('stepSegments', stepSegments)
  // 转换坐标部分保持不变，但添加错误处理
  try {
    const lnglatArray = []
    for (let i = 0; i < Object.keys(stepSegments).length; i++) {
      if (stepSegments[i] && stepSegments[i].length > 0) {
        for (let j = 0; j < stepSegments[i].length; j++) { //因为stepSegments索引就是 index
          if (stepSegments[i][j].start && stepSegments[i][j].end) {
            lnglatArray.push(stepSegments[i][j].start, stepSegments[i][j].end)
          }
        }
      }
    }
    if (lnglatArray.length === 0) {
      console.error('没有有效的坐标点')
      return stepSegments
    }
    const car3Arr = await lnglat2Car3(lnglatArray)
    //然后塞入 stepSegments
    let index = 0
    for (let i = 0; i < Object.keys(stepSegments).length; i++) {
      if (stepSegments[i] && stepSegments[i].length > 0 && index < car3Arr.length) {
        for (let j = 0; j < stepSegments[i].length; j++) { //因为stepSegments索引就是 index
          stepSegments[i][j].startC3 = car3Arr[index]
          stepSegments[i][j].endC3 = car3Arr[index + 1]
          index += 2
        }
      }
    }
  } catch (error) {
    console.error('坐标转换错误:', error)
  }
  return stepSegments
}

/**
 * @param duration 骑手骑行时间
 */
export async function driver(duration: number) {
  if (!order0) return

  if (duration > order0.duration) {
    return order0.distance //如果此时骑手的时间大于整个路径的时间 返回整个路程的距离
  }
  // 二分法找到找第一个大于duration的step的索引
  const indexStep = findIndex(duration, true)
  const prevStepCum = indexStep === 0 ? 0 : order0.steps[indexStep - 1].cumduration //全局起始时间
  //算出骑手在当前step的局部时间
  const localTime = duration - prevStepCum

  let segIndex
  let seg
  let segStartTime
  let progress
  if (stepSegments && (indexStep || indexStep === 0)) {
    segIndex = findIndex(localTime, false, stepSegments[indexStep]) //找到骑手所在的小段
    // 从对应step找到具体的seg之后计算比例 
    seg = stepSegments[indexStep][segIndex]

    //对应seg的起始局部时间
    segStartTime = seg.cumduration - seg.duration

    //计算骑手在当前seg的占比
    progress = Math.min(1, Math.max(0, (localTime - segStartTime)) / seg.duration) //progress 0-1
    //插值得到骑手当前的Car3坐标
    if (seg.startC3 && seg.endC3) {
      Cesium.Cartesian3.lerp(seg.startC3, seg.endC3, progress, driverPosition) //新的Car3坐标更新骑手位置
    }
  } else {
    return 0
  }

  //计算小球累计距离 前一个step的距离 + step里面seg的累计距离
  let cumRiderDistance = 0

  //1.加上当前step之前的所有step的累计距离
  if (indexStep > 0) {
    cumRiderDistance += order0.steps[indexStep - 1].cumdistance
  }
  // 2. 加上当前step内，当前seg之前的所有seg的距离
  if (segIndex > 0) {
    const prevSeg = stepSegments[indexStep][segIndex - 1] // 修正：这里应该是当前step内的seg，不是前一个step
    cumRiderDistance += prevSeg.cumdistance
  }
  // 3. 加上当前seg内已经行走的距离
  cumRiderDistance += seg.distance * progress

  return cumRiderDistance
}

//二分法
/**
 * 
 * @param duration 骑手在step中的局部时间 
 * @returns 返回目标step的索引
 */
function findIndex(duration: number, isStep: boolean, targetStepSegments?: SegmentType[]): number {
  if (isStep) {
    if (!order0) return -1
    const steps = order0.steps
    let left = 0
    let right = steps.length - 1
    let ans = right
    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      if (steps[mid].cumduration >= duration) {
        ans = mid
        right = mid - 1
      } else {
        left = mid + 1
      }
    }
    return ans //返回目标step的索引 
  } else if (targetStepSegments) { //不找step就是找segment
    let left = 0
    let right = targetStepSegments.length - 1
    let ans = right
    while (left <= right) {
      const mid = Math.floor((right + left) / 2)
      if (targetStepSegments[mid].cumduration >= duration) {
        ans = mid
        right = mid - 1 //为什么这里减1？
      } else {
        left = mid + 1
      }
    }
    return ans
  }
  return -1
}

//绘制订单起点和终点
export async function drawStartEnd(viewer: Cesium.Viewer, order0: DeliveryOrder) {

  const pickup = [order0!.pickupNodes[0].lng, order0!.pickupNodes[0].lat] as [number, number]
  const dropoff = [order0!.dropoffNodes[0].lng, order0!.dropoffNodes[0].lat] as [number, number]

  const [pickupC3, dropoffC3] = await lnglat2Car3([pickup, dropoff])
  console.log('pickupC3,dropoffC3', pickupC3, dropoffC3)
  const pickupEntity = new Cesium.Entity({
    id: 'pickup',
    position: pickupC3,
    point: { pixelSize: 30, color: Cesium.Color.GREEN }
  })
  const dropoffEntity = new Cesium.Entity({
    id: 'dropoff',
    position: dropoffC3,
    point: { pixelSize: 30, color: Cesium.Color.GREEN }
  })
  viewer.entities.add(pickupEntity)
  viewer.entities.add(dropoffEntity)
}


