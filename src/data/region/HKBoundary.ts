import axios from 'axios';
import * as Cesium from 'cesium';
import coordtransform from 'coordtransform';
import type { PolygonCoor, LinearRing } from '@/interface/globalInterface';
//axios读取数据需要把数据放在public目录下 否则会找不到到文件
// export async function data() {
const data = await axios('/data/香港特别行政区.json');
export const features = data.data.features;
const maskpointArray = []; //maskpointArray = [lng1, lat1, lng2, lat2, lng3, lat3, ...];
// 这里的数据筛选要大家根据自己的json数据结构进行获取
const arr = features[6].geometry.coordinates[0][0];
// 获取行政区边界 1.准备一个数组 需把星火坐标转换为wgs84
export const outlinePolygon: PolygonCoor = [];
const outline: LinearRing = [];
outlinePolygon.push(outline);
//转换坐标
// var gcj02towgs84 = coordtransform.gcj02towgs84(116.404, 39.915);
// 计算行政外接矩形
//1. 装lngs/lats
const lngs = [];
const lats = [];
//采样地形
//弧度制经纬度
//第 1 步（把 [lng, lat, lng, lat...] 变成 Cartographic 数组
export const cartographic: Cesium.Cartographic[] = [];
// 处理九龙区的边界数据，整理成我们想要的格式
for (let i = 0, l = arr.length; i < l; i++) {
  //2.火星坐标转换为wgs84
  const tmp = coordtransform.gcj02towgs84(arr[i][0], arr[i][1]);
  // 获取行政区边界 2.转换坐标后把坐标塞进数组中
  outline.push(tmp);
  lngs.push(tmp[0]);
  lats.push(tmp[1]);
  //2. 转换成弧度值的经纬度 第三步在函数里面
  cartographic.push(Cesium.Cartographic.fromDegrees(tmp[0], tmp[1]));
  maskpointArray.push(tmp[0]);
  maskpointArray.push(tmp[1]);
}

//计算边界
function getBBox(lngs: any, lats: any) {
  const bounds = {
    west: Math.min(...lngs),
    east: Math.max(...lngs),
    south: Math.min(...lats),
    north: Math.max(...lats),
  };
  return bounds;
}
export const bounds = getBBox(lngs, lats);
// console.log(maskpointArray); //[114,22,115,23]

// 将其转换成下边渲染entity所需的3D笛卡尔坐标系。
const maskspoint = Cesium.Cartesian3.fromDegreesArray(maskpointArray);
// console.log(maskspoint);

//polygon区域面绘制
//使用Entity实现面的绘制
const holesHierarchy = [
  new Cesium.PolygonHierarchy(maskspoint), // 如果只有一个洞
];
export const area = new Cesium.Entity({
  id: '1',
  polygon: {
    hierarchy: new Cesium.PolygonHierarchy(
      Cesium.Cartesian3.fromDegreesArray([110, 10, 110, 30, 130, 30, 130, 10]),
      holesHierarchy
    ),
    material: Cesium.Color.BLACK.withAlpha(0.5),
  },
});

export const line = new Cesium.Entity({
  id: '2',
  polyline: {
    positions: maskspoint,
    width: 4, //边界线宽
    material: Cesium.Color.fromCssColorString('#6dcdeb'), //边界线颜色
    clampToGround: true, // 贴地
  },
});

const rectangleShape = [
  new Cesium.Cartesian2(-2.0, -2.0),
  new Cesium.Cartesian2(2.0, -2.0),
  new Cesium.Cartesian2(2.0, 2.0),
  new Cesium.Cartesian2(-2.0, 2.0),
];
export const line3D = new Cesium.Entity({
  id: '3',
  polylineVolume: {
    positions: maskspoint,
    shape: rectangleShape, // 截面形状（这里是矩形）,
    material: Cesium.Color.fromCssColorString('#6dcdeb'), //边界线颜色
  },
});
// 一维数组
//maskpointArray = [lng1, lat1, lng2, lat2, lng3, lat3, ...];
export async function createLine3D(
  cartographic: Cesium.Cartographic[],
  offsetH = 0
) {
  //3.采样地形
  const terrainProvider = await Cesium.createWorldTerrainAsync();
  const positionWithTerrian = await Cesium.sampleTerrainMostDetailed(
    terrainProvider,
    cartographic
  );

  //4.转换成空间直角坐标系
  const maskpoint = positionWithTerrian.map((p) =>
    Cesium.Cartesian3.fromRadians(p.longitude, p.latitude, p.height + offsetH)
  );

  //5.矩形截面
  const rectangleShape = [
    //x,y 二维形状
    new Cesium.Cartesian2(-2.0, -20.0),
    new Cesium.Cartesian2(2.0, -20.0),
    new Cesium.Cartesian2(2.0, 20.0),
    new Cesium.Cartesian2(-2.0, 20.0),
  ];

  //6.添加立体线
  const line3D = new Cesium.Entity({
    polylineVolume: {
      positions: maskpoint,
      shape: rectangleShape,
      material: Cesium.Color.fromCssColorString('#6dcdeb').withAlpha(0.5),
      //下面是网格样式
      /* new Cesium.GridMaterialProperty({
        color: Cesium.Color.YELLOW,
        cellAlpha: 0.2,
        lineCount: new Cesium.Cartesian2(8, 8),
        lineThickness: new Cesium.Cartesian2(2.0, 2.0)
      }) */
    },
  });
  return line3D;
}

//行政区面域的块状物体
export async function createArea3D(
  cartographic: Cesium.Cartographic[],
  thickness = 100
) {
  //1.加载地形
  const terrainProvider = await Cesium.createWorldTerrainAsync();
  //2.采样地形
  const boundaryPositionWithTerrain = await Cesium.sampleTerrainMostDetailed(
    terrainProvider,
    cartographic
  );

  //3.求顶面高度
  const maxHeight = Math.max(
    ...boundaryPositionWithTerrain.map((p) => p.height)
  );
  const extrudeHeight = maxHeight + thickness;

  //4.0 boundaryPositionWithTerrain转换成空间直角坐标系
  const boundaryPositionCar3 = boundaryPositionWithTerrain.map((p) =>
    Cesium.Cartesian3.fromRadians(p.longitude, p.latitude, p.height)
  );

  //4.1 构建立体盒子：罩子 地面没有厚度 只是贴合地形
  const area3DCap = new Cesium.Entity({
    polygon: {
      hierarchy: boundaryPositionCar3, //边界点
      perPositionHeight: true, //每个点用自己的高程
      extrudedHeight: extrudeHeight, //拉伸面相对于椭球体的高度
      material: Cesium.Color.CYAN.withAlpha(0.5),
      outline: true,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      classificationType: Cesium.ClassificationType.BOTH,
    },
  });

  // 4.2.0 求地面高度
  const minHeight = Math.min(
    ...boundaryPositionWithTerrain.map((p) => p.height)
  );
  // 4.2 构建立体盒子：厚块 block 地面有厚度
  const area3DBlock = new Cesium.Entity({
    polygon: {
      hierarchy: boundaryPositionCar3,
      perPositionHeight: false, //不用点的独立高程，而是整体高程 这样就不贴合地面
      height: minHeight - thickness / 2, //指定多边形相对于椭球表面的高度，减一点 往下切一点？
      extrudedHeight: maxHeight + thickness / 2, //拉伸高度 往上加一点
      material: Cesium.Color.CYAN.withAlpha(0.5),
      outline: true,
      outlineColor: Cesium.Color.BLACK,
    },
  });
  return { area3DCap, area3DBlock };
}
