import * as Cesium from 'cesium';
import { ref, type Ref, watch, reactive, markRaw, type Reactive } from 'vue';
// import { usePointsStore } from '@/store/useMapStore';
import { correctPosition } from '@/utils/toolbar/spatialSearch/correctPosition';
import debounce from 'lodash/debounce';
import DynamicPopup from '@/service/cesium/spatialSearch/DynamicPopup';
import {
  setCameraPosition,
  saveCameraPos,
} from '@/utils/aboutCamera';
//获取HK政府提供的数据
// import { getHKWFSByArcGIS } from '../../../HongKong/getWFSData'
// import { handleHKShangYe } from '../../../HongKong/isShangYe'
//获取osm提供的建筑数据
import {
  queryOSM,
  queryOSMBatch,
  deleteCache,
  updateChartDataAndHighlight,
  type CenterCache,
  getOSMBuildingsFromCache,
} from './OSMBuilding';
//高亮对应osmid的建筑
import { createHighlightManager } from '@/views/cesium/interactions/spatialSearch/utils/manageOSMHighlight';

//创建处理器名称 方便移除监听事件
let clickHandler: Cesium.ScreenSpaceEventHandler;
//创建旗帜 标识是否开启监听
let index = 0;
//点击屏幕上的??按键，调用这个函数
//只创建一次
let highlightMgr: ReturnType<typeof createHighlightManager> | null = null;
//是否有弹窗创建  当他为true的时候我的按钮才会变化
export const isPopup = ref(false);
//用对象存储 每一个搜索圈的建筑id 用entityId 图钉图标id管理
// const highlightedIdsMap:Record<string,highlightedIdsType> = {}
//封装osm查询 queryOSM
const debounceQueryOSMBatch = debounce(queryOSMBatch, 600); //600ms内无变化再执行

//哨兵 判断是否调用过这个函数 如果调用过就马上退出
const isRegisterCamerClick = ref(false);

//全局chartData
interface chartData {
  value: number;
  name: string;
}
//拿数据图表数据 key:pinEntityId (图钉id)
const chartDataManage: Reactive<Record<string, chartData[]>> =
  managaLoacalChartData({ get: true });
//把localStorage存储的数据拿出来重新渲染到画布上
// type searchDataType = { pointEntityId: string, circleEntityId: string, pinEntityId: string, popupId: string }
//获取搜索圈的数据

// const searchDataArr: Record<string, searchDataType> = JSON.parse(localStorage.getItem('searchData') || '{}')
interface searchData {
  ids: {
    pointEntityId: string;
    circleEntityId: string;
    popupId: string;
  };
  position: {
    lng: number;
    lat: number;
    h: number;
  };
}
// key =  pinEntityId + radius 字符串 用existCenter 看是否已经缓存过该中心点 , Obj {Ids:{pointEntityId circleEntityId popupId},position:{lng,lat}} 全局变量？
type searchDataManageType = Record<string, searchData>;
const searchDataManage: searchDataManageType = JSON.parse(
  localStorage.getItem('searchDataManage') || '{}'
);
//key: pinEntityId
const popupInstance: Record<string, DynamicPopup> = {};

let radiusWatchStop: (() => void) | null = null;
export function registerRadiusWatch(uiRadius: Ref<number>) {
  if (radiusWatchStop) return; //全局只注册一次  如果有了就返回不再重复注册
  radiusWatchStop = watch(uiRadius, async (newValue) => {
    // 1. 更新本地key
    console.log('newValue', newValue);

    Object.keys(searchDataManage).forEach((oldkey) => {
      const [pinEntityId, oldRadius] = oldkey.split(',');
      if (+oldRadius !== newValue) {
        const newKey = `${pinEntityId},${newValue}`;
        searchDataManage[newKey] = searchDataManage[oldkey];
        delete searchDataManage[oldkey];
      }
    });
    //更新完成之后存入本地
    localStorage.setItem('searchDataManage', JSON.stringify(searchDataManage));
    // 2.重新查询建筑 -> 更新chartDataManage
    const pinEntityCollect: Record<string, { lng: number; lat: number }> = {};
    Object.keys(searchDataManage).forEach((key) => {
      const [pinEntityId] = key.split(',');
      pinEntityCollect[pinEntityId] = searchDataManage[key].position;
    });
    debounceQueryOSMBatch(
      pinEntityCollect,
      newValue,
      chartDataManage,
      highlightMgr
    );
  });
}
// 监听半径变化，动态重新查询 防抖 本地数据更新

//数据更新（新增或者删除或者清除） 全局变量

function makeSearchKey(pinEntityId: string, newRadius: number) {
  return `${pinEntityId},${newRadius}`;
}
function updateSearchData(
  pinEntityId: string,
  newRadius: number,
  options: {
    add?: boolean;
    searData?: searchData;
    del?: boolean;
    removeAll?: boolean;
  }
) {
  const key = makeSearchKey(pinEntityId, newRadius);
  if (options.add && options.searData) {
    //新增？
    searchDataManage[key] = options.searData;
  } else if (options.del) {
    //删除其中某一个记录 删除某一个搜索圈
    delete searchDataManage[key];
  } else if (options.removeAll) {
    //移除所有的搜索圈
    Object.keys(searchDataManage).forEach((key) => {
      //一个个遍历移除
      delete searchDataManage[key];
    });
  }
  localStorage.setItem('searchDataManage', JSON.stringify(searchDataManage)); //存入本地
}
function renderEntitiesImediately(
  viewer: Cesium.Viewer,
  options: {
    ids: { pointEntityId: string; circleEntityId: string; pinEntityId: string };
    position: { lng: number; lat: number; h: number };
    radius: Ref<number>;
  }
) {
  //即时渲染 点、圆圈、图钉、弹窗 渲染完成之后调用updateSearchData存入数据

  const { ids, position, radius } = options;
  const { pointEntityId, circleEntityId, pinEntityId } = ids;
  const { lng, lat, h } = position;
  //添加鼠标点击的点
  const point = new Cesium.Entity({
    id: pointEntityId,
    //笛卡尔3
    position: Cesium.Cartesian3.fromDegrees(lng, lat, h + 10), ////也可以写成 cartesian,
    point: {
      color: Cesium.Color.RED,
      pixelSize: 16,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    },
  });
  //以点为圆心绘制圆圈
  const circle = new Cesium.Entity({
    id: circleEntityId,
    position: Cesium.Cartesian3.fromDegrees(lng, lat, h),
    ellipse: {
      semiMajorAxis: new Cesium.CallbackProperty(() => radius.value, false),
      semiMinorAxis: new Cesium.CallbackProperty(() => radius.value, false),
      material: Cesium.Color.ORANGE.withAlpha(0.25),
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    },
  });
  //在圆心添加图钉
  const pinBuilder = new Cesium.PinBuilder();
  const pin = new Cesium.Entity({
    id: pinEntityId,
    position: Cesium.Cartesian3.fromDegrees(lng, lat, h),
    billboard: {
      image: pinBuilder.fromColor(Cesium.Color.ROYALBLUE, 60).toDataURL(),
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      disableDepthTestDistance: Number.POSITIVE_INFINITY, // 超过这个距离就不受深度测试影响
    },
  });
  viewer.entities.add(point); //绘制出来的添加到画布上
  viewer.entities.add(circle);
  viewer.entities.add(pin);
}
function managaLoacalChartData(option: {
  get?: boolean;
  put?: boolean;
  delAll?: boolean;
  delSingle?: boolean;
  pinEntityId?: string;
}) {
  if (option.get) {
    return reactive(
      JSON.parse(localStorage.getItem('chartDataManage') || '{}')
    );
  } else if (option.put) {
    localStorage.setItem('chartDataManage', JSON.stringify(chartDataManage));
  } else if (option.delAll) {
    localStorage.setItem('chartDataManage', '{}');
  } else if (option.delSingle && option.pinEntityId) {
    delete chartDataManage[option.pinEntityId];
    localStorage.setItem('chartDataManage', JSON.stringify(chartDataManage));
  }
}
function renderPopup(
  viewer: Cesium.Viewer,
  popupId: string,
  pinEntityId: string,
  chartData: Reactive<chartData[]>
) {
  //弹窗？
  // 创建弹窗 一得到查询结果就创建弹窗 全局遍历存储popup实例
  const popup = markRaw(
    new DynamicPopup({
      //一定需要弹窗实例去修改它的可见性吗？toggle
      id: popupId,
      title: '区域功能结构图',
      viewer,
      entityId: pinEntityId,
      showRef: ref(true),
      //根据图钉id查找对应的chartData数据 传给chartData
      chartData: chartData, //注意这里传reactive 全局共用了一个chartData
      // 传入一个移除搜索圈的函数
      onDelete: () => removeCircle(viewer, pinEntityId), //传回调
    })
  );
  if (!isPopup.value) {
    isPopup.value = true;
  }
  popupInstance[pinEntityId] = popup; //用于控制弹窗的显示和隐藏
}
//watch半径变化 迁移key的工作再watch里面直接完成了
//数据回显
function renderByLocalData(viewer: Cesium.Viewer, uiRadius: Ref<number>) {
  const searchDataManage: searchDataManageType = JSON.parse(
    localStorage.getItem('searchDataManage') || '[]'
  );
  if (Object.keys(searchDataManage).length > 0) {
    Object.keys(searchDataManage).forEach(async (key) => {
      const [
        pinEntityId,
        // radius
      ] = key.split(',');
      const { ids, position } = searchDataManage[key];
      // const radiusRef = ref(+radius) //这个是新的ref 但是监听的是旧的ref
      ids.pointEntityId;
      ids.circleEntityId;
      // 1. entity回显
      renderEntitiesImediately(viewer, {
        ids: {
          pointEntityId: ids.pointEntityId,
          circleEntityId: ids.circleEntityId,
          pinEntityId,
        },
        position,
        radius: uiRadius,
      });
      // 2. popup回显
      // 2.1 获取对应的chartData 这算是重新创建了一个响应式对象导致无法响应了吗？
      // const chartData: Reactive<chartData[]> = chartDataManage[pinEntityId]
      renderPopup(
        viewer,
        ids.popupId,
        pinEntityId,
        chartDataManage[pinEntityId]
      ); //图表数据在全局变量里面 直接从全局变量里面拿数据出来
    });
  }
}
// 在 init() 里（或模块加载时）计算一次即可
function initIndex() {
  /* 1. 本地存储里最大序号 */
  const searchDataManage: searchDataManageType = JSON.parse(
    localStorage.getItem('searchDataManage') || '{}'
  );
  let maxLocal = -1;
  Object.keys(searchDataManage).forEach((key) => {
    const parts = key.split(','); // ['circle-center-0', '100']
    const num = Number(parts[0].split('-').pop());
    if (!Number.isNaN(num) && num > maxLocal) maxLocal = num;
  });

  /* 3. 取两者最大值再 +1 */
  index = Math.max(maxLocal, -1) + 1;
}

export function init(
  viewer: Cesium.Viewer,
  hasChartData: boolean,
  tileset: Cesium.Cesium3DTileset,
  uiRadius: Ref<number>,
  isCircleSearch: Ref<boolean>
) {
  //注册全局监听
  registerRadiusWatch(uiRadius);
  initIndex(); //给index赋值 如果之前没有存过数据 index为0 如果之前有数据 找出所有数据中最大的那个数 index在此基础上+1

  //还原照相机的位置
  // 1. 先恢复视野
  // 1.1 前提是有图表数据才恢复视野 否则移除这个清除照相机位置的记录。如果后面要做返回上一视图呢？需要持续监听用户的相机位置 然后存入本地？
  if (!hasChartData) {
    localStorage.setItem('cameraBeforeReload', '{}'); //之前没有存储过数据就进来，那现在是什么状态？还是在查询界面？
    if (isCircleSearch.value) {
      //如果当前是圆圈搜索状态
      saveCameraPos(viewer, isRegisterCamerClick); // 3. 下次刷新前保存照相机位置
      clickScreenGetPoint(viewer, tileset, uiRadius, isRegisterCamerClick); //保持点击监听
    }
    return;
  } else {
    // 本地存有数据执行下面代码，1.相机位置回显 获取存储的相机位置
    const cameraPos = JSON.parse(
      localStorage.getItem('cameraBeforeReload') || '[]'
    );
    if (Object.keys(cameraPos).length > 0) {
      const { destination, orientation } = cameraPos;
      //设置相机位置
      setCameraPosition(viewer, destination, orientation);
    }
    // 2. 把本地存储的搜索圈回显 传入滑块的半径
    renderByLocalData(viewer, uiRadius);
    //3. 批量高亮建筑
    if (!highlightMgr) highlightMgr = createHighlightManager(tileset); //创建高亮管理器
    //图钉id[] chatdataArr[] 高亮管理器 缓存里面的建筑
    const osmCenterCache: CenterCache = JSON.parse(
      localStorage.getItem('osmCenterCache') || '[]'
    );
    const chartDataManage = reactive(
      JSON.parse(localStorage.getItem('chartDataManage') || '{}')
    );
    if (Object.keys(osmCenterCache).length > 0) {
      //说明有缓存数据 缓存数据只是缓存大圆圈数据 当把圆圈变小再刷新回显的话 ，会高亮缓存数据里面的所有建筑 但实际上我的半径不是最大那个 所以需要筛选
      Object.keys(osmCenterCache).forEach((key) => {
        const pinEntityId: string = osmCenterCache[key].pinEntityId;
        //item.data是building数据 这是缓存里面的所有建筑 但是我的半径小于缓存最大半径的话就不应该直接用传入所有数据 需要筛选
        const [lng, lat] = key.split(',');
        const buildings = getOSMBuildingsFromCache(+lng, +lat, uiRadius.value);
        updateChartDataAndHighlight(
          pinEntityId,
          chartDataManage,
          highlightMgr,
          buildings!
        );
      });
    }
    // 4. 下次刷新前再保存照相机的位置
    saveCameraPos(viewer, isRegisterCamerClick);

    // 仍是在查询界面  重新绑定点击 调用点击生成搜索圈的查询函数
    clickScreenGetPoint(viewer, tileset, uiRadius, isRegisterCamerClick);
  }
}
//保存数据 saveData2LocalStorage

//要不要写成类？
export function clickScreenGetPoint(
  viewer: Cesium.Viewer,
  tileset: Cesium.Cesium3DTileset,
  radius: Ref<number>,
  isRegister: Ref<boolean>
) {
  if (isRegister.value) return; //如果被注册过就马上返回
  saveCameraPos(viewer, isRegister);
  isRegisterCamerClick.value = true; //一进来就标记调用过了
  if (!highlightMgr) {
    highlightMgr = createHighlightManager(tileset);
  }
  // 先清理历史句柄（防 HMR 或重复进入）
  if (clickHandler && !clickHandler.isDestroyed()) {
    clickHandler.destroy();
  }
  //深度缓冲 图形/点/射线是否被地形遮挡？ 想要点击落在真实地形上就开启 （开启了地形）
  //后面添加了billboard 点击billboard想弹出弹窗 而不是新增一个搜索圈 让他不要那么容易点击到其他地方
  // viewer.scene.globe.depthTestAgainstTerrain = true;
  //这样写一串会污染全局 移除监听事件的话会全局的一起移除
  // viewer.screenSpaceEventHandler.setInputAction((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
  clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
  //添加屏幕监听事件
  clickHandler.setInputAction(
    async (click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      // 修正鼠标坐标
      const correctedPosition: Cesium.Cartesian2 = correctPosition(
        viewer,
        click
      );
      //鼠标移动 监听billboard图层
      // 拾取图钉图标
      const picked = viewer.scene.pick(correctedPosition);
      console.log('picked', picked);
      //为什么不用billboard来判断 因为可能有其他billboard 不太稳妥
      if (Cesium.defined(picked) && picked.id) {
        //如果是点到了图钉上面 就不绘制圆圈 控制弹窗的显隐
        if (picked.id._id.includes('circle-center')) {
          //获取到对应的弹窗实例  用图钉的id作为键值存储在popInstance替换
          const popup = popupInstance[picked.id._id];
          //弹窗切换
          popup.toggle();
          return;
        }
      }

      //鼠标在屏幕上的像素坐标
      const cartesian = viewer.scene.pickPosition(correctedPosition); //Car3
      //注意是弧度经纬度
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian); //Car3 --> 弧度经纬度
      const lng = Cesium.Math.toDegrees(cartographic.longitude); //弧度转度
      const lat = Cesium.Math.toDegrees(cartographic.latitude); //弧度转度
      const h = cartographic.height; //高度不用转弧度
      const pointEntityId = `point-${index}`;
      const circleEntityId = `circle-${index}`;
      const pinEntityId = `circle-center-${index}`;
      const popupId = `popup-${index}`;
      index++;
      // 先画出来 但不画弹窗
      renderEntitiesImediately(viewer, {
        ids: { pointEntityId, circleEntityId, pinEntityId },
        position: { lng, lat, h },
        radius,
      });

      try {
        //初次查询osm建筑并选出是商业的 带上图钉图标的id查询 创建对应的chartData chartDataObj也跟着更新了
        await queryOSM(
          lng,
          lat,
          radius.value,
          pinEntityId,
          chartDataManage,
          highlightMgr
        ); //但是点击第二个圆圈上一个圆圈的高亮就被清空了 没有记住
        // 数据回来后绘制弹窗 第一次绘制弹窗 用renderPopup
        renderPopup(viewer, popupId, pinEntityId, chartDataManage[pinEntityId]);
        //保存数据到本地
        managaLoacalChartData({ put: true });
        const searchData = {
          //准备数据 下一步保存在本地
          ids: {
            pointEntityId,
            circleEntityId,
            popupId,
          },
          position: {
            lng,
            lat,
            h,
          },
        };
        updateSearchData(pinEntityId, radius.value, {
          add: true,
          searData: searchData,
        }); //新增 然后会被存入本地
      } catch (err) {
        console.dir(err);
      }

      //查找HK_Shang_Ye建筑 数据源于政府
      /* const searchResult = await getHKWFSByArcGIS(lng, lat, radius)
      console.log('searchResult', searchResult) */
      //用HK给的数据高亮
      // await handleHKShangYe(searchResult, viewer)
      //给osm数据高亮 在这个范围内搜查 收集这些要素的信息并且突出显示 （逻辑复用 矩形、多边形）
    },
    Cesium.ScreenSpaceEventType.LEFT_CLICK
  );
}

//2.移除点击事件
export function unClickScreenGetPoint() {
  if (clickHandler) {
    clickHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    //isPopup.value修改成false
    isPopup.value = false;
  }
  isRegisterCamerClick.value = false;
}

//3.删除某个圆
export function removeCircle(viewer: Cesium.Viewer, pinEntityId: string) {
  initIndex(); //更新index？ 重新根据本地存储的id设置index
  let entityId;
  let radius;
  //删除实体 也可以这样removeById 得到各个entity的id 如何用searchDataManage得到该搜索圈管理的id
  const getPinEntityId = Object.keys(searchDataManage).find((key) => {
    //查找key里面包含这个pinEntityId的 用逗号切割字符串 取第一个 因为key是由pinEntityId和radius组成

    [entityId, radius] = key.split(','); //按逗号分割取第一部分
    if (entityId === pinEntityId) return key;
  });
  if (getPinEntityId) {
    viewer.entities.removeById(
      searchDataManage[getPinEntityId].ids.pointEntityId
    );
    viewer.entities.removeById(
      searchDataManage[getPinEntityId].ids.circleEntityId
    );
    viewer.entities.removeById(pinEntityId);
  }
  //销毁弹窗 移除postRender的监听事件
  popupInstance[pinEntityId].destroy();
  delete popupInstance[pinEntityId]; //删除弹窗存储对象中对应的数据

  //删除本地缓存的建筑数据
  const lng = searchDataManage[`${pinEntityId},${radius}`].position.lng;
  const lat = searchDataManage[`${pinEntityId},${radius}`].position.lat;
  //删除本地 searchDataManage数据
  if (radius) updateSearchData(pinEntityId, +radius, { del: true });

  if (radius) {
    deleteCache(lng, lat); // 一行搞定
  }
  //删除本地 echart数据
  managaLoacalChartData({ delSingle: true, pinEntityId });
  //清除高亮
  if (highlightMgr) {
    highlightMgr.removeCategoryIds(pinEntityId);
  }
}
export function clearAll(viewer: Cesium.Viewer) {
  managaLoacalChartData({ delAll: true });
  localStorage.removeItem('searchDataManage');
  localStorage.removeItem('osmCenterCache');
  localStorage.removeItem('cameraBeforeReload');
  viewer.entities.removeAll();
  highlightMgr?.removeAllCategories();
  Object.values(popupInstance).forEach((p) => p.destroy());
  isPopup.value = false;
}
//批量删除圆 没有用到 因为还要处理entityId为数组 不如直接遍历searchCircles调用removeCircle
/* export function removeCircleBatch(viewer: Cesium.Viewer, entityIds: string[]) {
  entityIds.forEach(entityId => {
    removeCircle(viewer, entityId)
  })
} */
