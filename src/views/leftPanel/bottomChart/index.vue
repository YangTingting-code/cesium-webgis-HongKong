<template>
  <div class="chart-wrapper">
    <div class="orders-chart"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import {convertToHeatmapData,convertToLineArea,renderLineArea} from '@/utils/leftPanel/chartDataUtils'

onMounted(async ()=>{
  const heatmapData = await convertToHeatmapData()
  const chartDom = document.querySelector('.orders-chart') as HTMLElement

  const series = convertToLineArea()

  if(chartDom)
renderLineArea(chartDom,series)
})

</script>

<style lang="scss" scoped>
.chart-wrapper{
  height: 100%;
  border-radius: 0.6rem;
  padding: 0.5rem;
  background-color: rgba(0, 194, 255, 0.2);
}
.orders-chart{
  position: relative;
  height: 100%;
  width: 100%;
  z-index: 1;
  border-radius:0.4rem ;
  box-shadow: inset 0 0 10px rgba(0, 194, 255, 0.2);
}
</style>