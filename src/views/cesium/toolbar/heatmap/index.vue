<template>
  <!-- v-show="isReady" -->
  <div
    :class="{open:sidebarOpen}"
    class="toggle-btn" 
    @mouseenter="isBtnHover = true"
    @mouseleave="isBtnHover = false"
    @click.stop="sidebarOpen=!sidebarOpen"
  >
    <span> {{ sidebarOpen ? '关闭':'热力图' }} </span>
  </div>

  <!-- v-show="isReady" -->
  <heatmapControler 
    :glow="isBtnHover"
    :viewer-ref="viewerRef"
    :class="{open:sidebarOpen}"
    @start-draw="startDraw"
    @clear-heatmap="clearHeatmap"
    @pause="pause"
    @play="play"
  />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted,inject,type Ref,ref} from 'vue';
import { flowWeek } from '@/service/cesium/heatmap/FlowWeek';
import { loadData } from '@/data/heatmap/loadData';
import {updateHeatmapData } from '@/service/cesium/heatmap/heatmapCesiumES6';
import * as Cesium from 'cesium';
import heatmapControler from '@/components/heatmap/HeatmapControler.vue'
import type { HeatSnapWithoutId } from '@/interface/heatmap/interface';
import {saveCameraPos,setCameraPosition,removeCameraListener,position2bbox} from '@/utils/aboutCamera' 

import {
  CesiumHeatmap,
  type HeatmapPoint,
} from '@/lib/cesium-heatmap-es6-custom';
import {getFeaturesBBox} from '@/utils/geo/json2Feature'
import {heatmapPersistence} from '@/service/cesium/heatmap/heatmap-persistence'

interface CesiumInjection{
  viewerRef:Ref<Cesium.Viewer>,
  tilesetRef:Ref<Cesium.Cesium3DTileset>,
  isReady:Ref<boolean>
 }
interface FormType {
  radius:number,
  blur:number,
  maxOpacity:number,
  minOpacity:number,
  gradient:null,
  date:any,
  regions:any
}
const sidebarOpen = ref(false) //控制面板的出现和关闭
const isBtnHover = ref(false) //鼠标在btn上面的时候 控制面板会发光
const keys: (keyof FormType)[] = ['radius', 'blur', 'maxOpacity', 'minOpacity',"gradient","regions"];
const initRegions = ["九龙城区","油尖旺区","深水埗区","黄大仙区","观塘区"] //这个后面需要调整，目前我本地存储了这几个区域的
let heatmapOption = {
  radius:0,
  blur:0,
  maxOpacity:0,
  minOpacity:0,
  gradient:0,
  date:0,
  regions:['']
}
let globalMax = 2500
let globalMin = 0


let lastOption = heatmapPersistence.getLastOption()
const isRegisterCamera = ref(false)

//接收表单数据 并且把string转换成number，把起止时间转换成JulianDate格式的，下一步就是查找本地数据有没有 没有的话就重新计算
const handleForm = (value:FormType)=>{
  keys.forEach((key)=>{
    heatmapOption[key] = value[key]
  })
  let iso1
  let iso2
  if(typeof value["date"][0] !== "string"){ //说明是用户手动选择了数字 不是用本地回显回去的
    const date1:Date = value["date"][0]
    iso1 = date1.toISOString() //.toISOString()就是生成UTC时间 但是我想要中国时间
    const date2:Date = value["date"][1]
    iso2 = date2.toISOString() //.toISOString()就是生成UTC时间 但是我想要中国时间
  }else{ //本地回显回去的就是UTC时间 不用再做转换
    iso1 = value["date"][0]
    iso2 = value["date"][1]
  }


  const startTime = Cesium.JulianDate.fromIso8601(iso1)
  const stopTime = Cesium.JulianDate.fromIso8601(iso2)
  return {
    heatmapOption,
    startTime,
    stopTime
  }
}
const save = (value:FormType)=>{
  heatmapPersistence.setLastOption(value)
}
const drawHeatmap = async (value:FormType, forceRedraw=false)=>{
  if(!viewerRef.value) return
  const {heatmapOption,startTime,stopTime} =handleForm(value)
  lastOption = heatmapPersistence.getLastOption()
  const clock = viewerRef.value.clock 
  //判断是否需要重绘
  const needRedraw = forceRedraw ||
    JSON.stringify(clock.startTime.clone()) !== JSON.stringify(startTime) ||
    JSON.stringify(clock.stopTime.clone()) !== JSON.stringify(stopTime) ||
    JSON.stringify(lastOption) !== JSON.stringify(heatmapOption)
    
  if(needRedraw){//刷新回来 时间轴我没有做缩放 所以会进入到这里重绘
    clearHeatmap() //如果没有热力图需要清除 clearHeatmap会直接返回 不会做任何操作 
    await initTime(heatmapOption,startTime,stopTime,
    heatmapPersistence.getIsHeatmap()
  )
  }else{ //不用重绘 直接打开时间播放 有bug 有可能是刷新之后不用重绘制 此时是否播放动画需要根据刷新前的状态来决定
    clock.shouldAnimate = true 
  }
}
const startDraw = async (value:FormType)=>{
  // ===== 将当前绘制的区域更新到本地 ===== 还有什么时候会更新 点击继续绘制的时候
  heatmapPersistence.setHeatmapRegions(value.regions)
// ==========================================
  sidebarOpen.value = false
  save(value) //保存数据到本地
  const heatmapVisited = heatmapPersistence.getIsHeatmap()
  await drawHeatmap(value,!heatmapVisited) //只有第一次绘制热力图的时候才需要重绘 heatmapVisited是热力图是否第一次绘制的标志
  saveCameraPos(viewerRef.value,isRegisterCamera) //开始相机监听 刷新之后表单数据回显 把表单数据提交给父组件 触发startDraw 此时不会再次监听照相机 因为isRegisterCamera是true
  isRegisterCamera.value = true
}


let heatLayer :CesiumHeatmap|undefined
const isRemoved = ref(false)
const pause = ()=>{ //暂停热力图的绘制
  viewerRef.value.clock.shouldAnimate = false
}
const play = async (value:FormType)=>{ //暂停热力图的绘制
  // ===== 将当前绘制的区域更新到本地 ===== 在点击“开始绘制”或者“继续绘制”的时候把当前热力图区域存储到本地
  heatmapPersistence.setHeatmapRegions(value.regions)
  // ==========================================
  save(value) //保存配置
  sidebarOpen.value = false
  await drawHeatmap(value,false) //判断参数是否发生变化 不强制重绘
}
const clearHeatmap = ()=>{ //清除热力图
  if(!heatLayer) return //如果根本没有热力图实例就直接返回
  heatLayer.remove() //移除热力图实例
  viewerRef.value.clock.shouldAnimate = false
  //恢复初始状态 清除监听 下次可以再次绘制热力图
  if(tickRemoved){
    tickRemoved();
    tickRemoved = null
    isRemoved.value = true //表示热力图被移除了 下次绘制热力图需要重新创建实例
  }
  heatmapPersistence.setIsHeatmap(false)
  
  isRegisterCamera.value = false //照相机监听也移除
  removeCameraListener(isRegisterCamera)
}
const {viewerRef,isReady} = inject<CesiumInjection>("cesium")!

const date2slot = (d: Date) => {
  const day = (d.getDay() || 7) - 1; // 周一=0, 周日f=6
  return day * 24 + d.getHours();
};
const initClock= (startTime:Cesium.JulianDate,endTime:Cesium.JulianDate)=>{
  const clock = viewerRef.value.clock
  clock.startTime = startTime.clone(); //为什么这里还要克隆？
  clock.stopTime = endTime.clone();
  clock.currentTime = startTime.clone();
  clock.clockRange = Cesium.ClockRange.LOOP_STOP;
  clock.multiplier = 3600;
  clock.shouldAnimate = true;
  // 1. 让 timeline 完成初始化（关键）
  viewerRef.value.timeline.zoomTo(startTime, endTime); //把时间线缩放到用户设定的时间
}

const getRegionPoints = (snap:any, regions:Array<string>)=>{
  if (!snap.points.length) return [];
  let points:HeatmapPoint[] = []
  for(let i = 0 ; i < snap.points.length ;i++){
    const p = snap.points[i]
    if(regions && !regions.includes(p.region)){
      continue //过滤掉不是当前区的
    }
    //过滤掉非法数据
    if (
        !p ||
        typeof p.lng !== 'number' ||
        isNaN(p.lng) ||
        typeof p.lat !== 'number' ||
        isNaN(p.lat) ||
        typeof p.value !== 'number' ||
        isNaN(p.value)
      ) {
        console.warn('❌ 第', i, '个点非法:', p);
        continue
      }
      points.push({x: p.lng, y: p.lat, value:p.value})//符合条件推入数组
  }
  return points
}

let tickRemoved: (() => void) | null = null
/**
 * 
 * @param heatmapOption 热力图的参数
 * @param startTime UTC格式的日期
 * @param endTime UTC格式的日期
 */
async function initTime(heatmapOptions:any,startTime:Cesium.JulianDate,endTime:Cesium.JulianDate,heatmapVisited:boolean) { 

  const hasHeatSnap = await flowWeek.heatStore.length();
  if (!viewerRef.value || hasHeatSnap === 0) return
  // 1. 防止重复注册
  if (tickRemoved) {
    console.log('已经注册过 onTick，不再重复',tickRemoved)
    return
  }
  //这个只是浅拷贝 要做深拷贝！
  // lastOption = toRaw(heatmapOption) //保存当前的heatmapOption 下次有改变就重新绘制 
  heatmapPersistence.setLastOption(heatmapOptions)
  
  initClock(startTime,endTime)
  // 2. 注册并保存移除句柄
  let lastSlot = -1
  let pending = false

  const listener = async (c: Cesium.Clock) => {
    const slot = date2slot(Cesium.JulianDate.toDate(c.currentTime))  //北京时间
    if (slot === lastSlot || pending) return  // 跳过重复slot或正在处理中
    lastSlot = slot // 防止同一小时 slot 重复生成热力图
    pending = true // 防止异步获取数据没结束又触发下一次更新
    try {
      const snap : HeatSnapWithoutId | null = await flowWeek.heatStore.getItem(`slot:${slot}`)
      
      if (snap) {
        //按照区域绘制热力图 不同区域的热力图不同
        // heatmapOptions.regions.forEach((region:string)=>{
          const points = getRegionPoints(snap,heatmapOptions.regions)
          
          if(!heatLayer || isRemoved.value){ //如果这个区域没有热力图实例 或者被移除
            heatLayer = new CesiumHeatmap(
              viewerRef.value, 
            {
              zoomToLayer:false,
              // !heatmapVisited,
              points:points,
              heatmapDataOptions:{max:globalMax,min:globalMin},
              heatmapOptions,
              noLisenerCamera: true,
              // renderType:'primitive' 用primitive没有不会把热力图覆盖在模型上面
            })
            // 照相机调整至能观察到整个热力图
            if(!heatmapVisited){ //不是刷新时缩放至全局观察
              const regionsArr = heatmapPersistence.getHeatmapRegions()

              const bboxFea = await getFeaturesBBox(regionsArr)
              if(bboxFea.bbox) position2bbox(bboxFea.bbox,viewerRef.value)
            }
            isRemoved.value = false //热力图没有被移除
            heatmapPersistence.setIsHeatmap(true)
            
          }else{ 
            updateHeatmapData(heatLayer, points, globalMax,globalMin);
          }
      }
    } finally {
      pending = false
    }
  }
  const clock = viewerRef.value.clock
  clock.onTick.addEventListener(listener)
  tickRemoved = () => clock.onTick.removeEventListener(listener)
}

onMounted(async () => {
  // 1. 判断本地是否存储数据 没有的话就存储 但是不会影响后面逻辑 因为并没有 await 等待
  const tester = new loadData();
  await tester.test(initRegions).catch((err) => console.error('dataTest 出错', err)); //用await等待indexedDB数据的检查和初始化会影响后面的热力图冷启动

  //照相机位置回显
  const heatmapVisited = heatmapPersistence.getIsHeatmap()
  if(heatmapVisited) { //刷新之后热力图是正在绘制状态 说明需要回显照相机，clock时间线缩放
    const { destination, orientation } = heatmapPersistence.getCameraBeforeReload()
    if (destination) setCameraPosition(viewerRef.value, destination, orientation)
  }
})
onUnmounted(() => {
  //移除事件监听 把卸载卸载挂载里面 handler也写在里面方便管理
  // clearInterval(timer)
  if(tickRemoved){
    tickRemoved();
    tickRemoved = null
  }
});

</script>

<style scoped lang="scss">
.toggle-btn{
  position: absolute;
  top: 9rem;
  left: 0;
  width: 2.5rem;
  height: 6rem;
  background-color: rgba(57, 147, 138, 0.75);
 
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  writing-mode: vertical-rl;
  border-radius: 0 .5rem .5rem 0;
  cursor: pointer;
  z-index: 1;
  transition: all 0.5s ease;
  &:hover{
    box-shadow: 
      0rem 0rem 1rem 0rem rgba(0,255,255,0.6),
      0 0 1.5rem rgba(0,255,255,0.4);
    transform: translateX(0.5rem) scale(1.1);
  }
  &.open{
    left: 29rem; /* 跟随侧边栏宽度 */
    width: 2rem;
    height: 5rem;
    font-size: 0.8rem;
    border-radius: 0 .5rem .5rem 0;
  }
}

</style>
