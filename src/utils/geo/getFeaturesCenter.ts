/**
 * @param multiPolygon
 * @return pt centerOfMass 按照面积权重计算
 */
import * as turf from '@turf/turf';
import type { MultiPolygon, PolygonCoor } from '@/interface/globalInterface';
export function multiPolyCenter(multiPolygon: MultiPolygon) {
  const multiPoly = turf.multiPolygon(multiPolygon);
  //计算真正的“质心”，考虑了各子面的面积权重，结果通常更合理。
  const pt = turf.centerOfMass(multiPoly);
  return pt;
}

export function PolygonCenter(Polygon: PolygonCoor) {
  const poly = turf.polygon(Polygon);
  const center = turf.centerOfMass(poly);
  return center;
}
