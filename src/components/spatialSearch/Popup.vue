<!-- 控制弹窗的长相 -->
<template>
  <basePopup
    v-model:show-ref="showRefRef"
    :info="info"
  >
    <template #body>
      <rose-chart :series-data="chartData" />
    </template>
    <template #foot>
      <button @click="clearCircle">
        删除搜索圈
      </button>
    </template>
  </basePopup>
</template>

<script lang="ts" setup>
import { ref, type Ref } from 'vue';
import roseChart from './RoseChart.vue';
import basePopup from '../common/BasePopup.vue'

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

const showRefRef = showRef as Ref<boolean> // 类型断言 为什么这样之后就可以修改类传过来的showref?
const title = ref(propTitle)
const info = {title:title.value}

//清除这个搜索圈
function clearCircle() {
  removeCircle();
}
</script>

<style lang="scss" scoped>
button {
  display: inline-block;
  padding: 6px 16px;
  border: 1px solid #38e1ff;
  border-radius: 6px;
  background: rgba(0, 50, 80, 0.45);
  color: #38e1ff;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: .5008px;
  transition: all 0.25s ease;
  text-shadow: 0 0 6px #38e1ff;
  box-shadow:
    inset 0 0 6px rgba(56, 225, 255, 0.5),
    0 0 8px rgba(56, 225, 255, 0.4);
  backdrop-filter: blur(2px);
}

button:hover {
  background: rgba(56, 225, 255, 0.2);
  color: #fff;
  border-color: #5ef9ff;
  box-shadow: 0 0 12px rgba(56, 225, 255, 0.8);
  transform: translateY(-1px);
  cursor: pointer;
}

button:active {
  transform: translateY(0);
  box-shadow: 0 0 6px rgba(56, 225, 255, 0.5);
}
</style>
