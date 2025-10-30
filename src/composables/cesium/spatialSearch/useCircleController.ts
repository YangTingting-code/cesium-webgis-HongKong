import { type Viewer, Cartesian2, defined, Cesium3DTileset } from 'cesium'
import { CircleSearchController } from '@/service/cesium/spatialSearch/Circle/CircleSearchController';
import { OSMBuildingService } from '@/service/cesium/spatialSearch/OSMBuildingService';
import { ref, watch, type Ref, onMounted } from 'vue'
import debounce from 'lodash/debounce';
import { ElMessage, ElMessageBox } from 'element-plus'

export function useCircleController(viewerRef: Ref<Viewer | undefined>, tilesetRef: Ref<Cesium3DTileset | undefined>) {
  let osmService: OSMBuildingService
  watch(
    [viewerRef, tilesetRef],
    ([vRef, tRef]) => {
      if (!vRef || !tRef) return
      osmService = new OSMBuildingService(tRef)
    },
    { immediate: true }
  )

  const circleCtrl = new CircleSearchController()
  // 默认搜索半径
  const defaultRadius = 200;
  const radius = ref(defaultRadius)
  const isStartDisabled = ref(false)
  const isStopDisabled = ref(true)
  // 是否在进行圆圈搜索
  const isCircleSearch = ref(false);
  const isListen = ref(false); //哨兵
  let index = -1; //entity 的 id不重复
  const showControl = ref(true);

  let lastCursorOnPin = false;
  let lastX = -1,
    lastY = -1;
  let currentPos: Cartesian2 | null = null;
  let checking = false


  //视图容器 挂载弹窗
  let viewerContainer: HTMLElement | null = null

  onMounted(() => {
    viewerContainer = document.getElementById('cesiumContainer')!;
  });

  // 防抖处理
  const debounceWatch = debounce(async () => {
    // 从本地拿lng,lat,pinEntityId数据
    const data = circleCtrl.dataMgr.getAll()
    for (const item of Object.values(data)) {
      await refreshAndRender(
        item.position.lng,
        item.position.lat,
        radius.value,
        item.ids.pinEntityId
      )
      circleCtrl.dataMgr.update(item.ids.pinEntityId, radius.value); //搜索圈本地数据更新
    }
  }, 500)

  watch(radius, debounceWatch)

  function enableInteraction() {
    if (!viewerRef.value) return
    /* bind handlers */
    circleCtrl.moveHandler.bindMove(
      viewerRef.value,
      (correctedPosition: Cartesian2) => { //传入一个函数 内部用requestAnimationFrame控制每一帧触发 而不是鼠标移动触发 减轻高频
        startCursorCheck(correctedPosition);
      }
    );
    circleCtrl.clickHandler.bind(
      viewerRef.value,
      async (lng, lat, h, correctedPosition) => {
        if (!viewerRef.value) return
        if (clickPick(correctedPosition)) return; //如果拾取到图钉图标就直接返回 控制弹窗的显示和隐藏
        index = circleCtrl.dataMgr.maxId(); //得到此时的最大id，准备index用于创建实例
        const pointEntityId = 'pointEntity-' + index;
        const pinEntityId = 'pinEntity-' + index;
        const circleEntityId = 'circleEntity-' + index;
        const popupId = 'popup-' + index;
        index++; //下次绘制不重复id
        // 搜索圈数据本地化
        const searchData = {
          ids: {
            pointEntityId,
            circleEntityId,
            pinEntityId,
            popupId,
          },
          position: {
            lng,
            lat,
            h,
          },
        }
        circleCtrl.dataMgr.add(pinEntityId, radius.value, searchData);

        circleCtrl.renderer.renderEntities(
          viewerRef.value,
          { pointEntityId, circleEntityId, pinEntityId },
          { lng, lat, h },
          radius
        ); //生成entities渲染到画布上，ref实时更新半径
        try {
          await refreshAndRender(lng, lat, radius.value, pinEntityId);
        } catch (err) {
          console.dir(err);
        }

        // 弹窗渲染
        circleCtrl.renderer.renderPopup(
          viewerRef.value,
          popupId,
          pinEntityId,
          circleCtrl.chartMgr.data[pinEntityId],
          () => {
            removeCircle(pinEntityId, lng, lat)
          }
        )
      }
    )
  }
  function disableInteraction() {
    /* unbind */
    circleCtrl.clickHandler.unbind(); //移除屏幕监听
    circleCtrl.moveHandler.unbind(); //移除屏幕监听
  }
  function clearAll() {
    disableInteraction()
    /* 清理圆圈、弹窗 */
    // 停止并清空所有圆圈
    ElMessageBox.confirm('将永久清除所有搜索圈，继续吗？', '警告', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning',
    })
      .then(() => {
        ElMessage({
          type: 'success',
          message: '已全部清除',
          offset: 105,
        });

        // 调用 Controller 清空
        if (!viewerRef.value || !osmService) return

        circleCtrl.clear(viewerRef.value)

        osmService.deleteCacheAll(); //删除缓存数据 
        isStartDisabled.value = false;
        isStopDisabled.value = true;

        radius.value = defaultRadius;
        isCircleSearch.value = false;
        osmService.visualizer.clearAll(); //高亮清除 建筑颜色恢复成默认
      })
      .catch(() => {
        ElMessage({
          type: 'info',
          message: '取消清除',
          offset: 105,
        });
      });
  }

  function restore(): boolean {
    if (!viewerRef.value) return false
    const viewer = viewerRef.value
    //回显数据 
    const hasData = circleCtrl.init(viewer, radius, removeCircle); // 初始化（相机、圆圈、弹窗回显）
    // 如果有缓存数据（刷新场景）
    if (hasData) { //如果搜索圈和弹窗回显了 进入这里 继续回显照相机 
      //相机 本地有数据才恢复成上一次刷新前照相机的位置
      // const { destination, orientation } = JSON.parse(
      //   sessionStorage.getItem('cameraBeforeReload') || '{}'
      // )

      // if (destination) setCameraPosition(viewer, destination, orientation)

      enableInteraction()
      // startListen(); //此时应当保持屏幕监听事件
      isListen.value = true; //此时开始监听屏幕点击事件
      showControl.value = true;
      isStartDisabled.value = true;
      isStopDisabled.value = false;

      // 半径从缓存里恢复 
      const searchData = circleCtrl.dataMgr.getAll();
      const firstKey = Object.keys(searchData)[0];
      const r = firstKey.split(',')[1];
      radius.value = +r;

      //高亮查询到的数据 osmService.query result里面有id
      Object.values(searchData).forEach(async (item) => {
        try {
          await refreshAndRender(
            item.position.lng,
            item.position.lat,
            radius.value,
            item.ids.pinEntityId
          );
        } catch (err) {
          console.dir(err);
        }
      })
      return true
    } else {
      return false
    }
  }


  //工具函数 查找osm 计算图表数据 高亮建筑
  async function refreshAndRender(
    lng: number,
    lat: number,
    radius: number,
    pinEntityId: string
  ) {
    if (!osmService) return
    const result = await osmService.query(lng, lat, radius, pinEntityId); //从缓存里面拿数据 对应半径里面的数据
    //更新图表数据
    if (!result || !result.amountFourType) return

    makeChartData(result.amountFourType, pinEntityId)//整理成图表数据
    circleCtrl.chartMgr.save() //保存在本地
    //高亮建筑
    osmService.visualizer.highlightBuilding(pinEntityId, result.categoryIds); //高亮查询到的数据 osmService.
  }
  //工具函数 1.生成图表数据
  function makeChartData(amountFourType: any, tuDingEntityId: string) {
    if (!circleCtrl.chartMgr.data[tuDingEntityId]) {
      circleCtrl.chartMgr.data[tuDingEntityId] = [];
    } else {
      circleCtrl.chartMgr.data[tuDingEntityId].length = 0;
    }
    for (const key in amountFourType) {
      if (key === 'commercialAmount') {
        circleCtrl.chartMgr.data[tuDingEntityId].push({
          value: amountFourType[key],
          name: '商业类',
        });
      } else if (key === 'accommodationAmount') {
        circleCtrl.chartMgr.data[tuDingEntityId].push({
          value: amountFourType[key],
          name: '居住类',
        });
      } else if (key === 'civicAmount') {
        circleCtrl.chartMgr.data[tuDingEntityId].push({
          value: amountFourType[key],
          name: '公共设施',
        });
      } else if (key === 'transportationAmount') {
        circleCtrl.chartMgr.data[tuDingEntityId].push({
          value: amountFourType[key],
          name: '交通类',
        });
      } else {
        circleCtrl.chartMgr.data[tuDingEntityId].push({
          value: amountFourType[key],
          name: '未知',
        });
      }
    }
  }

  function startCursorCheck(correctedPosition: Cartesian2) {
    // 每次只更新 currentPos
    currentPos = correctedPosition;

    if (!checking) {
      checking = true;
      loop();
    }
  }

  function loop() {
    if (!checking) return;

    if (currentPos) {
      const { x, y } = currentPos;
      if (x !== lastX || y !== lastY) {
        lastX = x;
        lastY = y;
        if (!viewerRef.value) return
        const picked = viewerRef.value.scene.pick(currentPos);
        const hitPin = picked?.id?._id?.includes('pinEntity') ?? false;

        if (hitPin) {
          const popup = circleCtrl.renderer.popupInstances[picked.id._id];
          if (!popup) {
            requestAnimationFrame(loop);
            return;
          }
        }

        if (hitPin !== lastCursorOnPin) {
          lastCursorOnPin = hitPin;
          if (viewerContainer)
            viewerContainer.style.cursor = hitPin ? 'pointer' : 'default';
        }
      }
    }
    requestAnimationFrame(loop);
  }

  //工具函数 2.清除搜索圈
  function removeCircle(pinEntityId: string, lng: number, lat: number) {
    if (viewerRef.value) circleCtrl.clearById(viewerRef.value, pinEntityId, radius.value); //移除本地（搜索圈数据、图表数据）和弹窗
    if (osmService) {
      osmService.deleteCache(lng, lat); //移除缓存数据
      osmService.visualizer.clearHighLightById(pinEntityId); //建筑不再高亮 恢复默认
    }
    index = circleCtrl.dataMgr.maxId(); //更新index
  }

  function clickPick(correctedPosition: Cartesian2): boolean {
    if (viewerRef.value) {
      const picked = viewerRef.value.scene.pick(correctedPosition);
      //为什么不用billboard来判断 因为可能有其他billboard 不太稳妥
      if (defined(picked) && picked.id) {
        //如果是点到了图钉上面 就不绘制圆圈 控制弹窗的显隐
        if (picked.id._id.includes('pinEntity')) {
          const popup = circleCtrl.renderer.popupInstances[picked.id._id]; //获取到对应的弹窗实例  用图钉的id作为键值存储在popInstance替换
          popup.toggle(); //弹窗切换
          return true;
        }
      }
    }
    return false;
  }

  return { circleCtrl, radius, isStartDisabled, isStopDisabled, showControl, enableInteraction, clearAll, restore }
}
