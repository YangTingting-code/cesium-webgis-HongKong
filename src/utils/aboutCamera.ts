import { type Ref } from 'vue';
import { Viewer, Cartesian3, Math, HeadingPitchRange, Rectangle } from 'cesium';
export function flyById(targetId: string | number, viewer: Viewer) {
  // 1.从本地数据集找这栋楼
  const dataset = JSON.parse(localStorage.getItem('OSM3dInfos') || '{}');
  const info = dataset[targetId];
  if (info) {
    //2.取坐标
    const lng = +info['cesium#longitude'];
    const lat = +info['cesium#latitude'];
    const alt = +info['cesium#estimatedHeight'] + 50; //上空50m
    //地面中心
    const center = Cartesian3.fromDegrees(lng, lat, 0);
    //3.飞过去
    /* viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(lng, lat, height),
      orientation: {
        heading: 0,
        pitch: Math.toRadians(-45),
        roll: 0
      },
      duration: 1.5
    }) */

    //3.让相机“看向”这一点
    const heading = Math.toRadians(0);
    const pitch = Math.toRadians(-45);
    const range = 150;
    const offset = new HeadingPitchRange(heading, pitch, range);
    viewer.camera.lookAt(
      center, //中心点
      offset //偏移
    );
  }
}
interface cameraInfo {
  heading: number;
  pitch: number;
  roll: number;
}
// 获取相机位置，姿态等
export function getcameraPosInfo(viewer: Viewer) {
  // 获取 相机姿态信息
  const heading = viewer.scene.camera.heading;
  const pitch = viewer.scene.camera.pitch;
  const roll = viewer.scene.camera.roll;
  const cameraInfo = { heading, pitch, roll };
  // 获取位置 wgs84的地心坐标系，x,y坐标值以弧度来表示
  // const position = viewer.scene.camera.positionCartographic //with longitude and latitude expressed in radians and height in meters.
  //以下方式也可以获取相机位置只是返回的坐标系不一样
  var position = viewer.scene.camera.position; //cartesian3 空间直角坐标系
  // var ellipsoid = scene.globe.ellipsoid;
  // var position =ellipsoid.cartesianToCartographic(viewer.scene.camera.position)//
  // 弧度转经纬度
  // const longitude = Math.toDegrees(position.longitude).toFixed(6)
  // const latitude = Math.toDegrees(position.latitude).toFixed(6)
  // const height = position.height //单位就是m
  return { destination: position, orientation: cameraInfo };
}

export function getcameraPosGeoInfo(viewer: Viewer) {
  // 获取 相机姿态信息
  const head = viewer.scene.camera.heading;
  const pitch = viewer.scene.camera.pitch;
  const roll = viewer.scene.camera.roll;
  const info = { head: head, pitch: pitch, roll: roll };
  // 获取位置 wgs84的地心坐标系，x,y坐标值以弧度来表示
  const position = viewer.scene.camera.positionCartographic; //with longitude and latitude expressed in radians and height in meters.
  //以下方式也可以获取相机位置只是返回的坐标系不一样
  // var position = viewer.scene.camera.position //cartesian3 空间直角坐标系
  // var ellipsoid = scene.globe.ellipsoid;
  // var position =ellipsoid.cartesianToCartographic(viewer.scene.camera.position)//
  // 弧度转经纬度
  const longitude = Math.toDegrees(position.longitude).toFixed(6);
  const latitude = Math.toDegrees(position.latitude).toFixed(6);
  const height = position.height; //单位就是m
  return { lng: longitude, lat: latitude, h: height, mat: info };
}

export function setCameraPosition(
  viewer: Viewer,
  destination: Cartesian3,
  orientation: cameraInfo
) {
  viewer.camera.setView({
    destination,
    orientation,
  });
}

let beforeUnloadHandler: ((this: Window, ev: BeforeUnloadEvent) => any) | null = null
// aboutCamera.ts 里再加一个 在网页刷新之前保存相机位置
export function saveCameraPos(viewer: Viewer, isRegister: Ref<boolean>) {
  if (isRegister.value) return; //如果已经注册过就马上返回
  beforeUnloadHandler = () => {
    const pos = getcameraPosInfo(viewer); // 你已经有这个函数
    sessionStorage.setItem('cameraBeforeReload', JSON.stringify(pos));
    // localStorage.setItem('cameraBeforeReload', JSON.stringify(pos));
  }
  window.addEventListener('beforeunload', beforeUnloadHandler);
  // isRegister.value = true
}

// 移除监听呢？
export function removeCameraListener(isRegister: Ref<boolean>) {
  if (beforeUnloadHandler) {
    window.removeEventListener('beforeunload', beforeUnloadHandler)
    beforeUnloadHandler = null
    isRegister.value = false
  }
}

export function position2bbox(bbox: any, viewer: Viewer) { //左下，右上  [west, south, east, north]
  const destination = Rectangle.fromDegrees(...bbox)
  viewer.camera.flyTo({
    destination,
    orientation: {
      heading: 0.0,
      pitch: -Math.PI_OVER_TWO,
      roll: 0.0
    }
  })
}
