<template>
  <div
    ref="chartRef"
    :style="{ width, height }"
  />
</template>

<script lang="ts" setup>
import * as echarts from 'echarts';
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';

interface SeriesDataItem {
  value: number;
  name: string;
}

interface Props {
  width?: string;
  height?: string;
  seriesData: SeriesDataItem[];
  // title?: string
}

const props = withDefaults(defineProps<Props>(), {
  width: '260px',
  height: '220px',
  // title: '区域功能结构图'
});

const chartRef = ref<HTMLDivElement>();
let chartInstance: echarts.ECharts | null = null;

function initChart() {
  if (!props.seriesData || props.seriesData.length === 0) {
    return; // 等待数据
  }
  if (!chartRef.value) return;
  chartInstance = echarts.init(chartRef.value);
  const option = {
    /* title: {
      text: props.title,
      left: 'center',
      textStyle: { 
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
        textShadowColor: '#38e1ff',
        textShadowBlur: 20,
        textShadowOffsetX: 0,
        textShadowOffsetY: 0,
      }
    }, */

    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
    },
    legend: {
      // orient: 'vertical',//垂直排列
      orient: 'horizontal', //水平排列
      icon: 'circle',
      x: 'center',
      bottom: 0,
      textStyle: { color: '#fff' },
      data: props.seriesData.map((item) => item.name),
    },
    series: [
      {
        name: '统计',
        type: 'pie',
        radius: [30, 60], //半径改小一点
        center: ['50%', '40%'], //垂直位置往上提
        roseType: 'area',
        data: props.seriesData.map((item) => {
          if (item.name === '公共设施') {
            return {
              ...item,
              itemStyle: { color: '#ea7ccc' },
            };
          } else if (item.name === '交通类') {
            return {
              ...item,
              itemStyle: { color: '#fc8452' },
            };
          } else if (item.name === '未知') {
            return {
              ...item,
              itemStyle: { color: '#73c0de' },
            };
          }
          return item;
        }),
        label: { color: '#fff' },

        labelLine: {
          smooth: 0.2,
          length: 2,
          length2: 2,
          lineStyle: {
            width: 2,
            // color:'#fff'
          },
        },
        itemStyle: {
          borderRadius: 8, //设置圆角
        },
      },
    ],
  };
  chartInstance.setOption(option);
}

// 监听数据变化
watch(
  () => props.seriesData,
  () => {
    chartInstance?.setOption({
      series: [
        {
          data: props.seriesData.map((item) => {
            if (item.name === '公共设施') {
              return {
                ...item,
                itemStyle: { color: '#ea7ccc' },
              };
            } else if (item.name === '交通类') {
              return {
                ...item,
                itemStyle: { color: '#fc8452' },
              };
            } else if (item.name === '未知') {
              return {
                ...item,
                itemStyle: { color: '#73c0de' },
              };
            }
            return item;
          }),
        },
      ],
      legend: { data: props.seriesData.map((item) => item.name) },
    });
  },
  { deep: true }
);

onMounted(() => {
  // 等到 DOM 更新完毕后再执行回调函数
  nextTick(() => {
    initChart();
  });
});
onUnmounted(() => chartInstance?.dispose());
</script>

