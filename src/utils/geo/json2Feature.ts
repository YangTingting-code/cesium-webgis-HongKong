import axios from "axios";
import * as turf from '@turf/turf'
import coordtransform from 'coordtransform' //火星坐标转换到wgs84 先把坐标转换好了再展开

/**
 * 
 * @param name 想要获取的行政区
 */
export async function getMultipolygon(name: string) {
  const res = await axios('/data/香港特别行政区.json')
  const features = res.data.features
  let targetGeometry
  for (let i = 0; i < features.length; i++) {
    // console.log('data[i].properties.name', features[i].properties.name)
    if (features[i].properties.name === name) {
      targetGeometry = features[i].geometry
    }
  }
  // console.log('targetGeometry', targetGeometry)
  if (targetGeometry) {
    const multiPolygon = turf.multiPolygon(targetGeometry)
    // console.log('multiPolygon', multiPolygon)
    return multiPolygon
  }
  return null
}

export async function multiPolygon2Single(name: string) {
  const polygons: any = []
  try {
    const multiPolygon = await getMultipolygon(name)
    if (multiPolygon) {
      // console.log('multiPolygon.geometry.coordinates.coordinates', multiPolygon.geometry.coordinates.coordinates)
      multiPolygon.geometry.coordinates.coordinates.forEach(coordinate => {
        polygons.push(turf.polygon(coordinate))
      })
      // console.log(name + "polygons", polygons)
      return polygons
    }
  } catch (err) {
    console.warn('multiPolygon2Single', err)
  }

}
/**
 * @param polygons 单个MultiPolygon展开来的多个turf生成的polygons，注意这些polygons只是一个multipolygon上拆分出来的
 * @renturn 返回lat lon 用空格分隔的字符串数组，如果一个行政区有多个面，那么数组里面就有多个元素，如果一个行政区只有一个面 ，那么数组只有一个元素
 */
export async function flatPolygon(name: string) {
  const polygons = await multiPolygon2Single(name)
  const latLonStrArr: any = []
  polygons.forEach(polygon => {
    const tmp = polygon.geometry.coordinates[0].map(point => {
      const wgs84Point = coordtransform.gcj02towgs84(point[0], point[1])
      return [wgs84Point[1], wgs84Point[0]]
    })
    latLonStrArr.push(tmp.flat().join(' '))
  })
  // console.log('latLonStrArr', latLonStrArr)
  return latLonStrArr
}


// 计算多个多边形的外边界

export async function getFeaturesBBox(regions: Array<string>) {
  const polygons: any = []
  for (const region of regions) {
    const polys = await multiPolygon2Single(region)
    if (polys) polygons.push(...polys)
  }
  const collection = turf.featureCollection(polygons)
  const bboxMultiPolys = turf.envelope(collection)
  return bboxMultiPolys
}



