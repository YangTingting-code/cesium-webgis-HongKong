<template>
  <div
    ref="chartRef"
    :style="{ width, height }"
  />
</template>

<script lang="ts" setup>
import * as echarts from 'echarts';
import { ref, onMounted, onUnmounted, watch, nextTick} from 'vue';
import throttle from 'lodash/throttle'
const chartRef = ref<HTMLDivElement>()

const props = withDefaults(defineProps<{width?:string,height?:string,options:echarts.EChartsOption}>(),{
  width:"220px",
  height:'200px'
})

let chart:echarts.ECharts

//echarts自适应容器变化
let ro :ResizeObserver
const resizeHandler  = throttle(()=>chart.resize(),200) //200ms节流

onMounted(()=>{
  nextTick(()=>{
    if(!chartRef.value) return
    chart = echarts.init(chartRef.value)
    //这里要绘制 数据固定死的就不会进入到watch
    chart.setOption(props.options)
    ro = new ResizeObserver(resizeHandler)
    ro.observe(chartRef.value) //监听容器本身
  })
})

//感知数据变化
watch(()=>props.options,(newValue)=>{
  chart.setOption(newValue)
})

onUnmounted(()=>{
  chart.dispose()
  ro.disconnect()
})
</script>