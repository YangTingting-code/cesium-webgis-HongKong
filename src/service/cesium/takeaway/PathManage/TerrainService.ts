import type { Position } from '@/interface/globalInterface';
import * as Cesium from 'cesium'

export class TerrainService {
  private static inst: TerrainService
  private provider: Cesium.TerrainProvider | null = null;

  static getInstance() {
    if (!this.inst) {
      this.inst = new TerrainService()
    }
    return this.inst
  }

  async toCartesian3(points: Position[]) {
    if (!this.provider) {
      //准备地形提供器
      this.provider = await Cesium.createWorldTerrainAsync()
    }

    // 1.1.2.1 准备需要更新高程信息的点位 经纬度转换为Array.<Cartographic>
    const cartos = points.map((point: [number, number]) => { //转换成为弧度制的经纬度
      return Cesium.Cartographic.fromDegrees(point[0], point[1])
    })
    const updated = await Cesium.sampleTerrainMostDetailed(this.provider, cartos)
    //经纬度坐标转换
    const car3Array = updated.map((cartos: Cesium.Cartographic) =>
      Cesium.Cartesian3.fromRadians(
        cartos.longitude,
        cartos.latitude,
        cartos.height
      )
    )
    return { car3Array }
  }

}