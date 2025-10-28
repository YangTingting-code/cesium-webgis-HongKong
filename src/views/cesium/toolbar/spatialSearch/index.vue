<template>
  <!-- <div v-if="isReady"> -->
  <!-- 控制按钮 -->
  <div
    class="toggle-btn"
    :class="{ open: sidebarOpen }"
    @mouseenter="isBtnHover = true"
    @mouseleave="isBtnHover = false"
    @click="sidebarOpen = !sidebarOpen"
  >
    <span>{{ sidebarOpen ? '关闭' : '查看周边' }}</span>
  </div>

  <!-- 侧边栏 -->
  <div
    class="sidebar"
    :class="{ open: sidebarOpen }"
  >
    <!-- 搜索方式 -->
    <!-- <div 
        v-if="!showControl" 
        :class="{ open: sidebarOpen }"
        class="search"
        @click.stop="selectMethod"
      >
        <div class="search-list">
          <div class="item" data-method="circle">
            <div class="searchPic">
              <button>图片</button>
              <span>圆圈搜索</span>
            </div>
          </div>
        </div>
      </div> -->

    <!-- 控制面板 -->
    <div 
      v-if="showControl"
      :class="{ glow: isBtnHover }"
      class="control-panel" 
      @click.stop="controlClick"
    >
      <span class="slider-title">搜索半径</span>
      <div class="slider-demo-block">
        <el-slider
          v-model="radius"
          :min="10"
          :max="500"
          :step="10"
          show-input
        />
      </div>
      <div class="button-row">
        <el-button
          size="small"
          type="primary"
          round
          :disabled="isStartDisabled"
          class="start"
        >
          开始搜索
        </el-button>
        <el-button
          size="small"
          type="success"
          round
          :disabled="isStopDisabled"
          class="stop"
        >
          停止搜索
        </el-button>
      </div>
    </div>
  </div>
  <!-- </div> -->
</template>

<script setup lang="ts">
  import { onMounted, ref, watch,inject ,type Ref} from 'vue';
  import debounce from 'lodash/debounce';
  // import throttle from 'lodash/throttle';
  import * as Cesium from 'cesium';
  import { CircleSearchController } from '@/service/cesium/spatialSearch/Circle/CircleSearchController';
  import { OSMBuildingService } from '@/service/cesium/spatialSearch/OSMBuildingService';
  import { ElMessage, ElMessageBox } from 'element-plus';
  import { saveCameraPos, setCameraPosition,removeCameraListener } from '@/utils/aboutCamera'; // 你之前写的工具

  const sidebarOpen = ref(false) //鼠标点击了按钮之后 这个会变成true 然后sidebar 多一个open类
  const isBtnHover = ref(false) //当鼠标在关闭按钮的时候 控制面板也会跟着放大发光

    interface CesiumInjection {
      viewerRef:Ref<Cesium.Viewer|undefined>,
      tilesetRef:Ref<Cesium.Cesium3DTileset|undefined>,
      isReady:Ref<boolean>
    }
    const {viewerRef,tilesetRef,isReady} = inject<CesiumInjection>('cesium')!
  
  // 创建实例（全局持有，不要每次点击都 new）
  const circleCtrl = new CircleSearchController();
  let osmService: OSMBuildingService | undefined;

  // 搜索功能面板的显隐
  const showList = ref(false);
  const showControl = ref(true);

  // 默认搜索半径
  const defaultRadius = 200;
  const radius = ref(defaultRadius);

  // 按钮状态
  const isStartDisabled = ref(false);
  const isStopDisabled = ref(true);

  // 是否在进行圆圈搜索
  const isCircleSearch = ref(false);
  const isListen = ref(false); //哨兵
  let index = -1; //entity 的 id不重复
  //视图容器 挂载弹窗
  let viewerContainer:HTMLElement|null = null

  onMounted(() => {
    viewerContainer = document.getElementById('cesiumContainer')!;
  });

// 防抖处理
const debounceWatch = debounce(() => {
  // 从本地拿lng,lat,pinEntityId数据
  const data = circleCtrl.dataMgr.getAll();
  Object.values(data).forEach(async (item) => {
    try {
      await refreshChartAndHighlight(
        item.position.lng,
        item.position.lat,
        radius.value,
        item.ids.pinEntityId
      );
    } catch (err) {
      console.dir(err);
    }
    circleCtrl.dataMgr.update(item.ids.pinEntityId, radius.value); //搜索圈本地数据更新
  });
}, 600);
//半径变化 根据搜索圈范围更新建筑样颜色 没有被覆盖到的建筑就不设置颜色
watch(radius, debounceWatch);
watch(
  [viewerRef, tilesetRef, isReady],
  ([vRef,tRef, ready]) => {
    if (ready && tRef && vRef) {
      if (!osmService) {
        osmService = new OSMBuildingService(tRef)
        reloadData(vRef) 
      }
    }
  },
  { immediate: true }
)

function reloadData(viewer:Cesium.Viewer){
  //回显数据 
  const hasData = circleCtrl.init(viewer, radius, removeCircle); // 初始化（相机、圆圈、弹窗回显）
  // 如果有缓存数据（刷新场景）
    if (hasData) { //如果搜索圈和弹窗回显了 进入这里 继续回显照相机 
      //相机 本地有数据才恢复成上一次刷新前照相机的位置
      const { destination, orientation } = JSON.parse(
        localStorage.getItem('cameraBeforeReload') || '{}'
      );
      if (destination) setCameraPosition(viewer, destination, orientation);
      startListen(); //此时应当保持屏幕监听事件
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
          await refreshChartAndHighlight(
            item.position.lng,
            item.position.lat,
            radius.value,
            item.ids.pinEntityId
          );
        } catch (err) {
          console.dir(err);
        }
      });
    }
}
// 打开搜索方式列表
function toggleList() {
  if (!showControl.value) {
    showList.value = !showList.value;
  }
  if(showControl.value === true){
    showControl.value = false
  }
}

// 选择搜索方式
function selectMethod(e: MouseEvent) {
  const item = (e.target as HTMLElement).closest('.item');
  if (!item) return;
  toggleList();

  if (item.dataset.method === 'circle') {
    isCircleSearch.value = true;
    // showControl.value = !showControl.value;
  }
}

// 控制面板点击事件（开始 / 停止按钮）
function controlClick(e: MouseEvent) {
  const btn = (e.target as HTMLElement).closest('button');
  if (!btn) return;

  if (btn.className.includes('start')) {
    isStartDisabled.value = true;
    isStopDisabled.value = false;
    // 启用点击事件 → 查询 OSM → 渲染圆圈 + 弹窗
    startListen();
    isListen.value = true; //此时开始监听屏幕点击事件
  } else if (btn.className.includes('stop')) {
    stopAndDelete();
  }
}

// 停止并清空所有圆圈
function stopAndDelete() {
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
      if(!viewerRef.value || !osmService) return
      circleCtrl.clear(viewerRef.value); 
      osmService.deleteCacheAll(); //删除缓存数据 
      isStartDisabled.value = false;
      isStopDisabled.value = true;
      // showControl.value = false;
      radius.value = defaultRadius;
      isCircleSearch.value = false;
      circleCtrl.clickHandler.unbind(); //移除屏幕监听
      circleCtrl.moveHandler.unbind(); //移除屏幕监听
      removeCameraListener(isListen)
      // isListen.value = false; //哨兵恢复 不再监听 这个直接写在removeCameraListener里面了
      osmService.visualizer.clearAll(); //高亮清除 建筑颜色恢复成默认
      localStorage.removeItem('cameraBeforeReload'); //照相机localStorage移除
    })
    .catch(() => {
      ElMessage({
        type: 'info',
        message: '取消清除',
        offset: 105,
      });
    });
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
//工具函数 2.清除搜索圈
function removeCircle(pinEntityId: string, lng: number, lat: number) {
  if(viewerRef.value) circleCtrl.clearById(viewerRef.value, pinEntityId, radius.value); //移除本地（搜索圈数据、图表数据）和弹窗
  if(osmService){
    osmService.deleteCache(lng, lat); //移除缓存数据
    osmService.visualizer.clearHighLightById(pinEntityId); //建筑不再高亮 恢复默认
  }
  index = circleCtrl.dataMgr.maxId(); //更新index
}
//工具函数 查找osm 计算图表数据 高亮建筑
async function refreshChartAndHighlight(
  lng: number,
  lat: number,
  radius: number,
  pinEntityId: string
) {
  if(!osmService) return
  const result = await osmService.query(lng, lat, radius, pinEntityId); //从缓存里面拿数据 对应半径里面的数据
  makeChartData(result.amountFourType, pinEntityId); //整理成图表数据
  circleCtrl.chartMgr.save(); //保存在本地
  osmService.visualizer.highlightBuilding(pinEntityId, result.categoryIds); //高亮查询到的数据 osmService.
}

function startListen() {
  if(!viewerRef.value) return
  saveCameraPos(viewerRef.value, isListen); //开始屏幕监听的时候也开启saveCameraPos的监听 当不再监听点击事件的时候也不再监听
  circleCtrl.moveHandler.bindMove(
    viewerRef.value,
    (correctedPosition: Cesium.Cartesian2) => { //传入一个函数 内部用requestAnimationFrame控制每一帧触发 而不是鼠标移动触发 减轻高频
      startCursorCheck(correctedPosition);
    }
  );
  circleCtrl.clickHandler.bind(
    viewerRef.value,
    async (lng, lat, h, correctedPosition) => {
      if(!viewerRef.value) return
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
      };
      circleCtrl.dataMgr.add(pinEntityId, radius.value, searchData);
      
      circleCtrl.renderer.renderEntities(
        viewerRef.value,
        { pointEntityId, circleEntityId, pinEntityId },
        { lng, lat, h },
        radius
      ); //生成entities渲染到画布上，ref实时更新半径
      try {
        // console.log('osmService',osmService);
        await refreshChartAndHighlight(lng, lat, radius.value, pinEntityId);
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
          removeCircle(pinEntityId, lng, lat);
        }
      );
    }
  );
}

function clickPick(correctedPosition: Cesium.Cartesian2): boolean {
  if(viewerRef.value){
  const picked = viewerRef.value.scene.pick(correctedPosition);
    //为什么不用billboard来判断 因为可能有其他billboard 不太稳妥
    if (Cesium.defined(picked) && picked.id) {
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

// 初始化阶段（组件 mounted 后）执行一次


let lastCursorOnPin = false;
let lastX = -1,
  lastY = -1;
let currentPos: Cesium.Cartesian2 | null = null;
let checking = false;

function startCursorCheck(correctedPosition: Cesium.Cartesian2) {
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
      if(!viewerRef.value) return
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
        if(viewerContainer)
          viewerContainer.style.cursor = hitPin ? 'pointer' : 'default';
      }
    }
  }
  requestAnimationFrame(loop);
}
</script>

<style scoped lang="scss">
/* 按钮 */
.toggle-btn {
  position: absolute;
  top: 2rem;
  left: 0;
  width: 2.5rem;
  height: 6rem;
  background: rgba(57, 147, 138, 0.85);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  writing-mode: vertical-rl; /* 垂直文字 */
  border-radius: 0 .5rem .5rem 0;
  cursor: pointer;
  transition: all 0.5s ease;
  z-index: 10;
  &:hover {
    transform: translateX(0.5rem) scale(1.1);
    box-shadow: 0 0 1rem rgba(0,255,255,0.6),0 0 1.5rem rgba(0,255,255,0.4)
  }
  &.open {
    left: 24.5rem; /* 跟随侧边栏宽度 */
    width: 2rem;
    height: 5rem;
    font-size: 0.8rem;
    border-radius: 0 .5rem .5rem 0;
  }
}

/* 侧边栏 */
.sidebar {
  position: absolute;
  top: -0.5%;
  left: 0;
  width: 25rem;
  height: 12rem;
  background: transparent;
  transform: translateX(-100%);
  transition: all 0.5s ease;
  z-index: 1;
  overflow-y: hidden;
  opacity: 0;
  pointer-events: none;
  &.open {
    transform: translateX(0);
    opacity: 1;
    pointer-events:auto;
    
  }
  .control-panel {
    
    position: relative;
    margin: 0.75rem auto;
    padding: 1rem 1.25rem;
    width: 95%;
    min-height: 8rem;
    border-radius: 1rem;
    background: rgba(10, 25, 47, 0.5); // 深蓝玻璃质感
    box-shadow: 0 0 1.25rem rgba(0, 255, 255, 0.3),inset 0 0 1rem rgba(172, 253, 253, 0.616);
    backdrop-filter: blur(.5rem);
    overflow: hidden;
    transition: all 0.5s ease;
    &.glow{
      box-shadow:
        0 0rem 1rem 0rem rgba(0, 255, 200, 0.6), // 第一个0rem 表示左右偏移为0 第二个0.25rem 表示向下偏移0.25rem 第三个1.25rem表示光晕 0rem表示光晕偏移量
        inset 0 0 2rem rgba(116, 231, 206, 0.6);
      transform: translateX(-0.5rem) scale(1.02);
    }
    .slider-title {
      font-size: 1.2rem;
      font-weight: bold;
      color:#00e5ff;
      text-shadow: 0 0 .5rem rgba(0, 255, 255, 0.6);
    }

    .slider-demo-block {
      margin-top: 0.75rem;
      max-width: 22rem;
      display: flex;
      align-items: center;
      pointer-events: auto;
      //数字输入框
      :deep(.el-input-number) {
        width: 80px;            // 1. 整体先压死
        line-height: 22px;
      }
      :deep(.el-input-number .el-input__wrapper) {
        padding: 0 4px;         // 2. 把左右 padding 压到 4 px
        height: 22px;
        min-width: unset;       // 3. 去掉 Element 的 min-width
      }

      :deep(.el-input-number .el-input__inner) {
        font-size: 11px;        // 4. 字体缩小，减少占位
        text-align: center;     // 5. 居中后可再压 4-6 px
      }

      :deep(.el-input-number__decrease),
      :deep(.el-input-number__increase) {
        width: 18px;            // 6. 侧边按钮压窄
        height: 20px;           // 7. 上下按钮高度减半
      }

      .el-slider {
        flex: 1;
        margin-left: 0.75rem;
        /* Slider轨道 */
        :deep(.el-slider__runway) {
          height: 3px;
          border-radius: 2px;
          margin-right: 16px;
        }

        /* 已选轨道 */
        :deep(.el-slider__bar) {
          height: 3px;
          border-radius: 2px;
          box-shadow: none;
        }

        :deep(.el-slider__stop){
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1px solid #0000006f;
          background: radial-gradient(circle at 30% 30%, #fff);
          top: -2px;
        }
        /* 滑块按钮 */
        :deep(.el-slider__button) {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid #00c2ff;
          background: radial-gradient(circle at 30% 30%, #00c2ff, #0f1325);
          position: relative;
          top: -1px;
          transition: transform 0.2s ease;
        }
        :deep(.el-slider__button:hover) {
          transform: scale(1.2);
          box-shadow: 0 0 6px rgba(0, 194, 255, 0.6);
        }
      }
    }

    .button-row {
      margin-top: 0.5rem;
      display: flex;
      justify-content: space-around;

      //button 用el默认样式
      // .el-button {
      //   width: 40%;
      //   font-weight: 500;
      //   letter-spacing: 0.02em;
      //   box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
      //   transition: all 0.25s ease;

      //   &:hover {
      //     transform: translateY(-2px) scale(1.02);
      //     box-shadow: 0 6px 16px rgba(0, 255, 200, 0.35);
      //   }

      //   &.start {
      //     background: linear-gradient(145deg, #3fa9f5, #0077b6);
      //     border: none;
      //     color: #fff;
      //   }
      //   &.stop {
      //     background: linear-gradient(145deg, #43d68f, #2a9d8f);
      //     border: none;
      //     color: #fff;
      //   }
      // }
      
    }
  }
}

</style>
