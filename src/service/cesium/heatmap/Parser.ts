import {
  type BuildingPolygon,
  type NodePoint,
  amenityRules,
  shopRules,
  maintypeToScene,
  buildingType,
} from '../../../interface/heatmap/interface';
import * as turf from '@turf/turf';

export class Parser {
  /**
   * 转换 Overpass JSON 到 BuildingProfile
   */
  parseOverpassBuildings(data: any): BuildingPolygon[] {
    const buildings: BuildingPolygon[] = [];
    const nodes: NodePoint[] = [];

    //用于高亮
    // const buildingId: number[] = []
    // 先拆 node 功能点
    data.elements.forEach((el: any) => {
      if (
        el.type === 'node' &&
        (el.tags?.shop ||
          el.tags?.amenity ||
          el.tags?.office ||
          el.tags?.station)
      ) {
        // 1. 先确定“存在”的那个维度
        const type = ['shop', 'amenity', 'office', 'station'] // 优先级可调
          .find((k) => el.tags[k]);
        // 2. 取出具体类型
        const subtype = type ? el.tags[type] : null;
        // 遍历规则，找到对应主类
        let maintype = 'Others'; //默认
        if (type === 'amenity') {
          for (const [key, values] of Object.entries(amenityRules)) {
            if (values.includes(subtype)) {
              maintype = key;
              break;
            }
          }
        } else if (type === 'shop') {
          for (const [key, values] of Object.entries(shopRules)) {
            if (values.includes(subtype)) {
              maintype = key;
              break;
            }
          }
        } else if (type === 'office') {
          maintype = 'office';
        } else if (type === 'station' && el.tags.station === 'subway') {
          maintype = 'station';
        }

        nodes.push({
          id: el.id,
          type: el.tags.shop
            ? 'shop'
            : el.tags.amenity
              ? 'amenity'
              : el.tags.office
                ? 'office'
                : 'station',
          maintype, //比如amenity里面分了很多具体的类
          subtype:
            el.tags.shop ||
            el.tags.amenity ||
            el.tags.office ||
            el.tags.station,
          lat: el.lat,
          lng: el.lon,
          tag: el.tags,
          region: el.region
        });
      }
    });

    const mixedbuildingType = ['commercial', 'yes']; //需要根据功能点来判断
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
        const res = this.calculateAreaAndCentroid(el.geometry);
        if (!res) return; //无效建筑
        const { area, centroid } = res;
        if (mixedbuildingType.includes(el.tags.building)) {
          // commercial/yes → 泛用类型，后面再根据功能点分类
          buildings.push({
            id: el.id,
            buildingType: el.tags.building,
            sceneType: 'mixedArea', // 先默认混合，后面用 classifyGenericBuilding 覆盖
            geometry,
            functionNodes: [],
            tag: el.tags,
            area,
            centroid,
            region: el.region
          });
        } else if (
          el.tags.building === 'transportation' &&
          el.tags.ferry !== 'private' &&
          (el.tags['disused:ferry'] === 'yes' ||
            el.tags.amenity === 'ferry_terminal' ||
            el.tags.ferry === 'yes' ||
            area < 350 ||
            el.tags.station === 'subway' ||
            el.tags.railway === 'station')
        ) {
          buildings.push({
            id: el.id,
            buildingType: el.tags.building,
            sceneType: 'stationArea',
            geometry,
            functionNodes: [],
            tag: el.tags,
            area,
            centroid,
            region: el.region
          });
        } else if (
          el.tags.building === 'train_station' &&
          (el.tags.subway_entrance === 'yes' ||
            el.tags.station === 'subway' ||
            el.tags.railway === 'station' ||
            el.tags['building:levels:underground'] === 'yes' ||
            el.tags.layer === '-1' ||
            area < 350)
        ) {
          buildings.push({
            id: el.id,
            buildingType: el.tags.building,
            sceneType: 'stationArea',
            geometry,
            functionNodes: [],
            tag: el.tags,
            area,
            centroid,
            region: el.region
          });
        } else {
          // 普通类型 → buildingType 直接判定
          let sceneType = 'mixedArea'; // 默认
          for (const [scene, types] of Object.entries(buildingType)) {
            if (types.includes(el.tags.building)) {
              sceneType = scene;
              break;
            }
          }

          buildings.push({
            id: el.id,
            buildingType: el.tags.building,
            sceneType,
            geometry,
            functionNodes: [],
            tag: el.tags,
            area,
            centroid,
            region: el.region
          });
        }
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
      // b.commercialScore = b.functionNodes.length

      // 如果是泛用类型 → 根据功能点重新分类
      if (mixedbuildingType.includes(b.buildingType)) {
        if (b.buildingType === 'yes' && b.tag?.office) {
          //直接判定为officeArea
          b.sceneType = 'officeArea';
        } else if (b.buildingType === 'yes' && b.tag?.shop) {
          //直接判定为mallArea
          b.sceneType = 'mallArea';
        } else if (b.buildingType === 'commercial' && b.tag?.shop) {
          //直接判定为mallArea
          b.sceneType = 'mallArea';
        } else if (b.buildingType === 'commercial' && b.tag?.office) {
          //直接判定为officeArea
          b.sceneType = 'officeArea';
        } else if (
          b.buildingType === 'yes' &&
          b.tag?.station &&
          b.tag.station === 'subway'
        ) {
          //如果tag里面有station且值为subway 直接判定为stationArea
          b.sceneType = 'stationArea';
        } else if (
          b.buildingType === 'commercial' &&
          b.tag?.station &&
          b.tag.station === 'subway'
        ) {
          //如果tag里面有station且值为subway 直接判定为stationArea
          b.sceneType = 'stationArea';
        } else {
          b.sceneType = this.classifyGenericBuilding(b.functionNodes);
        }
      }
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

  // 3. 用于给泛用类型调用一个分类函数
  private classifyGenericBuilding(functionNodes: NodePoint[]): string {
    if (functionNodes.length === 0) return 'mixedArea'; // 没功能点 → 混合

    // 按场景类型计数
    const sceneCount: Record<string, number> = {
      officeArea: 0,
      mallArea: 0,
      residentialArea: 0,
      educationArea: 0,
      stationArea: 0,
      mixedArea: 0,
    };
    //amenity
    functionNodes.forEach((n) => {
      // 根据 maintype 找场景
      const scene = maintypeToScene[n.maintype] || 'mixedArea';
      sceneCount[scene] = (sceneCount[scene] || 0) + 1;
    });

    // 找出现最多的场景
    const total = functionNodes.length;
    let bestScene: string = 'mixedArea';
    let maxCount = 0;

    for (const [scene, count] of Object.entries(sceneCount)) {
      if (count > maxCount) {
        bestScene = scene;
        maxCount = count;
      }
    }

    // 如果占比超过一半 → 判定该场景，否则混合
    return maxCount / total > 0.5 ? bestScene : 'mixedArea';
  }

  private calculateAreaAndCentroid(
    geometry: any
  ): { area: number; centroid: { lng: number; lat: number } } | null {
    if (!geometry) return null;

    //根据面积计算人流
    const coords = geometry.map((p: any) => [p.lon, p.lat]);
    if (coords.length < 4) return null;
    if (
      coords[0][0] !== coords.at(-1)[0] ||
      coords[0][1] !== coords.at(-1)[1]
    ) {
      coords.push(coords[0]);
    }
    //那我这样不是每次都要用turf计算一次？需不需要保存每个建筑的id 和 area， 这样每次直接调用就可?
    //计算质心
    const cp = turf.centroid(turf.polygon([coords]));

    return {
      area: turf.area(turf.polygon([coords])), //计算面积
      centroid: {
        lng: cp.geometry.coordinates[0],
        lat: cp.geometry.coordinates[1],
      },
    };
  }
}
