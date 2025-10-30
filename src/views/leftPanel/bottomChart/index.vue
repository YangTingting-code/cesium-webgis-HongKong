<template>
  <div class="chart-wrapper">
    <LineAreaChart 
      v-if="series"
      :series-data="series" 
      :width="width"
      :height="height"
    />
  </div>
</template>

<script setup lang="ts">
import {ref} from 'vue'
import {convertToLineArea} from '@/utils/leftPanel/chartDataUtils'
import LineAreaChart from '@/components/takeaway/LineAreaChart.vue'
const series = ref(convertToLineArea() as any)
const width = '100%'
const height = '100%'

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