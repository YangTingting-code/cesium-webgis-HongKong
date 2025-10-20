import { sceneFlow } from '@/data/heatmap/mock/flowWeight';
import { sceneCapacity, usageRate, maxPeople } from '@/data/heatmap/mock/capacity';
import type { BuildingPolygon } from '../../interface/heatmap/interface';
// 时段判断
const slotNow = (t: Date) => {
  const h = t.getUTCHours();
  if (h < 6) return 'night';
  if (h < 8) return 'earlyMorning';
  if (h < 10) return 'morning';
  if (h < 14) return 'lunch';
  if (h < 17) return 'afternoon';
  if (h < 20) return 'evening';
  return 'lateEvening';
};
//楼层
const calcfloor = (b: BuildingPolygon) => {
  const lv = b.tag?.['building:levels'];
  const n = Number(lv);
  if (n > 0 && lv != null && !Number.isNaN(n)) {
    if (b.sceneType === 'mallArea') {
      return Math.min(n, 5); //商场有效营业层最多5
    } else if (n > 20) return 20; //最多是10层
    return n;
  } //防止出现NaN
  if (b.sceneType === 'stationArea') return 1; //地铁站给设置成1层吧 如果她没有写层数的话
  return 3; //没有显示标注楼层的话默认是3层楼
};
// 随机扰动
const rand = (mu = 1, sigma = 0.05) =>
  Math.max(0.1, mu + (Math.random() - 0.5) * 2 * sigma);
// 封顶不再是硬 2100，而是“面积越大，允许上限越小”
// 1. 面积越大，封顶下降越快 —— 用平方根或 log
/* const softCap = (scene: string, area: number) => {
  const base = maxPeople[scene];          // 3000
  const decay = Math.log(area / 1000 + 1) * 400; // log(10+1)*400≈960
  return Math.max(800, base - decay);
}; */

const softCap = (scene: string, area: number) => {
  const base = maxPeople[scene]; // 基准 1000 ㎡ 的峰值
  const decay = Math.log(area / 1000 + 1) * 400; // 衰减系数从 600 降低到 400。decay是面积折扣：表示由于大面积减少的人流 面积大 实际上就达不到小面积的理论峰值 因为面积大 人被稀释了。计算原理： 让面积缓慢增大 想象log函数 +1为了保证都是正数
  return Math.max(700, Math.floor(base - decay)); // 理论峰值 - 稀释后的 = 该建筑的人流
};

/**
 * 空间平滑 + 随机扰动（后处理）
 * 只做一次，不依赖任何外部字段
 */
function postProcess(points: any[], radiusM = 500) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dist = (a: any, b: any) => {
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  };

  // 1. 计算 50% 分位，作为“低值屏蔽线”
  const vals = points.map((p) => p.value);
  vals.sort((a, b) => a - b);
  const cutoff = vals[Math.floor(vals.length * 0.5)];

  return points.map((p) => {
    let sumWeight = 0;
    let weighted = 0;

    // 2. 只让“高值”参与平滑
    points.forEach((q) => {
      if (q.value < cutoff) return; // 🔥关键：低值不参与
      const d = dist(p, q);
      if (d > radiusM) return;
      const w = Math.exp(-(d * d) / (2 * 200 * 200));
      weighted += q.value * w;
      sumWeight += w;
    });

    const smooth = sumWeight ? weighted / sumWeight : p.value;

    // 3. S 型压缩，把最高值压回去
    const maxVal = vals[vals.length - 1];
    const norm = smooth / maxVal; // 0~1
    const compressed = 1 / (1 + Math.exp(-12 * (norm - 0.7))); // S 曲线
    const finalVal = Math.round(compressed * maxVal);

    // 4. 轻微随机抖动
    const jitter = 0.95 + Math.random() * 0.1;
    return { ...p, value: Math.round(finalVal * jitter) };
  });
}
// let debug: Record<string, BuildingPolygon[]> = {}
const calcPeopleByArea = (b: BuildingPolygon, area: number, t: Date) => {
  const slot = slotNow(t);
  const floor = calcfloor(b);

  /* 2. 小面积补贴 */
  // 3. 小面积补贴只给“真·小”
  const smallBonus =
    area < 500
      ? area < 300 && floor <= 3
        ? area < 100 && floor <= 3
          ? 10
          : 5
        : 1.5
      : 1;
  // 归一化面积，避免极大值影响
  const maxArea = 2000; // 可以根据你的数据调整
  const normArea = Math.min(area, maxArea) / maxArea; // 0~1

  // 面积衰减系数，小面积接近1，大面积接近0.3
  const areaFactor = 1 - 0.3 * normArea; // 0.7是衰减强度，可调
  // const areaFactor = 1 / Math.sqrt(1 + area / 500); // 面积越大，系数越小

  // 2. 楼层再砍
  /*  const floorEff = b.sceneType === 'mallArea'
     ? [1, 0.8, 0.6, 0.4, 0.2].slice(0, floor).reduce((a, b) => a + b, 0) // 和=2.0
     : Math.min(floor, 6);   // 其他≤6 */
  /*  const floorEff = b.sceneType === 'mallArea'
     ? [1, 0.7, 0.5, 0.3, 0.1].slice(0, floor).reduce((a, b) => a + b, 0) // 和=1.6
     : Math.min(floor, 6);   // 其他≤6 */

  const effArea =
    areaFactor * area * usageRate[b.sceneType] * smallBonus * floor; //建筑实际利用的面积

  const cap = sceneCapacity[b.sceneType];
  const flow = sceneFlow[b.sceneType]?.[slot];

  const base = effArea * cap * flow; //面积平方米 * 人/平方米 * 当前时间段（场景 早上）= 这个建筑
  const people = Math.floor(base * rand(1, 0.05));
  return Math.min(people, softCap(b.sceneType, area));
};
/**
 * 计算建筑人流
 * @param allBuildings 所有建筑
 * @param t 模拟的事件
 * @returns
 */
export function getPoints(allBuildings: any, t: Date) {
  //返回但建筑的点

  // 2. 更新heatmap
  const points = allBuildings
    .map((b: BuildingPolygon) => {
      if (!b.sceneType || !b.geometry || b.geometry.length === 0) return null;
      let people = 0;
      // debug[t.toISOString()] = []
      if (b.area) people = calcPeopleByArea(b, b.area, t);
      // const scaled = Math.min(1000, Math.round(people / 5)); //归一化人流0-1000
      //经纬度不用重新计算 只需要算一次 后面只是更新 value值
      return {
        lng: b.centroid?.lng,
        lat: b.centroid?.lat,
        value: people,
      };
    })
    .filter((p) => p !== null); //哪些点不是空的才存入points数组 为什么会存在空的点呢？

  const res = tongji(points);
  /* === 后处理：空间平滑+随机抖动 === */
  // const pointsAfter = postProcess(points)
  return { points, res };
}

function tongji(points: any) {
  const values = points.map((p) => p.value || 0);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length; // = 综合 / 个数
  values.sort((a, b) => a - b); //排序
  let median; //中位数 (median)
  if (values.length % 2 === 1) {
    median = values[Math.floor(values.length / 2)];
  } else {
    const mid = values.length / 2;
    median = (values[mid - 1] + values[mid]) / 2;
  }
  return { max, min, avg, median };
}
