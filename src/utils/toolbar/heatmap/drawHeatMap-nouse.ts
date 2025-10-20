import { CesiumHeatmap, type HeatmapPoint } from 'cesium-heatmap-es6';
import { getDataset } from '@/utils/toolbar/heatmap/handleData-drawHeatMapuse';
import * as Cesium from 'cesium';

export function drawHeatMap(viewer: Cesium.Viewer) {
  let heatmapData: HeatmapPoint[] = [];
  const rawData = getDataset();
  heatmapData = rawData.map((item) => {
    return {
      x: item['cesium#longitude'],
      y: item['cesium#latitude'],
      value: item.orders,
    };
  });
  const defaultDataValue = [10, 500];
  const defaultOpacityValue = [0, 1];
  const cesiumHeatmap = new CesiumHeatmap(viewer, {
    zoomToLayer: false, //当热力图创建完成后，自动把相机视角飞到能完整看到热力图的范围。
    points: heatmapData,
    //告诉热力图库如何解释 value 字段,即 max: 500, min: 10，所有点的 value 会被线性映射到这个区间；超过 500 的值会被截断，低于 10 的值会被提升到 10。
    heatmapDataOptions: { max: defaultDataValue[1], min: defaultDataValue[0] },
    // 代表热力图从中心（权重高）到边缘（权重低）的透明度从完全不透明到完全透明渐变
    heatmapOptions: {
      maxOpacity: defaultOpacityValue[1],
      minOpacity: defaultOpacityValue[0],
    },
  });
  return cesiumHeatmap;
}
