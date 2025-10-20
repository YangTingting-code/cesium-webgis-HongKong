//判断圆圈内的选中的要素是否含有商业建筑 commercial store supermarket
//1.先处理geojson数据 把里面的id和geometry提取出来？
import axios from 'axios';
import * as turf from '@turf/turf';
import type { Position } from '@/interface/globalInterface';
import * as Cesium from 'cesium';
import { toRaw } from 'vue';
interface searchResult {
  geometry: {
    coordinates: Position[][];
    type: 'Polygon';
  };
  id: number;
  properties: {
    BUILDINGSTRUCTUREID: number;
    [key: string]: unknown;
  };
  type: 'Feature';
}
export async function handleHKShangYe(
  searchResult: searchResult[],
  viewer: Cesium.Viewer
) {
  const res = await axios('/data/HK_Shang_Ye_Features.geojson');
  const features = res.data.features;
  // console.log('hhh')
  interface feature {
    properties: {
      BUILDINGSTRUCTUREID: number;
      [key: string]: unknown;
    };
    geometry: Record<string, unknown>;
  }
  interface HKShangYe {
    id: number;
    geometry: Record<string, unknown>;
  }

  const features_HK_ShangYe_IdGeometry: HKShangYe[] = JSON.parse(
    localStorage.getItem('features_HK_ShangYe_IdGeometry') || '[]'
  );
  const features_HK_ShangYe_Id: number[] = JSON.parse(
    localStorage.getItem('features_HK_ShangYe_Id') || '[]'
  );
  //如果第一次执行 没有存储过这个数据 就执行一次
  if (features_HK_ShangYe_IdGeometry.length < 1) {
    features.forEach((f: feature) => {
      const id: number = f.properties.BUILDINGSTRUCTUREID;
      const temp: HKShangYe = {
        id: id,
        geometry: f.geometry,
      };
      features_HK_ShangYe_IdGeometry.push(temp);
      features_HK_ShangYe_Id.push(id);
    });
    //存入本地
    localStorage.setItem(
      'features_HK_ShangYe_IdGeometry',
      JSON.stringify(features_HK_ShangYe_IdGeometry)
    );
    localStorage.setItem(
      'features_HK_ShangYe_Id',
      JSON.stringify(features_HK_ShangYe_Id)
    );
  }
  //Shang_Ye 建筑回显 高亮对应的osm building 1.准备对应的经纬度数组
  const lngLat_Shang_Ye: Position[] = [];
  searchResult.forEach((item) => {
    console.log('判断搜索范围是否商业？');
    if (features_HK_ShangYe_Id.includes(item.properties.BUILDINGSTRUCTUREID)) {
      console.log('item属于这个范围的商业建筑', item);
      //获取建筑经纬度坐标
      //Shang_Ye 建筑回显 高亮对应的osm building 2.turf计算面状经纬度
      const polygon = turf.polygon(item.geometry.coordinates);
      const centroid = turf.centroid(polygon);
      const lngLat: Position = [
        centroid.geometry.coordinates[0],
        centroid.geometry.coordinates[1],
      ];
      console.log('lngLat', lngLat);
      lngLat_Shang_Ye.push(lngLat);
    }
  });
  console.log('lngLat_Shang_Ye', lngLat_Shang_Ye);
  //每次点击都调用一次
  highlightOSMBuildingByLngLat(lngLat_Shang_Ye);
  // 根据搜集到的数据计算
  function highlightOSMBuildingByLngLat(lngLat_Shang_Ye: Position[]) {
    console.log('成功调用');
    if (lngLat_Shang_Ye.length > 0) {
      //kimi
      // 1. 创建高亮后处理
      /* if (!silhouette) {
      用pinia存储管理吧
        console.log('进来了！！');
        silhouette = Cesium.PostProcessStageLibrary.createSilhouetteStage();
        silhouette.uniforms.color = Cesium.Color.CYAN;
        silhouette.selected = [];
        viewer.scene.postProcessStages.add(silhouette);
      } */
      //2.经纬度坐标转换为屏幕坐标
      const windowPosArray: Cesium.Cartesian2[] = [];
      lngLat_Shang_Ye.forEach((lngLatPoint: Position) => {
        //2.1把经纬度转换为笛卡尔3
        const cartesion3 = Cesium.Cartesian3.fromDegrees(
          lngLatPoint[0],
          lngLatPoint[1]
        );
        //2.2利用Viewer.scene.cartesianToCanvasCoordinates（position， result） 输入car3返回car2结果
        /* const cartesian2 = viewer.scene.cartesianToCanvasCoordinates(cartesion3)
        console.log('cartesian2', cartesian2); */
        //2.2利用Cesium.SceneTransforms.worldToWindowCoordinates（scene,car3,result_car2） 输入car3返回浏览器 CSS 像素坐标（左上角原点，受 DPI / 浏览器缩放影响）
        const cartesian2 = Cesium.SceneTransforms.worldToWindowCoordinates(
          viewer.scene,
          cartesion3
        );
        /* 2.3屏幕坐标适配
        浏览器内部已经自动把 worldToWindowCoordinates 的结果映射到缩放后的视口，因此直接拿来用即可，不要再除以 scaleX / scaleY */
        if (cartesian2) windowPosArray.push(cartesian2);
      });
      // 3. drillPick 拾取

      console.log('windowPosArray', windowPosArray);
      //本次点击高亮个数
      let sum = 0;
      windowPosArray.forEach((windowPos, index) => {
        //一个坐标可以拾取到多个对象，对象有entity也有osmbuilding，有些osmbuilding能拾取到两个？ 有的坐标拾取不到对象？
        console.log(`第${index}次 windowPos`, windowPos);
        const pickedObjects = viewer.scene.drillPick(windowPos, 10);
        console.log(
          `第${index}次 pickedObjects，个数`,
          pickedObjects,
          pickedObjects.length
        );

        pickedObjects.forEach((item, idx) => {
          // 获取3dfeature 1.用 toRaw 脱 proxy
          const raw = toRaw(item);
          console.log(`第${index}次 第${idx}个raw`, raw);
          //获取3dfeature 2.找出是3dfeature的
          if (raw instanceof Cesium.Cesium3DTileFeature) {
            console.log('raw instanceof Cesium.Cesium3DTileFeature', raw);
            // osm3DFeatures.push(raw)
            raw.color = Cesium.Color.RED;
            sum++;
          }
        });
        /* console.log("tileset", tileset)
        const osmFeature = pickedObjects.find(
          (p) => p.primitive === tileset
        )
        console.log('osmFeature', osmFeature) */
      });
      console.log('本次点击结束之后高亮的个数', sum);

      //循环完之后高亮
      // console.log('循环完后高亮');
      // console.log('准备高亮的要素个数', osm3DFeatures.length);
      // osm3DFeatures.forEach(f => console.log('要素所属 tileset', f.tileset));
      // searchStore.highlight(osm3DFeatures)
      // osm3DFeatures.forEach(f => {
      //   f.color = Cesium.Color.RED
      // })
      // 取消时复原：
      // feature.color = Cesium.Color.WHITE;   // 恢复默认

      viewer.scene.requestRender(); // 强制刷新
    }
  }
}
