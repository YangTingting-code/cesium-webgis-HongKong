import * as Cesium from 'cesium';
import { correctPosition } from '@/utils/toolbar/spatialSearch/correctPosition';

export class CircleMoveHandler {
  private handler: Cesium.ScreenSpaceEventHandler | null = null;
  private lastPos: Cesium.Cartesian2 | null = null; // 保存最新位置
  private ticking = false; // rAF 是否在跑
  private rafId: number | null = null; // 保存 rAF ID


  bindMove(
    viewer: Cesium.Viewer,
    onMove: (corrected: Cesium.Cartesian2) => void
  ) {
    this.handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);

    this.handler.setInputAction((movement: any) => {
      // 保存位置，但不立即调用回调
      this.lastPos = correctPosition(viewer, movement.endPosition);

      if (!this.ticking) {
        this.ticking = true;
        this.rafId = requestAnimationFrame(() => {
          if (this.lastPos) {
            onMove(this.lastPos);
          }
          this.ticking = false; // 本帧执行完，允许下一次
          this.rafId = null; //清空 防止复用冲突
        });
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }

  /** 解绑事件 */
  unbind() {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId); // 真正取消
      this.rafId = null;
    }
    this.handler?.destroy();
    this.handler = null;
  }
}
