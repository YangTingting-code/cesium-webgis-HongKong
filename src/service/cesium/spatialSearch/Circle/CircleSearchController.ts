// CircleManager.ts
import * as Cesium from 'cesium';
import { type Ref } from 'vue';
import { SearchCircleDataManager } from './SearchCircleData';
import { ChartDataManager } from './ChartDataManager';
import { CircleRenderer } from './CircleRenderer';
import { CircleClickHandler } from './CircleClickHandler';
import { CircleMoveHandler } from './CircleMoveHandler';

export class CircleSearchController {
  dataMgr = new SearchCircleDataManager();
  chartMgr = new ChartDataManager();
  renderer = new CircleRenderer();
  clickHandler = new CircleClickHandler();
  moveHandler = new CircleMoveHandler();
  init(
    viewer: Cesium.Viewer,
    radius: Ref<number>,
    onDelete: (pinEntityId: string, lng: number, lat: number) => void
  ): boolean {
    // 1. 恢复实体、弹窗
    const allCircles = this.dataMgr.getAll();
    if (Object.keys(allCircles).length > 0) {
      //说明本地存储了数据 需要回显
      for (const key in allCircles) {
        const { ids, position } = allCircles[key];
        radius.value = Number(key.split(',')[1]);
        // (a) 重新渲染点/圆/图钉
        this.renderer.renderEntities(
          viewer,
          {
            pointEntityId: ids.pointEntityId,
            circleEntityId: ids.circleEntityId,
            pinEntityId: ids.pinEntityId, // 用 popupId 当 pinEntityId 保存了？
          },
          position,
          radius
        );

        // (b) 找到图表数据并恢复弹窗
        if (this.chartMgr.data[ids.pinEntityId]) {
          this.renderer.renderPopup(
            viewer,
            ids.popupId,
            ids.pinEntityId,
            this.chartMgr.data[ids.pinEntityId],
            () => onDelete(ids.pinEntityId, position.lng, position.lat)
          ); //调用的是removeCircle函数
        }
      }
      return true;
    }
    return false;
  }

  clear(viewer: Cesium.Viewer) {
    const entityData = this.dataMgr.getAll(); //清除本地搜索圈的数据
    Object.values(entityData).forEach(item => { //按照id删除entity
      viewer.entities.removeById(item.ids.pointEntityId)
      viewer.entities.removeById(item.ids.circleEntityId)
      viewer.entities.removeById(item.ids.pinEntityId)
    })
    this.dataMgr.clear() //清除本地searchDataManage
    this.chartMgr.clear(); //清除本地图表数据
    // viewer.entities.removeAll(); //清除所有的entity
    Object.values(this.renderer.popupInstances).forEach((p) => p.destroy()); //清除所有的弹窗实例
  }

  clearById(viewer: Cesium.Viewer, pinEntityId: string, radius: number) {
    // 移除数据 + 弹窗
    this.renderer.destroyPopup(pinEntityId); //移除弹窗
    this.renderer.destroyEntities(
      viewer,
      this.dataMgr.getAll()[`${pinEntityId},${radius}`].ids
    );
    this.dataMgr.remove(pinEntityId, radius); //移除本地的搜索圈数据
    this.chartMgr.remove(pinEntityId); //移除本地图表数据
  }
}
