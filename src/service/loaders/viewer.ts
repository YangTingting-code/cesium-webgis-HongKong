import * as Cesium from 'cesium';
import '@/assets/Widgets/widgets.css';

import {
  outlinePolygon,
  area,
  createLine3D,
  cartographic,
} from '../../data/region/HKBoundary';
import { drawPolygon } from '@/service/PolygonService'
import { PolygonCenter } from '@/utils/geo/getFeaturesCenter';

window.CESIUM_BASE_URL = '/';

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUMION_TOKEN

export async function createViewer(container: string | HTMLElement) {
  const viewer = new Cesium.Viewer(container, {
    terrain: Cesium.Terrain.fromWorldTerrain(),
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

  viewer.entities.add(area);
  const line3D = await createLine3D(cartographic);
  viewer.entities.add(line3D);
  await drawPolygon(viewer)

  const center = PolygonCenter(outlinePolygon);

  viewer.camera.setView({
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
  });
  //空间查询高亮建筑

  return viewer;
}


