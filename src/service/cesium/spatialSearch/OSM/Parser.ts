import type {
  BuildingProfile,
  FunctionNode,
} from '@/interface/globalInterface';
import * as turf from '@turf/turf';

export class Parser {
  /**
   * 转换 Overpass JSON 到 BuildingProfile
   */
  parseOverpassBuildings(data: any): BuildingProfile[] {
    const buildings: BuildingProfile[] = [];
    const nodes: FunctionNode[] = [];
    //用于高亮
    // const buildingId: number[] = []
    // 先拆 node 功能点
    data.elements.forEach((el: any) => {
      if (
        el.type === 'node' &&
        (el.tags?.shop || el.tags?.amenity || el.tags?.office)
      ) {
        nodes.push({
          id: el.id,
          type: el.tags.shop ? 'shop' : el.tags.amenity ? 'amenity' : 'office',
          subtype: el.tags.shop || el.tags.amenity || el.tags.office,
          lat: el.lat,
          lng: el.lon,
          tag: el.tags,
        });
      }
    });

    // 再拆建筑（way/relation）
    data.elements.forEach((el: any) => {
      if (el.tags?.building && (el.type === 'way' || el.type === 'relation')) {
        // relation: 多个 members，取 outer polygon 组合
        let geometry: Array<{ lat: number; lng: number }> = [];
        if (el.type === 'way') {
          geometry = el.geometry.map((p: any) => {
            return { lat: p.lat, lng: p.lon };
          }); //为什么不直接赋值geometry 而是要这样map一个个塞进去？ 因为p对象里面的是{lat,lon}，我要的是{lat,lng}
        } else if (el.type === 'relation' && el.members) {
          el.members.forEach((m: any) => {
            if (m.role === 'outer' && m.type === 'way' && m.geometry) {
              //如果成员在这栋建筑外面 就把geometry写入 不过为什么要用到展开运算符？ 因为map会返回一个数组 用map循环把lon改成lng但是多包一层数组 需要展开push
              geometry.push(
                ...m.geometry.map((p: any) => ({ lat: p.lat, lng: p.lon }))
              );
            }
          });
        }

        buildings.push({
          id: el.id,
          buildingType: el.tags.building,
          geometry,
          functionNodes: [],
          tag: el.tags,
          bbox: el.bounds,
        });
      }
    });

    // 关联功能点到建筑
    buildings.forEach((b) => {
      nodes.forEach((n) => {
        //  修改成turf
        if (this.pointInPolygonTurf({ lat: n.lat, lng: n.lng }, b.geometry)) {
          b.functionNodes.push(n);
        }
      });
      // 可选：计算商业活跃度
      b.commercialScore = b.functionNodes.length;
    });
    return buildings;
  }
  /**----内部工具函数---- */
  // 1. 用turf判断点是否在面内
  private pointInPolygonTurf(
    pt: { lat: number; lng: number },
    geom: Array<{ lat: number; lng: number }>
  ) {
    if (geom.length < 3) return false; // 无法构成面
    const coords = geom.map((p) => [p.lng, p.lat]);

    // 如果不闭合
    if (!this.isValidPolygon(geom)) {
      coords.push([...coords[0]]);
    }
    const turfPoint = turf.point([pt.lng, pt.lat]);
    const turfPolygon = turf.polygon([coords]);
    return turf.booleanPointInPolygon(turfPoint, turfPolygon);
  }

  // 2 .合法多边形检查器
  private isValidPolygon(geom: { lat: number; lng: number }[]): boolean {
    // 面需要闭合 如果首尾不一致需要补上第一个点
    return (
      geom.length >= 4 &&
      geom[0].lat === geom[geom.length - 1].lat &&
      geom[0].lng === geom[geom.length - 1].lng
    );
  }
}
