import {
  // outlinePolygon,
  // area,
  extractRegionGeometries,
  createLine3D,
  getBBox
  // cartographic,
} from '../../data/region/HKBoundary';
import * as Cesium from 'cesium'

//改造成可以绘制多个的 ? 主要是视图那里要调整 多个区域的bbox
export async function makeRegionPoly(viewer: Cesium.Viewer, regions: string[] | string, isFly: boolean) {

  const regionsArr = Array.isArray(regions) ? regions : [regions]

  const { unifiedArea, cartographicArr, lngsArr, latsArr } = extractRegionGeometries(regionsArr)

  //添加统一掩膜
  viewer.entities.add(unifiedArea)

  for (let i = 0; i < regionsArr.length; i++) {
    // //绘制三维边界线
    const regionName = regionsArr[i]
    // const lineId = `${regionName}-line3D`
    // const existingLine = viewer.entities.getById(lineId)
    // if (existingLine) viewer.entities.remove(existingLine)

    const line3D = await createLine3D(cartographicArr[i], regionName)
    viewer.entities.add(line3D)
  }

  //自动调整视角
  const bounds = getBBox(lngsArr, latsArr)

  //观看全局, 后面可以加一个角度
  const { west, south, east, north } = bounds
  if (isFly) {
    viewer.camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(west, south, east, north),
    })
  } else {
    viewer.camera.setView({
      destination: Cesium.Rectangle.fromDegrees(west, south, east, north),
    })
  }

  //下面是局部视角
  // const center = PolygonCenter(outlinePolygon);
  /* viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(
      center.geometry.coordinates[0],
      center.geometry.coordinates[1],
      300
    ),
    orientation: {
      heading: Cesium.Math.toRadians(-30.0),
      pitch: Cesium.Math.toRadians(-15),
      roll: 0.0,
    },
  }); */
}

export function clearRegionPoly(viewer: Cesium.Viewer, regions: string[] | string) {

  const areaId = `unified-region-mask`
  viewer.entities.removeById(areaId)

  const regionAll = Array.isArray(regions) ? regions : [regions]

  regionAll.forEach((region) => {
    const lineId = `${region}-line3D`
    viewer.entities.removeById(lineId)
  })
}
