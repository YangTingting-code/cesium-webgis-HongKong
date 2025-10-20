import { createHighlightManager } from '@/views/cesium/interactions/spatialSearch/utils/manageOSMHighlight';
import * as Cesium from 'cesium';
import {
  queryOSM,
  updateChartDataAndHighlight,
} from '@/views/cesium/interactions/spatialSearch/raw/OSMBuilding';
import DynamicPopup from '@/service/cesium/spatialSearch/DynamicPopup';
import { reactive, ref } from 'vue';
/* interface BuildingProfile {
  id: number; // OSM id
  buildingType: string; // building tag
  geometry: Array<{ lat: number; lng: number }>;
  functionNodes: FunctionNode[];
  tag: Record<string, unknown>;
  commercialScore?: number; // 可选：商业活跃度
  bbox: { maxlat: number; maxlon: number, minlat: number; minlon: number; }; // 边界盒
} */
export interface SearchCircle {
  ids: {
    pointEntityId: string;
    circleEntityId: string;
    pinEntityId: string;
    popupId: string;
  };
  position: {
    lng: number;
    lat: number;
    h: number;
  };
  radius: number;
}

export class SearchCircleService {
  private viewer: Cesium.Viewer;
  private tileset: Cesium.Cesium3DTileset;
  private highlightMgr: ReturnType<typeof createHighlightManager>;
  private circles: Record<string, SearchCircle> = reactive({});
  private popups: Record<string, DynamicPopup> = reactive({});
  private chartData: Record<string, { value: number; name: string }[]> =
    reactive({});
  private index = 0;
  //构造器给私有变量赋值？
  constructor(viewer: Cesium.Viewer, tileset: Cesium.Cesium3DTileset) {
    this.viewer = viewer;
    this.tileset = tileset;
    this.highlightMgr = createHighlightManager(tileset);
    this.restore();
  }
  /**1.新增一个圈（外部只调这一行） */
  async add(lng: number, lat: number, radius: number) {
    const { ids, position } = this.renderEntities(lng, lat);
    await queryOSM(
      lng,
      lat,
      radius,
      ids.pinEntityId,
      this.chartData,
      this.highlightMgr
    );
    this.renderPopup(
      ids.popupId,
      ids.pinEntityId,
      this.chartData[ids.pinEntityId]
    );
    this.circles[ids.pinEntityId] = { ids, position, radius };
    this.save();
  }
  /**2.删除一个圆 */
  remove(pinEntityId: string) {
    const c = this.circles[pinEntityId];
    if (!c) return;
    //根据id删除entity
    Object.values(c.ids).forEach((id) => this.viewer.entities.removeById(id));
    //删除变量里面对应的记录
    delete this.popups[pinEntityId];
    delete this.circles[pinEntityId];
    delete this.chartData[pinEntityId];
    //高亮管理器清除对应的高亮
    this.highlightMgr.removeCategoryIds(pinEntityId);
    this.save();
  }
  /**3.批量更新半径 */
  /* updateRadius(newRadius: number) {
    Object.keys(this.circles).forEach(async pinEntityId => {
      const { position } = this.circles[pinEntityId]
      //从缓存里面拿数据了吗？
      await queryOSM(position.lng, position.lat, newRadius, pinEntityId, this.chartData, this.highlightMgr)
      this.save()
    })
  } */
  removeAll() {
    Object.keys(this.circles).forEach((pinEntityId) => {
      this.remove(pinEntityId);
    });
  }
  /** 恢复本地数据并回显，返回是否有数据 */
  restore(): boolean {
    const c = JSON.parse(localStorage.getItem('searchCircles') || '{}');
    Object.assign(this.circles, c);
    Object.assign(
      this.chartData,
      JSON.parse(localStorage.getItem('chartDataManage') || '{}')
    );
    // 回显实体 & 高亮
    Object.keys(this.circles).forEach((id) => this.redraw(id));
    return Object.keys(this.circles).length > 0;
  }

  /** 拿第一个圆的半径给滑块做初始值 */
  getFirstRadius(): number | null {
    const first = Object.values(this.circles)[0];
    return first ? first.radius : null;
  }

  /** 3. 批量更新半径（滑块用） */
  async updateRadius(newRadius: number) {
    // 1. 先把所有圆的半径字段改掉
    Object.keys(this.circles).forEach(
      (id) => (this.circles[id].radius = newRadius)
    );

    // 2. 重新查询建筑（缓存会生效）
    await Promise.all(
      Object.keys(this.circles).map(async (pinEntityId) => {
        const { position } = this.circles[pinEntityId];
        await queryOSM(
          position.lng,
          position.lat,
          newRadius,
          pinEntityId,
          this.chartData,
          this.highlightMgr
        );
      })
    );

    // 3. 关键：让 Cesium 的 CallbackProperty 立即感知新值
    //    由于我们用的是 CallbackProperty(() => radius, false)
    //    它自动读取 this.circles[id].radius，所以这里不用手动改 ellipse；
    //    但为了保险，可以触发一次重新渲染（可选）
    this.viewer.scene.requestRender();

    this.save();
  }

  // ----- 以下全是私有赋值 ----- //
  private renderEntities(lng: number, lat: number) {
    const h = 0;
    const point = this.viewer.entities.add({
      id: `point-${this.index}`,
      position: Cesium.Cartesian3.fromDegrees(lng, lat, h + 10),
      point: {
        color: Cesium.Color.RED,
        pixelSize: 16,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });
    const circle = this.viewer.entities.add({
      id: `circle-${this.index}`,
      position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
      ellipse: {
        //  不要直接写 radius，而是读“未来会变”的字段
        semiMajorAxis: new Cesium.CallbackProperty(() => {
          // 从 this.circles 里实时拿最新半径
          const c = Object.values(this.circles).find(
            (v) => v.ids.circleEntityId === circle.id
          );
          return c ? c.radius : 0;
        }, false),
        semiMinorAxis: new Cesium.CallbackProperty(() => {
          const c = Object.values(this.circles).find(
            (v) => v.ids.circleEntityId === circle.id
          );
          return c ? c.radius : 0;
        }, false),
        material: Cesium.Color.ORANGE.withAlpha(0.25),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });
    const pin = this.viewer.entities.add({
      id: `circle-center-${this.index}`,
      position: Cesium.Cartesian3.fromDegrees(lng, lat, h),
      billboard: {
        image: new Cesium.PinBuilder()
          .fromColor(Cesium.Color.ROYALBLUE, 60)
          .toDataURL(),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    this.index++;
    return {
      ids: {
        pointEntityId: point.id!,
        circleEntityId: circle.id!,
        pinEntityId: pin.id!,
        popupId: `popup-${pin.id!}`,
      },
      position: { lng, lat, h },
    };
  }
  private renderPopup(
    popupId: string,
    pinEntityId: string,
    chartData: { value: number; name: string }[]
  ) {
    const popup = new DynamicPopup({
      id: popupId,
      title: '区域功能结构图',
      viewer: this.viewer,
      entityId: pinEntityId,
      showRef: ref(true),
      chartData,
      onDelete: () => this.remove(pinEntityId),
    });
    this.popups[pinEntityId] = popup;
  }
  private save() {
    localStorage.setItem('searchCircles', JSON.stringify(this.circles));
    localStorage.setItem('chartDataManage', JSON.stringify(this.chartData));
  }
}
