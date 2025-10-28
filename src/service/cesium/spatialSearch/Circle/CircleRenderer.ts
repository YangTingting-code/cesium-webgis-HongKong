// CircleRenderer.ts
import * as Cesium from 'cesium';
import DynamicPopup from '@/service/cesium/spatialSearch/DynamicPopup';
import { ref, markRaw, type Reactive, type Ref } from 'vue';
import type { ChartData } from './ChartDataManager';

export class CircleRenderer {
  popupInstances: Record<string, DynamicPopup> = {};

  renderEntities(
    viewer: Cesium.Viewer,
    ids: { pointEntityId: string; circleEntityId: string; pinEntityId: string },
    pos: { lng: number; lat: number; h: number },
    radius: Ref<number>
  ) {
    const { pointEntityId, circleEntityId, pinEntityId } = ids;
    const { lng, lat, h } = pos;
    viewer.entities.add(
      new Cesium.Entity({
        /* point entity */ id: pointEntityId,
        //笛卡尔3
        position: Cesium.Cartesian3.fromDegrees(lng, lat, h + 10), ////也可以写成 cartesian,
        point: {
          color: Cesium.Color.ORANGERED,
          pixelSize: 12,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      })
    );
    viewer.entities.add(
      new Cesium.Entity({
        /* circle entity */ id: circleEntityId,
        position: Cesium.Cartesian3.fromDegrees(lng, lat, h),
        ellipse: {
          semiMajorAxis: new Cesium.CallbackProperty(() => radius.value, false),
          semiMinorAxis: new Cesium.CallbackProperty(() => radius.value, false),
          material: Cesium.Color.ORANGE.withAlpha(0.25),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      })
    );
    viewer.entities.add(
      new Cesium.Entity({
        /* pin entity */ id: pinEntityId,
        position: Cesium.Cartesian3.fromDegrees(lng, lat, h),
        billboard: {
          image: new Cesium.PinBuilder()
            .fromColor(Cesium.Color.ROYALBLUE, 40)
            .toDataURL(),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY, // 超过这个距离就不受深度测试影响
        },
      })
    );
  }

  renderPopup(
    viewer: Cesium.Viewer,
    popupId: string,
    pinEntityId: string,
    chartData: Reactive<ChartData[]>,
    onDelete: () => void
  ) {
    const popup = markRaw(
      new DynamicPopup({
        id: popupId,
        title: '区域功能结构图',
        viewer,
        entityId: pinEntityId,
        chartData,
        showRef: ref(true),
        onDelete,
      })
    );

    this.popupInstances[pinEntityId] = popup;
  }

  destroyEntities(
    viewer: Cesium.Viewer,
    ids: { pointEntityId: string; circleEntityId: string; pinEntityId: string }
  ) {
    viewer.entities.removeById(ids.pointEntityId);
    viewer.entities.removeById(ids.circleEntityId);
    viewer.entities.removeById(ids.pinEntityId);
  }

  destroyPopup(pinEntityId: string) {
    this.popupInstances[pinEntityId]?.destroy();
    delete this.popupInstances[pinEntityId];
  }
}
