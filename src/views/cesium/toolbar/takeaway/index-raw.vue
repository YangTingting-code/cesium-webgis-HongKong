<template>
  <h1>外卖店</h1>
</template>

<script lang="ts" setup>
  import localForage from 'localforage';
  import type {NodePoint} from './interface-nouse'
  import { onMounted,inject,type Ref, watch } from 'vue';
  import {classifyDeliveryNodes} from "./utils/parseData"
  import {generateDeliveryOrders} from "./utils/generateOrders"
  import {OrderStore} from './db/OrderStore'
  import {driver,driverPosition,drawStartEnd,lnglat2Car3} from './drawPolyline/preparePathData-nouse'
  import {dynamicPolylineVolumeCustom,myMaterial_PV} from './drawPolyline/dynamicLine-nouse'
  import * as turf from '@turf/turf'

  import * as Cesium from 'cesium'
  const baiduAK = 'W9LoZ3gGO0lNAI33uUDics2Rar5NyJRw'
  interface CesiumInjection {
      viewerRef:Ref<Cesium.Viewer|undefined>,
      tilesetRef:Ref<Cesium.Cesium3DTileset|undefined>,
      isReady:Ref<boolean>
    }
  const {viewerRef,isReady} = inject<CesiumInjection>('cesium')!
  
  watch(
    [viewerRef,isReady],
    async ([vRef,ready])=>{
      if (ready && vRef) {
        drawPolylineVolume(vRef)
      }
    }
  )

  const order0StartIso = '2025-09-24T12:30:00+08:00'
  let riderEntity: Cesium.Entity | null = null
  
  onMounted(async ()=>{
    const orderStore = new OrderStore()
    const region = '九龙城区'
    const timeslot = 12
    const hasData = await orderStore.hasData()
    if(hasData === false) { 
      await prepareOrders(region,timeslot)
    }
  })

  async function drawPolylineVolume(vRef:Cesium.Viewer){
    const orderStore = new OrderStore()
    //骑手运动时间和时钟绑定
    const order0 = await orderStore.getOrderFirst()
    if(order0 && order0.duration) {
      initClock(vRef,order0?.duration) //初始化时钟
    }
    let lastTime:Cesium.JulianDate|null = null
    //监听clock 滴答变化 绘制骑手圆点
    const listener = async (c:Cesium.Clock)=>{
      if(c.shouldAnimate === false) return 
      if(lastTime && Cesium.JulianDate.equals(c.currentTime,lastTime)){
        return
      }
      lastTime = c.currentTime.clone()
      const elapsed = Cesium.JulianDate.secondsDifference(c.currentTime,c.startTime)
    
      const cumDriverDistance =  await driver(elapsed) // 更新 driverPosition
      myMaterial_PV.uniforms.totalDistance = order0?.distance
      myMaterial_PV.uniforms.currentDistance = cumDriverDistance
      if(cumDriverDistance && order0) {
        const progress = cumDriverDistance / order0.distance
        myMaterial_PV.uniforms.progress = progress
        if(progress >= 0.999){
          vRef.clock.shouldAnimate = false
        }
      }
      
      if(!riderEntity){
        riderEntity = new Cesium.Entity({
          id: 'rider',
          position: new Cesium.CallbackProperty(() => driverPosition, false) as Cesium.PositionProperty,
          point: { pixelSize: 20, color: Cesium.Color.ORANGE }
        })
        vRef.entities.add(riderEntity)
      }
    }
    vRef.clock.onTick.addEventListener(listener)
    //debug 绘制起点和终点  
    await drawStartEnd(vRef)
    // 使用方法
    const  densify = densifyPath(order0!.fullpath!, 5)
    const densifiedCar3 = await lnglat2Car3(densify)
    dynamicPolylineVolumeCustom(vRef, densifiedCar3) //等距离采样的效果好一些
  }
  /**
   * 等距离采样 方便控制绿色流动线的长度
   * @param path 需要绘制的路线的坐标
   * @param step 距离 单位米
   */
  function densifyPath(path: [number, number][], step = 5): [number,number][] {
    const line = turf.lineString(path)
    const length = turf.length(line, { units: 'meters' })

    const sampled: [number,number][] = []
    for (let i = 0; i <= length; i += step) {
      const pt = turf.along(line, i, { units: 'meters' })
      const [lng, lat] = pt.geometry.coordinates
      sampled.push([lng, lat])
    }
    return sampled
  }

  /**
   * 分区获取原始功能点
   * @param region 行政区的名字 string
   */
  async function getRawPointsByRegion(region:string){
    const nodeStore = localForage.createInstance({
      name:'osmNodePoint',
      storeName:'nodes'
    })
    const keys = await nodeStore.keys()
    const rawNodePoints:NodePoint[] = []
    for(let i = 0 ; i< keys.length ; i++){
      const tempPoint:NodePoint|null = await nodeStore.getItem(keys[i])
      if(tempPoint && region === tempPoint.region) {
        rawNodePoints.push(tempPoint)
      }
    }
    return rawNodePoints
  }
  async function getRawBuildingPolyByRegion(region:string){
    const buildingStore = localForage.createInstance({
      name: 'osmBuilding',
      storeName: 'buildings',
    })
    const keys = await buildingStore.keys()
    const rawBuildingPolys:any = []
    for(let i = 0 ; i< keys.length ; i++){
      const tempPoint:NodePoint|null = await buildingStore.getItem(keys[i])
      if(tempPoint && region === tempPoint.region) {
        rawBuildingPolys.push(tempPoint)
      }
    }
    return rawBuildingPolys
  }

  // 目前存储的是用九龙城区的取餐点和送货点 中午12点的数据 的数据生成的， 
  async function prepareOrders(region:string,timeslot:number){
    const rawNodePoints =  await getRawPointsByRegion(region)
    const rawBuildingPolys =  await getRawBuildingPolyByRegion(region)
    // const timeslot = 12
    const { pickupNodes, dropoffNodes } =  classifyDeliveryNodes(timeslot,rawNodePoints,rawBuildingPolys)
    // console.log(' pickupNodes, dropoffNodes ', pickupNodes, dropoffNodes )
    const testPickNodes = pickupNodes.slice(1,2) //获取1个取货点
    const orderStore = new OrderStore()
    //生成订单数据
    const orders = await generateDeliveryOrders(testPickNodes, dropoffNodes,baiduAK,{})
    console.log('testPickNodes',testPickNodes)
    console.log('orders',orders) //已获得 一条 用于测试的 
    // 结果存入本地
    await orderStore.saveOrders(orders)
  }

  // 时钟时间和骑手运动绑定 时间改变就调用driver更新骑手位置
  function initClock(viewer:Cesium.Viewer,duration:number){
    const clock = viewer.clock
    const startTime = Cesium.JulianDate.fromIso8601(order0StartIso)
    const stopTime = Cesium.JulianDate.addSeconds(startTime,duration,new Cesium.JulianDate())
    clock.startTime = startTime.clone()
    clock.currentTime = startTime.clone() 
    clock.clockRange = Cesium.ClockRange.CLAMPED //结束就停止了
    clock.multiplier = 10 //每次行进1s
    clock.shouldAnimate = true
    // 如何根据描述确定结束时间？
    viewer.timeline.zoomTo(startTime,stopTime)
  }


</script>

<style lang="scss" scoped>
h1{
  position: absolute;
}
</style>