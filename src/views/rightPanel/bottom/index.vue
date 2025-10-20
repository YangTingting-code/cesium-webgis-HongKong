<template>
  <div class="map-wrapper">
    <div id="mapbox-container"></div>
  </div>
</template>

<script lang="ts" setup>
import mapboxgl from 'mapbox-gl'
import { onMounted, watch } from 'vue'
import {getCurrentCombinedLngLat,prepareLineSource,preparePointSource,setLineData,setPointsData,addDoublePath,addPointsToLayer} from '@/utils/rightPanel/pathData'
import * as turf from '@turf/turf'
import {useCombinedControlStore } from '@/store/takeaway/combinedControlStore'
import {useMapboxStyleStore } from '@/store/mapStyleStore'
import {getPathVisualScheme,getStyleUrlById} from '@/data/layersData'
import {mapPersistence} from '@/service/loaders/map-persistence'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN
const combinedControlStore = useCombinedControlStore()
const mapboxStyleStore = useMapboxStyleStore()

//注意要写在 onMounted 中, 不然容器还没有挂载
onMounted(async ()=>{
  const mapId = mapPersistence.getMapstyle()
  const keys = Object.keys(getStyleUrlById)
  let styleId 
  if(!keys.includes(mapId)){
    styleId = getStyleUrlById['mapbox_navigation_night']
  }else{
    styleId = getStyleUrlById[mapId]
  }
  const pathMapbox = new mapboxgl.Map({
    container:'mapbox-container',
    center:[113,22],
    zoom:9,
    style: styleId,
  })

//持久化问题：数据直接从本地拉取，刷新之后数据依旧回显，切换数据不会更新
//加载一条轨迹线
  let combinedorderData = JSON.parse(localStorage.getItem('combinedorderControl') || '{}')

  let lnglat2D = await getCurrentCombinedLngLat(combinedorderData) //[ [lng1,lat1], [lng2,lat2], ... ]
  const baseMapboxId = 'mapbox_navigation_night'
  let scheme = getPathVisualScheme(baseMapboxId)
 // 可选：监听加载完成事件
  pathMapbox.on('load', () => {
    console.log('Mapbox 初始化完成')
    //------轨迹线--------//
    const sourceId = 'pathData'
    //------起始点--------//
    const startEndSourceId = 'startEndData'
    const startEndLayerId = 'startEndLayer'

  //视野缩放至线 计算几何bbox
    if(!lnglat2D){
      console.log('没有获取到路径轨迹线')
      return
    }
    // 添加轨迹线数据源
    prepareLineSource({mapbox:pathMapbox,sourceId,coordinates:lnglat2D})
    //添加轨迹线图层 
    //两条轨迹叠加 做出发光效果 数据源要有, 叠加在底部的发光线 注意图层添加顺序
    //前一个是底线的layerId , 后一个是主线的layerId
    addDoublePath(pathMapbox,'path',sourceId,{width:10,colorGlow:scheme.glowColor,mainColorFrom:scheme.gradientFrom,mainColorTo:scheme.gradientTo})
    
    let bboxLine = turf.bbox(turf.lineString(lnglat2D)) as [number,number,number,number]//[西,南,东,北] 
    pathMapbox.fitBounds(bboxLine,{
        padding:10
      }  
    )
    
    // 起始点: 添加数据源
    preparePointSource({mapbox:pathMapbox,sourceId:startEndSourceId,coordinates:lnglat2D})
    //添加起点和终点
    addPointsToLayer(pathMapbox,startEndLayerId,startEndSourceId,scheme.startColor,scheme.endColor)

    // 监听组合订单数据切换
    watch(()=>combinedControlStore.getCurrentStatus(),async ()=>{
      combinedorderData = JSON.parse(localStorage.getItem('combinedorderControl')||'{}') 
      lnglat2D = await getCurrentCombinedLngLat(combinedorderData) //[ [lng1,lat1], [lng2,lat2], ... ]
      console.log('监听到订单数据变化并更新,更新数据源')
      if(!lnglat2D){
        console.log('没有接收到轨迹线数据,返回')
        return
      }
      //利用id获取数据源
      
      const lineSource = pathMapbox.getSource(sourceId) as mapboxgl.GeoJSONSource
      const pointsSource = pathMapbox.getSource(startEndSourceId) as mapboxgl.GeoJSONSource
      
      if(!lineSource || !pointsSource){
        console.log('轨迹线数据源或者起点终点数据源获取失败')
        return
      }
      //轨迹线数据更新
      setLineData(lineSource,lnglat2D)
      setPointsData(pointsSource,lnglat2D)
     
      //视野调整
      bboxLine = turf.bbox(turf.lineString(lnglat2D)) as [number,number,number,number]//[西,南,东,北] 
      pathMapbox.fitBounds(bboxLine,{
          padding:10
        }  
      )

    })

    //监听图层切换
    watch(()=>mapboxStyleStore.isUpdated,()=>{
      let style = mapboxStyleStore.getCurrentMapboxStyleId()

      if(!style){
        return 
      }
      pathMapbox.setStyle(style)
      
      //等待地图风格转变完之后再进行绘制
      pathMapbox.once('style.load',()=>{
        if(!lnglat2D){
          console.log('没有准备好轨迹点 无法重新绘制轨迹线')
          return
        }
        //准备新的主题配色
        const mapboxStyleId = mapboxStyleStore.getMapboxStyleId() 
        scheme = getPathVisualScheme(mapboxStyleId)
        // 添加轨迹线数据源
        console.log('scheme',scheme)
        prepareLineSource({mapbox:pathMapbox,sourceId,coordinates:lnglat2D})
        addDoublePath(pathMapbox,'path',sourceId,{width:10,colorGlow:scheme.glowColor,mainColorFrom:scheme.gradientFrom,mainColorTo:scheme.gradientTo})

        // 起始点: 添加数据源
        preparePointSource({mapbox:pathMapbox,sourceId:startEndSourceId,coordinates:lnglat2D})
        //添加起点和终点
        addPointsToLayer(pathMapbox,startEndLayerId,startEndSourceId,scheme.startColor,scheme.endColor)

      })
      

    })
  })
   
})

</script>

<style lang="scss" scoped>


.map-wrapper {
  display: flex;
  justify-content:center; /* 或 center / flex-start */
  align-items: center;
  height: 100%;
  width: 100%;
  border-radius: 10px;
  padding: 0.5rem;
}

#mapbox-container {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  overflow: hidden; //圆角 裁剪内部canvas到圆角边界
  border: 2px solid rgb(6, 224, 248); //地图容器描边
}
</style>