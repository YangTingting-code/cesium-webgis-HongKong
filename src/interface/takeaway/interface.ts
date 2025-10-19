import { Cartesian3 } from 'cesium'

export interface flattenedSegment {
  segment: SegmentType
  globalStart: number //存储距离
  globalEnd: number //存储距离
  stepIndex: number
  segmentIndex: number
}

export interface Leg {
  startMilestone: number;
  endMilestone: number;
  segmentIndices: number[];
  startDistance: number;
  endDistance: number;
  startCum: number;
  endCum: number;
}

//外卖店
export interface NodePoint {
  id: number;
  type: 'shop' | 'amenity' | 'office' | 'station'; // shop/amenity/office 这里可以修改
  maintype: string; //比如说amenity里面有多种  amenity:
  subtype: string; // cafe/restaurant/post_office
  lat: number;
  lng: number;
  tag: Record<string, unknown>;
  region: string;
  baseOrderCount?: number; // 基础订单量 外卖店才有基础订单量 哪些是外卖店？ amenity ： Sustenance，shop ："Food,beverages" 这两种
  orders?: number; // 当前订单量
  category: string
}
export interface BuildingPolygon {
  id: number;
  buildingType: string;
  sceneType: string;
  geometry: Array<{ lat: number; lng: number }>;
  functionNodes: NodePoint[]; // 内部功能点
  tag: Record<string, unknown>; //建筑信息
  basePeople?: number; // 整栋建筑人流 根据时间和建筑信息设置人流
  area?: number | null; //缓存面积 方便计算人流
  centroid?: { lng: number; lat: number } | null; //缓存质心，方便生成人流点位
  region: string
}

// 输出的数据
export interface DeliveryNodes {
  pickupNodes: NodePoint[];   // 取餐点
  dropoffNodes: NodePoint[];  // 送货点
}
interface StepType_wgs84 {
  direction: number
  distance: number
  duration: number
  cumdistance: number
  cumduration: number
  instruction: string
  name: string
  stepPath_wgs84: [number, number][]
  restrictions_info: string
  road_types: string
  turn_type: string
}

export interface DeliveryOrder {
  riderId: string
  duration: number
  distance: number
  pickupNodes: NodePoint[] // 1~3 个店铺
  dropoffNodes: NodePoint[] // 对应送货地址
  fullpath?: [number, number][]         // [[lng, lat], ...] 由百度 API 返回的轨迹点
  steps: StepType_wgs84[],
  totalMinutes: number,
  category: string,
  timeslot: number
}

export interface SegmentType {
  start: [number, number], //lng,lat
  end: [number, number],
  startC3?: Cartesian3,
  endC3?: Cartesian3,
  duration: number,
  distance: number,
  cumduration: number,
  cumdistance: number,
}

//组合多个订单
export type CombinedOrder = DeliveryOrder & { //这是把 DeliveryOrder 的属性粘合进去吗?
  subOrders: Array<{ //子订单
    orderId: string
    pickup: [number, number] //lng,lat
    dropoff: [number, number]
    mergedDistance: number
    mergedDuration: number
    originalDistance: number
    originalDuration: number
  }>,
  milestones: Milestone[] //起点 + 所有取送节点，按骑行顺序
}
export type MatrixNode = {
  orderId?: string          // 骑手起点不需要 orderId
  type: 'start' | 'pickup' | 'dropoff'
  position: [number, number]  // [lat, lng]
}

export type SegmentBuckets = {
  currentSegs: number[], pastSegs: number[], futureSegs: number[]
}

export type flattenedSegmentsType = {
  segment: SegmentType
  globalStart: number //存储距离
  globalEnd: number //存储距离
  stepIndex: number
  segmentIndex: number
}
//获取当前区域的聚合结构
export type SlotData = {
  combinedOrders: Record<string, CombinedOrder>, //骑手id为键值
  orderStepSegments: Record<string, Record<string, SegmentType[]>>,
  startTimeIso: string
}

export type Milestone = {
  lng: number,
  lat: number,
  type: 'start' | 'pickup' | 'dropoff',
  orderId: string | null,
  cumDistance: number //累计里程
}

export interface combinedorderControl {
  currentRegion: string,
  currentRiderIdx: number,
  currentTimeslot: number
} 