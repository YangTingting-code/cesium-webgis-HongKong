//天地图矢量
const tdt_key = import.meta.env.VITE_TIANDITU_TOKEN;
import * as Cesium from 'cesium';

// Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUMION_TOKEN_NEW
// export const Cesium_Ion = Cesium.ImageryLayer.fromWorldImagery({})


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
// const osm = new Cesium.OpenStreetMapImageryProvider({
//   url: 'https://tile.openstreetmap.org/'
// })

// mapbox 栅格影像底图 
export const mapbox_terrain_v2 = new Cesium.MapboxImageryProvider({
  mapId: 'mapbox.mapbox-terrain-v2',
  accessToken: import.meta.env.VITE_MAPBOX_TOKEN
})
// mapbox://styles/mapbox/standard-satellite
export const standard_satellite = new Cesium.MapboxImageryProvider({
  mapId: 'mapbox.satellite',
  accessToken: import.meta.env.VITE_MAPBOX_TOKEN
})


export const terrainProvider = await Cesium.CesiumTerrainProvider.fromUrl(
  'https://data.mars3d.cn/terrain'  // Mars3D 免费地形源（国内可用）
)

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
  'mapbox_terrain_v2': mapbox_terrain_v2,
  'standard_satellite': standard_satellite,
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

//二维底图
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

export const buildingShaderColorScheme: Record<string, {
  base: [number, number, number],
  glow: [number, number, number]
}> = {
  mapbox_navigation_night: {
    base: [0.05, 0.1, 0.25], // 深蓝
    glow: [0.0, 0.9, 1.0],   // 青绿
  },
  mapbox_navigation_day: {
    base: [0.3, 0.5, 0.9],
    glow: [0.6, 0.3, 1.0],
  },
  mapbox_streets: {
    base: [0.9, 0.6, 0.2],
    glow: [1.0, 0.4, 0.5],
  },
  mapbox_outdoors: {
    base: [0.3, 0.6, 0.3],
    glow: [0.0, 0.8, 0.8],
  },
  mapbox_light: {
    base: [0.85, 0.85, 0.85],
    glow: [1.0, 0.5, 0.8],
  },
  mapbox_dark: {
    base: [0.1, 0.1, 0.2],
    glow: [0.0, 0.8, 1.0],
  },
};


export const buildingShaderColorSchemeGrouped = {
  mapbox_navigation_night: {
    baseColors: [
      //表示 vec3(0.1, 0.2, 0.4) js里vec3不存在 就用数组表示 然后用Cesium.Car3作为容器成为三维向量
      [0.1, 0.2, 0.4],  // 深蓝
      [0.25, 0.1, 0.4], // 紫蓝
      [0.05, 0.25, 0.35], // 青灰
      [0.15, 0.15, 0.45], // 静夜紫
    ],
    // glowColor: [0.0, 0.9, 1.0], // 青光
    glowColor: [0.8, 0.6, 1.0], // 轻微紫光
  },
  mapbox_navigation_day: {
    baseColors: [
      [0.5, 0.6, 0.9], // 天蓝
      [0.4, 0.5, 0.8], // 灰蓝
      [0.7, 0.7, 0.9], // 淡蓝白
      [0.6, 0.65, 0.85], // 雾蓝
    ],
    glowColor: [0.6, 0.3, 1.0], // 紫光
  },
  mapbox_streets: {
    baseColors: [
      [0.9, 0.7, 0.3], // 暖黄
      [0.95, 0.5, 0.25], // 橙
      [0.8, 0.6, 0.4], // 砖色
      [1.0, 0.8, 0.5], // 金黄
    ],
    glowColor: [1.0, 0.4, 0.5], // 橙红光
  },
  mapbox_outdoors: {
    baseColors: [
      [0.3, 0.6, 0.4], // 草绿
      [0.25, 0.7, 0.5], // 青绿
      [0.4, 0.5, 0.3], // 苔藓绿
      [0.35, 0.65, 0.45], // 森林绿
    ],
    glowColor: [0.0, 0.8, 0.8], // 蓝绿光
  },
  mapbox_light: {
    baseColors: [
      [0.6, 0.7, 0.9], // 淡蓝灰
      [0.7, 0.6, 0.8], // 淡紫灰
      [0.55, 0.65, 0.8], // 雾蓝
      [0.65, 0.7, 0.85], // 银蓝
    ],
    glowColor: [0.5, 0.6, 1.0], // 柔和蓝光，略带冷色气氛
  },

  mapbox_dark: {
    baseColors: [
      [0.25, 0.35, 0.5], // 深钢蓝
      [0.3, 0.45, 0.6],  // 蓝灰
      [0.4, 0.3, 0.6],   // 暗紫蓝
      [0.35, 0.5, 0.7],  // 青蓝亮一点
    ],
    glowColor: [1.0, 0.7, 0.2], // 金橙光，暖色与黑底对比强烈
  },
};




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

