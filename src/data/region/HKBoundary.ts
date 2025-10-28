import axios from 'axios';
import * as Cesium from 'cesium';
import coordtransform from 'coordtransform';
import { terrainProvider } from '@/data/layersData'
import { regions } from '@/data/regionHK'

//axios读取数据需要把数据放在public目录下 否则会找不到到文件
// export async function data() {
const data = await axios('/data/香港特别行政区.json')
export const features = data.data.features

//黑色掩膜
const darkMask = [110, 10, 110, 30, 130, 30, 130, 10]


export const extractRegionGeometries = (regionsArr: string[]) => {
  const allHoles: Cesium.PolygonHierarchy[] = []
  const cartographicArr = []
  const lngsArr: number[] = []
  const latsArr: number[] = []

  //遍历所有行政区，收集洞+经纬度
  for (let i = 0; i < regionsArr.length; i++) {
    const regionName = regionsArr[i]
    const idx = regions.indexOf(regionName)
    if (idx === -1) continue

    // const arr = features[idx].geometry.coordinates[0][0]
    // const maskpointArray = []; //maskpointArray = [lng1, lat1, lng2, lat2, lng3, lat3, ...];

    const rings = features[idx].geometry.coordinates[0]

    const holesHierarchy = ringsToHoles(rings)

    allHoles.push(...holesHierarchy)

    //bbox 完整范围 把所有点的push进去
    const cartographic: Cesium.Cartographic[] = [];
    rings.forEach((ring: number[][]) => {
      ring.forEach((p: number[]) => {
        const [lng, lat] = coordtransform.gcj02towgs84(p[0], p[1])
        lngsArr.push(lng)
        latsArr.push(lat)

        cartographic.push(Cesium.Cartographic.fromDegrees(lng, lat))
      })
    })
    cartographicArr.push(cartographic)
  }

  const unifiedArea = new Cesium.Entity({
    id: `unified-region-mask`,
    polygon: {
      hierarchy: new Cesium.PolygonHierarchy(
        Cesium.Cartesian3.fromDegreesArray(darkMask),//黑色矩形边界
        allHoles
      ),
      material: Cesium.Color.BLACK.withAlpha(0.5),
    },
  })

  return { unifiedArea, cartographicArr, lngsArr, latsArr }
}


/* coords : [
  [ [x, y], [x, y], ... ],   // 索引 0：外环（必需）
  [ [x, y], [x, y], ... ],   // 索引 1：第一个洞
  [ [x, y], [x, y], ... ],   // 索引 2：第二个洞
  ...
] */

function ringsToHoles(coords: number[][][]): Cesium.PolygonHierarchy[] { //
  return coords.map(ring => {
    const wgs = ring.map(p => {
      return coordtransform.gcj02towgs84(p[0], p[1])
    })
    return new Cesium.PolygonHierarchy(
      Cesium.Cartesian3.fromDegreesArray(wgs.flat())
    )
  })
}

//计算边界
export function getBBox(lngs: any, lats: any) {
  const bounds = {
    west: Math.min(...lngs),
    east: Math.max(...lngs),
    south: Math.min(...lats),
    north: Math.max(...lats),
  };
  return bounds;
}

/* const rectangleShape = [
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
}); */

// 一维数组
//maskpointArray = [lng1, lat1, lng2, lat2, lng3, lat3, ...];

//准备数据


export async function createLine3D(
  cartographic: Cesium.Cartographic[],
  region: string,
  offsetH = 0
) {
  //3.采样地形
  // const terrProvider = terrainProvider
  // await Cesium.createWorldTerrainAsync();
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
  ]

  //6.添加立体线
  const line3D = new Cesium.Entity({
    id: `${region}-line3D`,
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
