//天地图矢量
const tdt_key = import.meta.env.VITE_TIANDITU_TOKEN;
import * as Cesium from 'cesium';

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUMION_TOKEN
export const Cesium_Ion = Cesium.ImageryLayer.fromWorldImagery({})

export const img_tdt = new Cesium.WebMapTileServiceImageryProvider({
  url: 'http://{s}.tianditu.com/vec_w/wmts?tk=' + tdt_key,
  layer: 'vec',
  style: 'default',
  tileMatrixSetID: 'w',
  format: 'tiles',
  maximumLevel: 18,
  subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'],
});
export const img_cia = new Cesium.WebMapTileServiceImageryProvider({
  url: 'http://{s}.tianditu.gov.cn/cva_w/wmts?tk=' + tdt_key,
  layer: 'cva',
  style: 'default',
  tileMatrixSetID: 'w',
  format: 'tiles',
  maximumLevel: 18,
  subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'],
});

//osm矢量
const osm = new Cesium.OpenStreetMapImageryProvider({
  url: 'https://tile.openstreetmap.org/'
})

// mapbox 栅格影像底图 
export const mapbox_terrain_v2 = new Cesium.MapboxImageryProvider({
  mapId: 'mapbox.mapbox-terrain-v2',
  accessToken: import.meta.env.VITE_MAPBOX_TOKEN
})
//设置mapbox矢量底图
export const mapbox_navigation_night = new Cesium.MapboxStyleImageryProvider({
  styleId: 'navigation-night-v1',
  accessToken: import.meta.env.VITE_MAPBOX_TOKEN,
});
export const mapbox_navigation_day = new Cesium.MapboxStyleImageryProvider({
  styleId: 'navigation-day-v1',
  accessToken: import.meta.env.VITE_MAPBOX_TOKEN,
});
export const mapbox_streets = new Cesium.MapboxStyleImageryProvider({
  styleId: 'streets-v12',
  accessToken: import.meta.env.VITE_MAPBOX_TOKEN,
});
export const mapbox_outdoors = new Cesium.MapboxStyleImageryProvider({
  styleId: 'outdoors-v12',
  accessToken: import.meta.env.VITE_MAPBOX_TOKEN,
});
export const mapbox_light = new Cesium.MapboxStyleImageryProvider({
  styleId: 'light-v11',
  accessToken: import.meta.env.VITE_MAPBOX_TOKEN,
});
export const mapbox_dark = new Cesium.MapboxStyleImageryProvider({
  styleId: 'dark-v11',
  accessToken: import.meta.env.VITE_MAPBOX_TOKEN,
});
// 1. 先把所有 png 变成真正的 URL
const pics = import.meta.glob('@/assets/mapboxLayersPic/*.png', {
  eager: true,
  import: 'default',
})

const picCesIon = import.meta.glob('@/assets/tilesetPic/*.png', {
  eager: true,
  import: 'default',
});

// 2. 组装成自己需要的结构
export const mapboxPicUrl: Record<string, string> = {
  mapbox_navigation_night: pics[
    '/src/assets/mapboxLayersPic/mapbox-navigation-night.png'
  ] as string,
  mapbox_navigation_day: pics[
    '/src/assets/mapboxLayersPic/mapbox-navigation-day.png'
  ] as string,
  mapbox_streets: pics[
    '/src/assets/mapboxLayersPic/mapbox-streets.png'
  ] as string,
  mapbox_outdoors: pics[
    '/src/assets/mapboxLayersPic/mapbox-outdoors.png'
  ] as string,
  mapbox_light: pics['/src/assets/mapboxLayersPic/mapbox-light.png'] as string,
  mapbox_dark: pics['/src/assets/mapboxLayersPic/mapbox-dark.png'] as string,
};
export const mapstyleDictionary: Record<string, Cesium.ImageryProvider | Cesium.ImageryLayer> = {
  'mapbox_navigation_night': mapbox_navigation_night,
  'mapbox_navigation_day': mapbox_navigation_day,
  'mapbox_streets': mapbox_streets,
  'mapbox_outdoors': mapbox_outdoors,
  'mapbox_light': mapbox_light,
  'mapbox_dark': mapbox_dark,
  'Cesium_Ion': Cesium_Ion
}

export const tilesetPicUrl: Record<string, string> = {
  Cesium_Ion: picCesIon[
    '/src/assets/tilesetPic/Cesium_Ion.png'
  ] as string
}

//高德矢量，高德位置偏移
export const gaode = new Cesium.UrlTemplateImageryProvider({
  url: 'http://webst02.is.autonavi.com/appmaptile?style=7&x={x}&y={y}&z={z}',
});

export const mapboxData = [
  {
    mapboxId: 'mapbox_navigation_night',
    description: '夜间导航',
    url: mapboxPicUrl.mapbox_navigation_night,
  },
  {
    mapboxId: 'mapbox_navigation_day',
    description: '日间导航',
    url: mapboxPicUrl.mapbox_navigation_day,
  },
  {
    mapboxId: 'mapbox_streets',
    description: '街道',
    url: mapboxPicUrl.mapbox_streets,
  },
  {
    mapboxId: 'mapbox_outdoors',
    description: '户外',
    url: mapboxPicUrl.mapbox_outdoors,
  },
  {
    mapboxId: 'mapbox_light',
    description: '浅色系',
    url: mapboxPicUrl.mapbox_light,
  },
  {
    mapboxId: 'mapbox_dark',
    description: '深色系',
    url: mapboxPicUrl.mapbox_dark,
  },
];

export const tilesetData = [
  {
    tilesetId: 'Cesium_Ion',
    description: 'Cesium Ion',
    url: tilesetPicUrl.Cesium_Ion
  }
]
export const getStyleUrlById: Record<string, string> = {
  mapbox_navigation_night: 'mapbox://styles/mapbox/navigation-night-v1',
  mapbox_navigation_day: 'mapbox://styles/mapbox/navigation-day-v1',
  mapbox_streets: 'mapbox://styles/mapbox/streets-v12',
  mapbox_outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  mapbox_light: 'mapbox://styles/mapbox/light-v11',
  mapbox_dark: 'mapbox://styles/mapbox/dark-v11',
}

// 配色定义代码
export const pathColorScheme: Record<string, {
  gradient: [string, string],
  glow: string
}> = {
  mapbox_navigation_night: {
    gradient: ['#00ffff', '#ff6ec7'],
    glow: '#00eaff'
  },
  mapbox_navigation_day: {
    gradient: ['#0091EA', '#651FFF'],
    glow: '#7C4DFF'
  },
  mapbox_streets: {
    gradient: ['#ff9500', '#ff2d55'],
    glow: '#ffcc00'
  },
  mapbox_outdoors: {
    gradient: ['#4CAF50', '#2196F3'],
    glow: '#81C784'
  },
  mapbox_light: {
    gradient: ['#3F51B5', '#E91E63'],
    glow: '#9FA8DA'
  },
  mapbox_dark: {
    gradient: ['#00E5FF', '#FF4081'],
    glow: '#26C6DA'
  }
}

// 起点 / 终点配色表，和 pathColorScheme 一一对应
export const pointColorScheme: Record<string, {
  start: string
  end: string
}> = {
  mapbox_navigation_night: {
    start: '#00d2ff', // 浅青蓝，呼应轨迹线起点 #00ffff
    end: '#ff66b3',   // 粉紫，呼应轨迹终点 #ff6ec7
  },
  mapbox_navigation_day: {
    start: '#0062ff', // 蓝偏青一点，区分导航道路绿色
    end: '#a259ff',   // 紫偏亮，和轨迹末尾协调
  },
  mapbox_streets: {
    start: '#ffb700', // 明亮橙黄
    end: '#ff375f',   // 鲜艳红粉
  },
  mapbox_outdoors: {
    start: '#3fc35f', // 清新的绿
    end: '#3388ff',   // 天蓝
  },
  mapbox_light: {
    start: '#536DFE', // 靛蓝
    end: '#EC407A',   // 玫红
  },
  mapbox_dark: {
    start: '#00E5FF', // 青蓝
    end: '#FF4081',   // 粉红
  }
}


export function getPathVisualScheme(styleId: keyof typeof pathColorScheme) {
  const path = pathColorScheme[styleId]
  const point = pointColorScheme[styleId]
  if (!path || !point) throw new Error(`未定义样式配色: ${styleId}`)

  return {
    gradientFrom: path.gradient[0],
    gradientTo: path.gradient[1],
    glowColor: path.glow,
    startColor: point.start,
    endColor: point.end,
  }
}

//栅格影像

