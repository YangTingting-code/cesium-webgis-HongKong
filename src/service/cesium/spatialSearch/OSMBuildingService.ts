// OSMBuildingService.ts
import type {
  BuildingProfile,
  buildingWithCategory,
} from '@/interface/globalInterface';
import { CacheManager } from './OSM/CacheManager';
import { Classifier } from './OSM/Classifier';
import { OverpassClient } from './OSM/OverpassClient';
import { Parser } from './OSM/Parser';
import { RegionAnalyzer } from './OSM/RegionAnalyzer';
import { Visualizer } from './OSM/Visualizer';
import { Cesium3DTileset } from 'cesium';

export class OSMBuildingService {
  cache = new CacheManager();
  private classifier = new Classifier();
  private client = new OverpassClient();
  private parser = new Parser();
  private analyzer = new RegionAnalyzer();
  visualizer;
  constructor(tileset: Cesium3DTileset) {
    this.visualizer = new Visualizer(tileset);
  }
  /**
   * 主入口：查询某中心点 + 半径的建筑信息
   */
  async query(
    lng: number,
    lat: number,
    radius: number,
    tuDingEntityId: string
  ) {
    // 1. 先查缓存
    let buildings: BuildingProfile[] | undefined = this.cache.read(
      lng,
      lat,
      radius
    );

    // 2. 缓存没命中 → 请求 Overpass
    if (!buildings) {
      const rawData = await this.client.fetch(lng, lat, radius);
      buildings = this.parser.parseOverpassBuildings(rawData);
      this.cache.write(lng, lat, radius, buildings, tuDingEntityId);
    }

    // 3. 分类
    const { classifiedBuildings, categoryIds } =
      this.classifier.classifyBuildingsBatch(buildings);

    // 4. 区域分析
    const { amountFourType, eachAreaFourType } = this.analyzer.regionStructure(
      classifiedBuildings as buildingWithCategory[]
    );

    // 5. 返回综合结果
    return {
      buildings: classifiedBuildings,
      categoryIds,
      amountFourType,
      eachAreaFourType,
    };
  }

  /** 删除缓存 只是删除单个*/
  deleteCache(lng: number, lat: number) {
    this.cache.delete(lng, lat);
  }
  deleteCacheAll() {
    this.cache.clear();
  }
}
