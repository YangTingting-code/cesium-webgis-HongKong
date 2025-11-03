<!-- src/components/spatialSearch/ChartPopup.vue -->
<template>
  <BasePopup
    :popup-id="id"
    :title="title"
    :show-ref="showRefRef"
  >
    <div class="chart">
      <rose-chart :series-data="chartData" />
    </div>
    <div class="clear">
      <button @click="removeCircle">
        删除搜索圈
      </button>
    </div>
  </BasePopup>
</template>

<script setup lang="ts">
import { type Ref } from 'vue';
import BasePopup from '@/components/common/BasePopup.vue';
import roseChart from '../spatialSearch/RoseChart.vue'

interface Props {
  id: string;
  title: string;
  showRef: Ref<boolean>;
  chartData: { value: number; name: string }[];
  removeCircle: () => void;
}

const { id, title, showRef, chartData, removeCircle } = defineProps<Props>();
const showRefRef = showRef as Ref<boolean> // 类型断言 为什么这样之后就可以修改类传过来的showref?

</script>

<style lang="scss" scoped>
@import '@/assets/scss/popup.scss';
</style>
