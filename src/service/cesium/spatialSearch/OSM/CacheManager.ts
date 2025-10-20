import type { BuildingProfile, CenterCache } from '@/interface/globalInterface';
import * as turf from '@turf/turf';
export class CacheManager {
  private cache: CenterCache = {};
  private readonly CACHE_KEY = 'osmCenterCache';

  constructor() {
    this.reload();
  }

  private makeCenterKey(lng: number, lat: number): string {
    return `${lng},${lat}`;
  }

  private flush(): void {
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(this.cache));
  }

  private reload(): void {
    this.cache = JSON.parse(localStorage.getItem(this.CACHE_KEY) || '{}');
  }

  /** 写缓存 */
  write(
    lng: number,
    lat: number,
    radius: number,
    data: BuildingProfile[],
    tuDingEntityId: string
  ) {
    this.reload();
    const cKey = this.makeCenterKey(lng, lat);
    const old = this.cache[cKey];
    if (!old || radius > old.radius) {
      //如果之前没有存过这个 或者之前存的半径没有现在这个大 就新创建或者重新赋值
      this.cache[cKey] = { pinEntityId: tuDingEntityId, radius, data };
      this.flush(); //存入本地
    }
  }

  /** 读缓存 */
  read(
    lng: number,
    lat: number,
    radius: number
  ): BuildingProfile[] | undefined {
    this.reload();
    const cKey = this.makeCenterKey(lng, lat);
    const record = this.cache[cKey];
    if (!record) return undefined;
    if (radius > record.radius) return undefined;
    return record.data.filter((b) =>
      this.isBuildingInRadius(lng, lat, radius, b)
    );
  }

  /** 删除: 按 entityId  */
  delete(lng: number, lat: number) {
    this.reload();
    const cKey = this.makeCenterKey(lng, lat);
    const rec = this.cache[cKey];

    if (rec && rec.radius) {
      delete this.cache[cKey];
      this.flush();
    }
  }

  /** 全部删除 */
  clear() {
    localStorage.removeItem(this.CACHE_KEY);
  }

  /**辅助函数 */
  private isBuildingInRadius(
    lng: number,
    lat: number,
    radius: number,
    building: BuildingProfile
  ): BuildingProfile | undefined {
    //turf判断是否不相交 circle and rectangle
    //turf生成圆形多边形
    const circle = turf.circle([lng, lat], radius, {
      steps: 64,
      units: 'meters',
    });
    const bboxPoly = turf.bboxPolygon([
      building.bbox.minlon,
      building.bbox.minlat,
      building.bbox.maxlon,
      building.bbox.maxlat,
    ]);
    const isIntersect = !turf.booleanDisjoint(circle, bboxPoly); //turf判断两个图形是否不相交 不相交是true 相交的是false 和我们的逻辑相反 把结果取反
    if (!isIntersect) return;
    const center = turf.point([lng, lat]);
    const inside = building.geometry.some((p) => {
      //目的地
      const to = turf.point([p.lng, p.lat]);
      //距离？
      const distance = turf.distance(center, to, { units: 'meters' });
      //距离是否小于我的搜索半径？ 小于的话说明这个建筑在搜索半径里面 可以返回
      return distance < radius; //some里面需要返回布尔值 只要有一个符合就说明这个建筑在搜索半径里面
    });
    return inside ? building : undefined;
  }
}
