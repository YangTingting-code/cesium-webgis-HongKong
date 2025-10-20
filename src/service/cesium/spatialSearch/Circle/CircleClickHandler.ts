// CircleClickHandler.ts
import * as Cesium from 'cesium';
import { correctPosition } from '@/utils/toolbar/spatialSearch/correctPosition';

export class CircleClickHandler {
  private handler: Cesium.ScreenSpaceEventHandler | null = null;

  bind(
    viewer: Cesium.Viewer,
    onClick: (
      lng: number,
      lat: number,
      h: number,
      corrected: Cesium.Cartesian2
    ) => void
  ) {
    //onClick是外部传入的回调函数
    this.handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    this.handler.setInputAction(
      (click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const corrected = correctPosition(viewer, click); //修正屏幕坐标
        const cartesian = viewer.scene.pickPosition(corrected);
        if (!cartesian) return; //如果没有选中位置直接返回
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        const lng = Cesium.Math.toDegrees(cartographic.longitude);
        const lat = Cesium.Math.toDegrees(cartographic.latitude);
        const h = cartographic.height;
        onClick(lng, lat, h, corrected);
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    );
  }

  unbind() {
    this.handler?.destroy();
    this.handler = null;
  }

  // === 新增语义方法 ===
}
