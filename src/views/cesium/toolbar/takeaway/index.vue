<template>
  <div v-show="viewerRef">
    <!-- 控制按钮 -->
    <div 
      class="toggle-btn"
      :class="{open:sidebarOpen}"
      @mouseenter="isBtnHover = true"
      @mouseleave="isBtnHover = false"
      @click="sidebarOpen = !sidebarOpen"
    >
      <span>{{ sidebarOpen ? '关闭' : '查看骑手轨迹' }}</span>
    </div>
    <!-- 滑动条 -->
    <div
      class="side-bar"
    >
      <div 
        :class="{open:sidebarOpen, glow: isBtnHover }"
        
        class="takeaway-panel"
      >
        <div class="button-row top">
          <el-button
            type="primary"
            plain
            :size="size"
            @click="playAnimation"
          >
            开始
          </el-button>
          <el-button
            type="primary"
            plain
            :size="size"
            @click="pauseAnimation"
          >
            暂停
          </el-button>
          <el-button
            type="primary"
            plain
            :size="size"
            @click="resumeAnimation"
          >
            继续
          </el-button>
          <el-button
            type="primary"
            plain
            :size="size"
            @click="serviceClear"
          >
            清除
          </el-button>
        </div>
        <div class="button-row bottom">
          <el-button
            type="primary"
            plain
            :size="size"
            @click="followRider"
          >
            视线跟随
          </el-button>
          <el-button
            type="primary"
            plain
            :size="size"
            @click="removeFllow"
          >
            取消跟随
          </el-button>
        </div>
        
        <div
          v-if="animationState"
          class="progress-info"
        >
          进度: {{ (animationState.currentProgress * 100).toFixed(1) }}%
          <!-- 时间: {{ animationState.elapsedTime.toFixed(1) }}s / {{ animationState.totalDuration }}s -->
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, inject, watch } from 'vue'
import type { Ref } from 'vue'
import {SceneStateManager} from '@/service/cesium/takeaway/SceneManage/SceneStateManager'
import {useSceneStore} from '../../../../store/takeaway/sceneStore'
import {useRiderController} from '@/composables/cesium/takeaway/createRiderController'
import {ScenePersistence} from '@/service/cesium/takeaway/SceneManage/ScenePersistence'
import {ClockController} from '@/service/cesium/takeaway/AnimationManage/ClockController'

import * as Cesium from 'cesium'

interface CesiumInjection {
  viewerRef: Ref<Cesium.Viewer | undefined>,
  tilesetRef: Ref<Cesium.Cesium3DTileset | undefined>,
  isReady: Ref<boolean>
}

const size = 'small'

let sceneStateManager : SceneStateManager
let clockController : ClockController

let isFollow = false
//管理订单面板状态
const sceneStore = useSceneStore()

const sidebarOpen = ref(false)
const isBtnHover = ref(false)

const { viewerRef, isReady } = inject<CesiumInjection>('cesium')!

const animationState = ref<any>(null)

/**
 * 初始化服务
 */
async function initializeServices(viewer: Cesium.Viewer) {
  const existingManager = sceneStore.getManager()

  if(existingManager){
    sceneStateManager = existingManager
  }else{
    sceneStateManager = new SceneStateManager(viewer)
    sceneStore.setManager(sceneStateManager)
  }

  sceneStore.setManager(sceneStateManager) //保存到pinia store 方便订单面板管理
  const res = useRiderController(sceneStateManager)
  sceneStore.setPollingFns(res.startPolling,res.stopPolling)

  //开启轮询
  // 当前isPath为false时
  if(!ScenePersistence.getIsPath()){
    res.startPolling()
  }
}

/**
 * 开始骑手动画
 */
async function startRiderAnimation() {
  if (!viewerRef.value) {
    console.error('服务未初始化')
    return
  }

  try {
    //内部会自行判断是否初始化过 如果初始化过就回显完数据之后返回 不再初始化
    sceneStateManager.initialize() //那么这个就是添加beforeunload监听的
  
    let services = sceneStateManager?.getServices()
   
    const data = sceneStateManager.getData()

    if(!services || !data) return 
    
    let {animationService,pointService,pathService} = services
    const {orderStepSegments,combinedOrder, order0StartIso} = data

    if (!pointService || !pathService || !animationService){
      console.log('重新创建')
      sceneStateManager.initServices()
      services = sceneStateManager.getServices()
      animationService = services.animationService
      pointService = services.pointService
      pathService = services.pathService
    }
   
    //如果此时已经有图钉entity就不再启动
    if(pointService?.hasEntity()) return

    if (!combinedOrder || !order0StartIso || !orderStepSegments) return
    
    // // 设置动画数据 某个组合订单
    animationService!.setAnimationData(combinedOrder, orderStepSegments)

    // 绘制起点终点 , 并注册和起点终点有关的鼠标（点击/移动）事件
    await pointService!.drawCombinedStops() // 见下一条
  
    //骑手初始化 
    pathService!.createRiderModel()

    ScenePersistence.setIsPath(true) //点击开始绘制 在本地存入 "已绘制"

    // 开始动画
    animationService!.startAnimation(combinedOrder.duration, order0StartIso)
    
  } catch (error) {
    console.error('启动骑手动画失败:', error)
  }
}

// 动画控制方法
const playAnimation = () => {
  //取消订单面板轮询
  sceneStore.stopPolling()
  // 清除 订单面板的延时器（startLater）
  sceneStore.clearTimeout()

  startRiderAnimation()

  //订单面板状态重置
  sceneStateManager.resetOrderControlStatus()
}

const pauseAnimation = () => {
  clockController.pauseAnimation()

  updateAnimationState()
}

const resumeAnimation = () => {
  clockController.resumeAnimation()
  updateAnimationState()
}

const followRider = ()=>{
  if(isFollow) return //已经跟随就不再重复设置
  isFollow = true
  const {pointService,pathService} = sceneStateManager.getServices()
  if(pointService && pathService){
    pointService.hidePopups() //视线跟随的时候隐藏所有弹窗
    pathService.followRider(true)
  }
}
const removeFllow = ()=>{
  if(!isFollow) return //已经跟随就不再重复设置
  isFollow = false
  const {pointService,pathService} = sceneStateManager.getServices()
  if(pointService && pathService){
    pointService.hidePopups() //视线跟随的时候隐藏所有弹窗
    pathService.removeFollow()
  }
}


// 更新动画状态
const updateAnimationState = () => {
  const {animationService} = sceneStateManager.getServices()
  if(animationService)
    animationState.value = animationService.getAnimationState()
}

const serviceClear = ()=>{
  //-----先把时钟恢复成东八区当前时间
  const {animationService} = sceneStateManager.getServices()
  if(!animationService){
    console.log('动画服务没有准备好 无法重置时钟')
    return
  }
  
  clockController.resetClock()

  //-----先把时钟恢复成东八区当前时间

  sceneStateManager.clear()
}


watch(
    [viewerRef, isReady],
    async ([vRef, ready]) => {
      
      if (vRef && ready) {
        
        await initializeServices(vRef)

        //创建时钟管理器
        clockController = new ClockController(vRef)
      }
    },
    {immediate:true}
  )


// 定期更新状态
onMounted(() => {
  
  // if(sceneStateManager)
  //   setInterval(updateAnimationState, 100)
})

// 组件卸载时清理资源
import { onUnmounted } from 'vue'
onUnmounted(() => {
  sceneStateManager.clear()
  //停止轮询
  sceneStore.stopPolling()
})

</script>

<style lang="scss" scoped>
.toggle-btn{
  position: absolute;
  z-index: 1;
  writing-mode: vertical-rl;
  width: 2.5rem;
  height: 9rem;
  top: 17rem;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background-color: rgba(57, 147, 138, 0.85);
  border-radius: 0 .5rem .5rem 0;
  transition: all 0.5s ease;
  &:hover{
    box-shadow: 
      0 0 1rem rgba(0,255,255,0.6),
      0 0 1.5rem rgba(0,255,255,0.4);
    transform: translateX(0.1rem) scale(1.1);
  }
  &.open{
    left: 24.5rem;
    width: 2rem;
    height: 5rem;
    font-size: 0.8rem;
    border-radius: 0 .5rem .5rem 0;
  }
 
}

.side-bar{
  position: absolute;
  z-index: 1;
  pointer-events: none;
  .takeaway-panel{
  pointer-events: auto;

    position: relative;
    left:-104%;
    top: 16.5rem;
    width: 24rem;
    height: 7rem;
    opacity: 0;
    transition: all 0.5s ease;
    border-radius: 1rem;
    background: rgba(10, 25, 47, 0.5); // 深蓝玻璃质感
    border: .0625rem solid rgba(0, 255, 255, 0.4);
    box-shadow: 0 0 1.25rem rgba(0, 255, 255, 0.3),inset 0 0 1rem rgba(172, 253, 253, 0.616);
    backdrop-filter: blur(.5rem);

    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    padding: .6rem;
    
    
    &.open{
      transform: translateX(105%);
      opacity: 1;
      &.glow{
        box-shadow:
          0 .25rem 1.25rem 0rem rgba(0, 255, 200, 0.6), // 第一个0rem 表示左右偏移为0 第二个0.25rem 表示向下偏移0.25rem 第三个1.25rem表示光晕 0rem表示光晕偏移量
          inset 0 0 1.4rem rgba(116, 231, 206, 0.6);
        transform: translateX(104%) scale(1.01);
      }
    }
  }
}

.takeaway-store {
  position: relative;
}

.animation-controls {
  position: absolute;
  top: 60px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
  padding: 10px;
  border-radius: 5px;
  z-index: 1000;
  
  button {
    margin: 2px;
    padding: 5px 10px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    
    &:hover {
      background: #45a049;
    }
  }
  
  .speed-control {
    margin-top: 10px;
    color: white;
    
    label {
      margin-right: 5px;
    }
  }
  
  .progress-info {
    margin-top: 10px;
    color: white;
    font-size: 14px;
  }
}
</style>