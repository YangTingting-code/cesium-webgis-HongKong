import { getHKWFS } from '@/service/dataSource/getWFSData';
import {
  type MultiPolygonFeature,
  type Point,
  type MultiPolygon,
} from '@/interface/globalInterface';
import { multiPolyCenter } from '@/utils/geo/getFeaturesCenter';
import * as Cesium from 'cesium';

export async function drawPolygon(viewer: Cesium.Viewer, bounds: {
  south: number;
  west: number;
  north: number;
  east: number;
}) {
  const features = await getHKWFS(bounds);
  //1.处理坐标 1.1一维坐标 二维存放不同面的
  const temp: number[][] = [];
  //获取多个多边形的质心 1.准备存放多边形的数组
  const multiPolygon: MultiPolygon = [];
  features.forEach((f: MultiPolygonFeature) => {
    const tmp: number[] = [];
    temp.push(tmp);
    f.geometry.coordinates[0][0].forEach((p: Point) => {
      tmp.push(p[0]);
      tmp.push(p[1]);
    });
    //获取多个多边形的质心 2.获取多边形 ...展开是为了把多个面展开一个个塞进去 避免多包一层数组 多边形里面可能有环
    multiPolygon.push(...f.geometry.coordinates);
  });
  //获取多个多边形的质心 3.获取质心
  const multiCen = multiPolyCenter(multiPolygon);

  //1.处理坐标 1.2笛卡尔3
  const Car3: Cesium.Cartesian3[][] = [];
  temp.forEach((arr) => {
    Car3.push(Cesium.Cartesian3.fromDegreesArray(arr));
  });
  //处理完毕 获得Car3 [[Car3,Car3,Car3,...],[],[],...]
  const multiPolygonEntity: Cesium.Entity[] = [];
  Car3.forEach((_, index) => {
    const polygon = new Cesium.Entity({
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(Car3[index]),
        material: Cesium.Color.YELLOW,
      },
    });
    multiPolygonEntity.push(polygon);
    viewer.entities.add(polygon);
  });

  //视角设置到质心 1.处理中心坐标到Car3 lng:multiCen.geometry.coordinates[0] lat:multiCen.geometry.coordinates[1]
  const center = Cesium.Cartesian3.fromDegrees(
    multiCen.geometry.coordinates[0],
    multiCen.geometry.coordinates[1],
    0
  );
  console.log('center', center);
  const heading = Cesium.Math.toRadians(0);
  const pitch = Cesium.Math.toRadians(-45);
  const range = 150;
  const offset = new Cesium.HeadingPitchRange(heading, pitch, range);
  viewer.camera.lookAt(center, offset);
}
