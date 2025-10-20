import {
  CesiumHeatmap,
  type HeatmapPoint,
} from '@/lib/cesium-heatmap-es6-custom';
import { type Ref } from 'vue'
// 'cesium-heatmap-es6'
let heatLayer: CesiumHeatmap | null = null;

export function updateHeatmapData(
  layer: CesiumHeatmap,
  points: HeatmapPoint[],
  max: number,
  min: number
) {
  const datas = layer.lnglat2canvas(points); // 经纬度 -> canvas
  const data = {
    //用于热力图数据更新
    max,
    min,
    data: datas,
  };
  layer.updateCanvasDataOnly(data);
}

let index = 0;
/* ==========  对外唯一入口  ========== */
/** 首次创建或以后每次替换数据都调用同一个函数 */
export function updateHeatmapES6(viewer: any, points: any, heatmapOptions: {
  maxOpacity: number, minOpacity: number, radius: number, blur: number
}, isRemoved: Ref<boolean>, heatmapVisited: boolean) {
  if (isRemoved.value) {
    heatLayer = null
  } //如果热力图之前在外面被移除过，那么就把heatlayer初始化为null
  console.log('第几次进来', index++);
  console.log("看看有没有heatLayer", heatLayer)


  const values = points.map((p) => {
    if (p.value) return p.value;
    return 0;
  });
  const max = Math.max(...values);
  const min = Math.min(...values);
  console.log('max:', max, 'min:', min);
  console.log('heatLayer', heatLayer)
  // 2. 第一次创建
  if (!heatLayer) {
    heatLayer = new CesiumHeatmap(viewer, {
      zoomToLayer: !heatmapVisited, //  heatmapVisited ? 自动飞过去 : 不自动飞过去 ，当前是第一次创建热力图 heatmapVisited为fasle ,取反就是true，就会飞过去，如果是刷新之后热力图回显 此时heatmapVisited为true，取反为false，就停留在原地
      points,
      heatmapDataOptions: { max, min }, // 根据你人流范围调
      // heatmapOptions: {
      //   gradient: { 这个颜色还不错
      //     0.00: 'rgba(0,0,0,0)',        // 0 值完全隐形
      //     0.01: 'rgba(111, 143, 175, 0.55)', // 冷雾蓝
      //     0.20: 'rgba(120, 220, 222, 0.70)', // 薄荷青
      //     0.40: 'rgba(255, 230, 153, 0.80)', // 晨曦黄
      //     0.60: 'rgba(255, 180, 107, 0.90)', // 珊瑚橙
      //     0.80: 'rgba(255, 120, 120, 0.95)', // 夕阳粉
      //     1.00: 'rgba(255, 180, 140, 1)'     // 2200 峰值，柔和粉
      //   },
      //   maxOpacity: 1,
      //   minOpacity: 0,
      //   radius: 22,
      //   blur: 0.75                    // 稍微降低模糊，边缘更干净
      // },
      heatmapOptions,
      noLisenerCamera: true, // false 保持自动缩放'
    });
  } else {
    // 3. 以后只换数据，不重创建
    updateHeatmapData(heatLayer, points, max, min); // 只刷数据   
    console.log('heatLayer00000', heatLayer)
    // heatLayer.remove()
    /* const option = {
      gradient: {
        0.00: '#0d0d2b', // 极暗紫（接近透明）
        0.20: '#4169e1', // 皇家蓝
        0.35: '#00ced1', // 冰蓝
        0.50: '#00fa9a', // 薄荷绿
        0.65: '#ffff00', // 柠檬黄
        0.80: '#ff8c00', // 橘黄
        1.00: '#ff4500'  // 橘红
      },
      maxOpacity: 0.75,
      minOpacity: 0.15,
      radius: 22, // 地面像素半径，可动态算
      blur: 0.9,
    }
    heatLayer.updateHeatmap(option) */
  }
  return heatLayer
}
