import axios from 'axios';
// import { bounds } from '@/data/region/HKBoundary';

//获取数据 拿到建筑物的面
// https://[OGC WFS URL]?[SERVICE]&[VERSION]&[REQUEST]&[TYPENAME]&[OUTPUTFORMAT]&[SRSNAME]&[BBOX]&[COUNT]
// ArcGIS REST API网址格式：
// https://[ArcGIS REST API URL]/[layerId]/query?[f]&[returnGeometry]&[spatialRel]&[geometry]&[geometryType]&[inSR]&[outSR]&[where]&[outFields]
export async function getHKWFS(bounds: {
  south: number;
  west: number;
  north: number;
  east: number;
}) {
  let bbox: string | undefined;
  if (bounds)
    bbox =
      bounds.south + ',' + bounds.west + ',' + bounds.north + ',' + bounds.east;

  const baseURL =
    'https://portal.csdi.gov.hk/server/services/common/landsd_rcd_1637211194312_35158/MapServer/WFSServer';
  const params = {
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeName: 'BUILDING_STRUCTURE',
    outputFormat: 'geojson',
    srsname: 'EPSG:4326',
    count: 10,
    bbox: bbox,
  };
  try {
    //请求数据
    const res = await axios.get(baseURL, { params });
    const features = res.data.features;
    return features;
  } catch (err) {
    console.dir(err);
  }
}

export async function getHKWFSByArcGIS(
  lng: number,
  lat: number,
  radius: number
) {
  const baseURL =
    'https://portal.csdi.gov.hk/server/rest/services/common/landsd_rcd_1637211194312_35158/MapServer/0/query'; // 0 = layerId
  const params = {
    f: 'geojson',
    returnGeometry: true,
    spatialRel: 'esriSpatialRelIntersects',
    geometryType: 'esriGeometryPoint',
    geometry: `${lng},${lat}`,
    distance: radius, // 半径（米）
    units: 'esriSRUnit_Meter', // 显式声明单位为米
    inSR: 4326,
    outSR: 4326,
    outFields: '*',
  };
  try {
    //请求数据
    const res = await axios.get(baseURL, { params });
    const features = res.data.features;
    return features;
  } catch (err) {
    console.dir(err);
  }
}
