/* 读取 OSM3dInfos 数据方法
  type OSMRecord = Record<string, Record<string, unknown>>
  const dataset: OSMRecord = JSON.parse(localStorage.getItem('OSM3dInfos') || '{}')
*/

import * as Cesium from 'cesium';

export function setupPickAndStore(viewer: Cesium.Viewer) {
  type OSMRecord = Record<string, Record<string, unknown>>;
  //读取本地存储的featureIds 没有的话就空数组
  const dataset: OSMRecord = JSON.parse(
    localStorage.getItem('OSM3dInfos') || '{}'
  );
  /* const arr = JSON.parse(localStorage.getItem('infos') || '[]')
  const records = arr.map(info => JSON.parse(info)) */

  viewer.screenSpaceEventHandler.setInputAction((click: any) => {
    //批量获取屏幕里面的feature
    const { clientWidth, clientHeight } = viewer.canvas;
    const features = viewer.scene.drillPick(
      click.position,
      1000,
      clientWidth,
      clientHeight
    );
    // const features = viewer.scene.drillPick(click.position, 1, 100, 100)
    console.log('点击的元素', features);

    //循环features 提取有效信息 插入
    features?.forEach((f) => {
      // if (!(f instanceof Cesium.Cesium3DTileset)) return
      if (f instanceof Cesium.Cesium3DTileFeature) {
        const elementId = f.getProperty('elementId') as string | number;
        console.log('elementId', elementId);

        if (!elementId) return;
        //第一次遇见该elementId（第一次遇见这个元素） 就初始化一个空对象
        if (!dataset[elementId]) dataset[elementId] = {};
        //写入关心的属性
        const infoKeys = [
          'elementType',
          'cesium#estimatedHeight',
          'cesium#longitude',
          'cesium#latitude',
          'building',
          'name',
        ];
        //写入数据集
        infoKeys.forEach((key) => {
          dataset[elementId][key] = f.getProperty(key);
          // console.log('f.getProperty(key)', f.getProperty(key));
        });
        //完成就染色
        f.color = Cesium.Color.YELLOW;
      }
    });
    //写入本地
    localStorage.setItem('OSM3dInfos', JSON.stringify(dataset));
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  return dataset;
}
