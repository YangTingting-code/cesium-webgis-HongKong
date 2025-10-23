import * as Cesium from 'cesium';
import '@/assets/Widgets/widgets.css';
import { terrainProvider, standard_satellite } from '@/data/layersData'

window.CESIUM_BASE_URL = '/';

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUMION_TOKEN_NEW
// const terrainProvider = new Cesium.CesiumTerrainProvider('https://data.mars3d.cn/terrain')

export async function createViewer(container: string | HTMLElement) {
  const viewer = new Cesium.Viewer(container, {
    // terrain: Cesium.Terrain.fromWorldTerrain(),
    terrainProvider: terrainProvider,
    baseLayer: new Cesium.ImageryLayer(standard_satellite),
    baseLayerPicker: false,
    timeline: true, //显示时间轴
    animation: true, //显示播放控件
    infoBox: false, //是否显示信息框
    sceneModePicker: false,
    homeButton: false,
    geocoder: false,
    navigationHelpButton: false
  });

  (viewer.timeline as any).makeLabel = function (time: any) {
    return Cesium.JulianDate.toDate(time).toLocaleString('zh-CN', {
      hour12: false,
      timeZone: 'Asia/Shanghai'
    })
  }
  viewer.animation.viewModel.timeFormatter = function (date: Cesium.JulianDate, viewModel: any) {
    return Cesium.JulianDate.toDate(date).toLocaleString('zh-CN', {
      hour12: false,
      timeZone: 'Asia/Shanghai'
    })
  }
  // 隐藏版权信息
  viewer._cesiumWidget._creditContainer.style.display = "none"; //存在

  viewer.clock.shouldAnimate = true
  return viewer;
}


