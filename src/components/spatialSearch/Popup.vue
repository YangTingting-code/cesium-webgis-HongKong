<!-- 控制弹窗的长相 -->
<template>
  <div
    v-if="showRef"
    :id="id"
    class="divlabel-container"
  >
    <div class="animate-maker-border">
      <div class="head">
        <span class="animate-marker__text">{{ title }}</span>
        <div
          class="close-btn"
          @click="closeClick"
        >
          X
        </div>
      </div>
      <div class="chart">
        <rose-chart :series-data="chartData" />
      </div>
      <div class="clear">
        <button @click="clearCircle">
          删除搜索圈
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, type Ref } from 'vue';
import roseChart from './RoseChart.vue';

interface Props {
  title?: string;
  id?: string;
  showRef: Ref<boolean>;
  chartData: { value: number; name: string }[];
  removeCircle: () => void;
}
// //默认宽高
const {
  showRef,
  title: propTitle,
  id: propId,
  chartData,
  removeCircle,
} = withDefaults(defineProps<Props>(),{
  title: '默认标题',
  id: 'default-id'
})

const showRefRef = showRef as Ref<boolean>; // 类型断言
const title = ref(propTitle);
const id = ref(propId || '001');

//会不会和之前在类里写好的toggle冲突？ 不会 因为都是用showRef控制
function closeClick() {
  //如果showRef.value是true 那就关闭
  showRefRef.value = false;
}
//清除这个搜索圈
function clearCircle() {
  removeCircle();
}
</script>

<style lang="scss" scoped>
// @import url('../assets/scss/popup.scss');
@import '@/assets/scss/popup.scss';
</style>
