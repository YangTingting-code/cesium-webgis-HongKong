import type { buildingWithCategory } from '@/interface/globalInterface';
import * as turf from '@turf/turf';
interface EachArea {
  id: Number;
  area: Number;
  // geometry: { lat: number; lng: number }[]
}
//返回amountFourType 计算建筑的种类
export class RegionAnalyzer {
  regionStructure(buildingsWithCategory: buildingWithCategory[]) {
    const keys = [
      'commercial',
      'accommodation',
      'civic',
      'transportation',
      'unknown',
    ] as const;
    const amountFourType = Object.fromEntries(
      keys.map((k) => [k + 'Amount', 0])
    );
    // fromEntries 是把  [["a","b"],["b",1]] 转换成 普通对象 {"a":"b","b":1}
    const eachAreaFourType = Object.fromEntries(
      keys.map((k) => [k + 'EachArea', [] as EachArea[]])
    );
    //每种类型单个建筑的面积
    buildingsWithCategory.forEach((b) => {
      const cat = b.category;
      if (cat + 'Amount' in amountFourType) {
        //数量++
        amountFourType[cat + 'Amount']++;
        //面积入队
        const area = this.caculateArea(b.geometry);
        eachAreaFourType[cat + 'EachArea'].push({
          id: b.id,
          area: area,
          // geometry: b.geometry
        });
      }
    });
    return { amountFourType, eachAreaFourType };
  }
  /**下面是类的工具函数 */
  //计算每个BuildingProfile geometry的面积 单位：平方米
  private caculateArea(geometry: { lng: number; lat: number }[]) {
    if (geometry.length < 3) return 0; // 不足 3 点无法成面
    // 计算面积 处理数据结构
    const coords = geometry.map((point) => {
      return [point.lng, point.lat];
    });
    // 1. 如果不闭合就让他闭合
    if (!this.isValidPolygon(geometry)) {
      coords.push([...coords[0]]);
    }
    // 2. 再次确认≥4个点
    if (coords.length < 4) return 0;

    const polygon = turf.polygon([coords]);
    return turf.area(polygon);
  }

  private isValidPolygon(geom: { lat: number; lng: number }[]): boolean {
    // 面需要闭合 如果首尾不一致需要补上第一个点
    return (
      geom.length >= 4 &&
      geom[0].lat === geom[geom.length - 1].lat &&
      geom[0].lng === geom[geom.length - 1].lng
    );
  }
}
